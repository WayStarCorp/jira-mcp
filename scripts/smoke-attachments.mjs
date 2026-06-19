/**
 * Live MCP smoke for attachment tools (stdio + dist/index.js).
 * Requires .env with real JIRA_* and `bun run build`.
 *
 *   bun run smoke:attachments
 *   JIRA_TEST_ISSUE_KEY=SUPP-139 bun run smoke:attachments
 */
import { config as loadDotenv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { callTool, connectLocalMcp } from "./smoke/mcp-client.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadDotenv({ path: resolve(ROOT, ".env") });

const issueKey = process.env.JIRA_TEST_ISSUE_KEY?.trim() || "SUPP-79";

function assertCredentials() {
  const host = process.env.JIRA_HOST?.trim();
  const user = process.env.JIRA_USERNAME?.trim();
  const token = process.env.JIRA_API_TOKEN?.trim();
  if (!host || !user || !token) {
    console.error("SKIP: set JIRA_HOST, JIRA_USERNAME, JIRA_API_TOKEN in .env");
    process.exit(2);
  }
  if (
    host === "https://example.atlassian.net" ||
    user === "test@example.com" ||
    token === "test-token"
  ) {
    console.error("SKIP: JIRA_* still example placeholders");
    process.exit(2);
  }
}

function pickAttachmentId(listText) {
  const fromEnv = process.env.JIRA_TEST_ATTACHMENT_ID?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const idMatch =
    listText.match(/\bid:\s*(\d+)/i) ||
    listText.match(/attachmentId[=:"'\s]+(\d+)/i);
  return idMatch?.[1] ?? null;
}

assertCredentials();

const { client, close } = await connectLocalMcp({
  cwd: ROOT,
  name: "attachments-smoke",
});

try {
  console.log("Smoke attachments (MCP stdio → dist/index.js)");
  console.log("Issue:", issueKey);

  const list = await callTool(client, "jira_get_issue_attachments", {
    issueKey,
  });
  console.log("\n--- jira_get_issue_attachments ---");
  console.log(list.text.slice(0, 2500));

  const attachmentId = pickAttachmentId(list.text);
  if (!attachmentId) {
    throw new Error(
      "No attachment id in list (set JIRA_TEST_ATTACHMENT_ID or use an issue with attachments)",
    );
  }
  console.log("\nUsing attachmentId:", attachmentId);

  const download = await callTool(client, "jira_download_attachment", {
    attachmentId,
  });
  console.log("\n--- jira_download_attachment ---");
  if (download.images.length > 0) {
    for (const image of download.images) {
      console.log(
        `ImageContent: ${image.mimeType}, base64 length ${image.dataLength}`,
      );
    }
    if (download.images[0].dataLength === 0) {
      throw new Error("ImageContent data is empty");
    }
  } else if (download.text) {
    console.log(download.text.slice(0, 1500));
  } else {
    throw new Error("Download returned no text or image content");
  }

  const issue = await callTool(client, "jira_get_issue", { issueKey });
  const hasAttachments =
    issue.text.includes("Attachments") || issue.text.includes("attachment");
  console.log("\n--- jira_get_issue (attachments) ---");
  console.log("Has attachments/media block:", hasAttachments);
  if (!hasAttachments && list.text.includes("Attachments for")) {
    throw new Error(
      "Issue has attachments in list tool but jira_get_issue lacks Attachments section",
    );
  }
  if (hasAttachments) {
    const idx = issue.text.indexOf("Attachment");
    console.log(issue.text.slice(Math.max(0, idx - 20), idx + 800));
  }

  console.log("\nSmoke OK");
} finally {
  await close();
}
