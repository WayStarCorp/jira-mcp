import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

describe("smoke-attachments script", () => {
  it("does not hardcode a machine-specific workspace path", async () => {
    const scriptPath = join(
      import.meta.dir,
      "../../../../scripts/smoke-attachments.mjs",
    );
    const script = await readFile(scriptPath, "utf8");

    expect(script).not.toContain("c:/sites/jira-mcp");
    expect(script).not.toContain("C:/sites/jira-mcp");
  });

  it("uses MCP stdio client via shared mcp-client helper", async () => {
    const scriptPath = join(
      import.meta.dir,
      "../../../../scripts/smoke-attachments.mjs",
    );
    const script = await readFile(scriptPath, "utf8");

    expect(script).toContain("./smoke/mcp-client.mjs");
    expect(script).toContain("jira_get_issue_attachments");
    expect(script).toContain("jira_download_attachment");
    expect(script).not.toContain("createJiraToolsWithDI");
  });
});
