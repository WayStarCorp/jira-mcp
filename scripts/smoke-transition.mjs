// Generic smoke test for transition and assignment flows (MCP stdio + dist/index.js).
// Configure JIRA_HOST/JIRA_USERNAME/JIRA_API_TOKEN and optionally test-specific env vars.
import { config as loadDotenv } from "dotenv";
import { callTool, connectLocalMcp } from "./smoke/mcp-client.mjs";

loadDotenv();

const issueKey = process.env.JIRA_TEST_ISSUE_KEY ?? "PROJ-1";
const statusName = process.env.JIRA_TEST_STATUS_NAME ?? "In Progress";
const userQuery = process.env.JIRA_TEST_USER_QUERY ?? "alice";
const comment =
  process.env.JIRA_TEST_COMMENT ?? "Smoke test comment from jira-mcp";
const accountId = process.env.JIRA_TEST_ACCOUNT_ID;

const { client, close } = await connectLocalMcp({ name: "transition-smoke" });

try {
  console.log(
    (
      await callTool(client, "jira_get_issue_transitions", {
        issueKey,
      })
    ).text,
  );

  await callTool(client, "jira_transition_issue", {
    issueKey,
    statusName,
  });

  console.log(
    (
      await callTool(client, "jira_search_users", {
        query: userQuery,
      })
    ).text,
  );

  console.log(
    (
      await callTool(client, "jira_get_assignable_users", {
        issueKey,
        query: userQuery,
      })
    ).text,
  );

  if (accountId) {
    await callTool(client, "jira_assign_issue", {
      issueKey,
      accountId,
    });
  }

  await callTool(client, "jira_add_issue_comment", {
    issueKey,
    comment,
  });

  console.log(`Smoke test completed for ${issueKey}`);
} finally {
  await close();
}
