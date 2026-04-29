// Generic smoke test for transition and assignment flows.
// Configure JIRA_HOST/JIRA_USERNAME/JIRA_API_TOKEN and optionally test-specific env vars.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { config as loadDotenv } from "dotenv";

loadDotenv();

const issueKey = process.env.JIRA_TEST_ISSUE_KEY ?? "PROJ-1";
const statusName = process.env.JIRA_TEST_STATUS_NAME ?? "In Progress";
const userQuery = process.env.JIRA_TEST_USER_QUERY ?? "alice";
const comment =
  process.env.JIRA_TEST_COMMENT ?? "Smoke test comment from jira-mcp";
const accountId = process.env.JIRA_TEST_ACCOUNT_ID;

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  cwd: "c:/sites/jira-mcp",
  env: { ...process.env },
});

const client = new Client({ name: "transition-smoke", version: "1.0.0" });
await client.connect(transport);

async function call(toolName, args) {
  const response = await client.callTool({ name: toolName, arguments: args });
  if (response.isError) {
    const text = response.content
      ?.map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("\n");
    throw new Error(text || `Tool ${toolName} returned an error response`);
  }

  return response.content
    ?.map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("\n")
    .trim();
}

try {
  console.log(
    await call("jira_get_issue_transitions", {
      issueKey,
    }),
  );

  await call("jira_transition_issue", {
    issueKey,
    statusName,
  });

  console.log(
    await call("jira_search_users", {
      query: userQuery,
    }),
  );

  console.log(
    await call("jira_get_assignable_users", {
      issueKey,
      query: userQuery,
    }),
  );

  if (accountId) {
    await call("jira_assign_issue", {
      issueKey,
      accountId,
    });
  }

  await call("jira_add_issue_comment", {
    issueKey,
    comment,
  });

  console.log(`Smoke test completed for ${issueKey}`);
} finally {
  await client.close();
}
