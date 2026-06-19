/**
 * Pre-release gate for Superpowers plan docs/superpowers/plans/2026-05-25-attachments.md
 *
 * Static phase (no API key): file map + typecheck + attachment-related unit tests.
 * Agent phase (--agent): local Cursor SDK agent compares plan checkboxes to the repo.
 *
 *   node scripts/sdk/verify-attachments-plan.mjs
 *   CURSOR_API_KEY=cursor_... node scripts/sdk/verify-attachments-plan.mjs --agent
 *
 * Windows: if --agent fails with sqlite3 "Could not locate the bindings file", run:
 *   npm rebuild sqlite3
 *
 * Optional live MCP smoke (needs dist + JIRA_HOST/JIRA_USERNAME/JIRA_API_TOKEN):
 *   bun run build
 *   JIRA_TEST_ISSUE_KEY=SUPP-79 node scripts/sdk/verify-attachments-plan.mjs --agent
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { config as loadDotenv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const PLAN_REL = "docs/superpowers/plans/2026-05-25-attachments.md";
const PLAN_PATH = resolve(ROOT, PLAN_REL);

loadDotenv({ path: resolve(ROOT, ".env") });

const useAgent = process.argv.includes("--agent");

/** Paths from the plan file map + critical task deliverables */
const REQUIRED_PATHS = [
  PLAN_REL,
  "docs/superpowers/specs/2026-05-25-attachments-design.md",
  "docs/superpowers/spikes/2026-05-25-attachments-spike.md",
  "src/core/errors/attachment-too-large.error.ts",
  "src/core/responses/mcp-response.types.ts",
  "src/features/jira/client/http/jira.http-client.impl.ts",
  "src/features/jira/shared/parsers/adf.parser.ts",
  "src/features/jira/attachments/repositories/attachment.repository.ts",
  "src/features/jira/attachments/handlers/get-issue-attachments.handler.ts",
  "src/features/jira/attachments/handlers/download-attachment.handler.ts",
  "src/features/jira/attachments/formatters/inline-media.formatter.ts",
  "src/features/jira/tools/configs/attachment-tools.config.ts",
  "src/test/unit/features/jira/attachments/handlers/download-attachment.handler.test.ts",
  "src/test/unit/features/jira/client/http/jira.http-client.download-binary.test.ts",
];

function runStaticGate() {
  console.log("=== Attachments plan — static gate ===\n");

  const missing = REQUIRED_PATHS.filter(
    (rel) => !existsSync(resolve(ROOT, rel)),
  );
  if (missing.length) {
    console.error("Missing expected files:");
    for (const p of missing) console.error(`  - ${p}`);
    process.exitCode = 1;
  } else {
    console.log(`File map: ${REQUIRED_PATHS.length}/${REQUIRED_PATHS.length} paths present`);
  }

  const plan = readFileSync(PLAN_PATH, "utf8");
  const done = (plan.match(/- \[x\]/gi) ?? []).length;
  const open = (plan.match(/- \[ \]/g) ?? []).length;
  console.log(`Plan checkboxes: ${done} done, ${open} open`);

  const typecheck = spawnSync("bun", ["run", "typecheck"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });
  if (typecheck.status !== 0) process.exitCode = 1;

  const tests = spawnSync(
    "bun",
    [
      "test",
      "src/test/unit/features/jira/attachments",
      "src/test/unit/features/jira/client/http/jira.http-client.download-binary.test.ts",
      "src/test/unit/core/errors/attachment-too-large.error.test.ts",
      "src/test/unit/core/responses/mcp-adapter.util.test.ts",
    ],
    { cwd: ROOT, stdio: "inherit", shell: true },
  );
  if (tests.status !== 0) process.exitCode = 1;

  if (open > 0 && missing.length === 0) {
    console.log(
      "\nNote: code paths exist but plan still has open checkboxes — run with --agent for a gap report.",
    );
  }

  return { done, open, missing };
}

async function runAgentGapReport() {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "CURSOR_API_KEY is not set. Create one at https://cursor.com/dashboard/cloud-agents",
    );
    process.exit(1);
  }

  let Agent;
  let CursorAgentError;
  try {
    ({ Agent, CursorAgentError } = await import("@cursor/sdk"));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("bindings file") || message.includes("sqlite3")) {
      console.error(
        "Cursor SDK (--agent) needs sqlite3 native bindings.\n" +
          "  npm rebuild sqlite3\n" +
          "Then rerun: bun run verify-attachments-plan:agent",
      );
      process.exit(1);
    }
    throw err;
  }

  const distEntry = resolve(ROOT, "dist/index.js");
  const jiraConfigured =
    process.env.JIRA_HOST &&
    process.env.JIRA_USERNAME &&
    process.env.JIRA_API_TOKEN;
  const mcpServers =
    jiraConfigured && existsSync(distEntry)
      ? {
          "jira-mcp": {
            type: "stdio",
            command: "node",
            args: ["dist/index.js"],
            cwd: ROOT,
            env: {
              JIRA_HOST: process.env.JIRA_HOST,
              JIRA_USERNAME: process.env.JIRA_USERNAME,
              JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
            },
          },
        }
      : undefined;

  const prompt = `You are auditing the jira-mcp repo at the workspace root.

Read ${PLAN_REL} and docs/superpowers/specs/2026-05-25-attachments-design.md.

Tasks:
1. For Tasks 0–13 in the plan, classify each as done | partial | missing based on actual files and tests under src/, not only unchecked boxes.
2. List plan checkboxes that look stale (implementation exists but box is still "- [ ]").
3. List any spec requirements with no code evidence.
4. If jira-mcp MCP tools are available and JIRA_TEST_ISSUE_KEY is set, call jira_get_issue_attachments once and note success/failure in one line (no secrets in output).

Output concise Markdown in Russian: table Task | Status | Evidence (file paths). Max 40 lines. Do not edit any files.`;

  let envNote = "MCP: skipped (JIRA_* env not set)";
  if (jiraConfigured) {
    envNote = existsSync(distEntry)
      ? "MCP: local jira-mcp stdio enabled"
      : "MCP: skipped (run bun run build for dist/)";
  }

  console.log(`\n=== Attachments plan — Cursor SDK agent ===\n${envNote}\n`);

  try {
    const result = await Agent.prompt(prompt, {
      apiKey,
      model: { id: "composer-2" },
      local: { cwd: ROOT, settingSources: [] },
      mcpServers,
    });

    if (result.status === "error") {
      console.error(`Agent run failed (run finished with error status)`);
      process.exit(2);
    }

    console.log("\n--- Agent report ---\n");
    console.log(result.result ?? "(empty result)");
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error(`SDK startup failed: ${err.message}`);
      process.exit(err.isRetryable ? 75 : 1);
    }
    throw err;
  }
}

const staticResult = runStaticGate();

if (useAgent) {
  await runAgentGapReport();
} else if (staticResult.open > 0 && process.exitCode !== 1) {
  console.log("\nTip: node scripts/sdk/verify-attachments-plan.mjs --agent");
}

process.exit(process.exitCode ?? 0);
