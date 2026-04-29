import { config as loadDotenv } from "dotenv";

loadDotenv();

const host = process.env.JIRA_HOST?.replace(/\/$/, "");
const username = process.env.JIRA_USERNAME;
const apiToken = process.env.JIRA_API_TOKEN;
const issueKey = process.env.JIRA_TEST_ISSUE_KEY ?? "PROJ-1";
const accountId = process.env.JIRA_TEST_ACCOUNT_ID;

if (!host || !username || !apiToken || !accountId) {
  console.error(
    "Missing env: JIRA_HOST, JIRA_USERNAME, JIRA_API_TOKEN, JIRA_TEST_ACCOUNT_ID",
  );
  process.exit(1);
}

const auth = Buffer.from(`${username}:${apiToken}`).toString("base64");
const headers = {
  Authorization: `Basic ${auth}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

async function tryBody(label, body) {
  const res = await fetch(`${host}/rest/api/3/issue/${issueKey}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(label, res.status, text.slice(0, 400));
}

await tryBody("A: { fields: { assignee: { accountId } } }", {
  fields: { assignee: { accountId } },
});

await tryBody("B: { fields: { assignee: { accountId } }, notifyUsers: false }", {
  fields: { assignee: { accountId } },
  notifyUsers: false,
});

await tryBody("C: assignee endpoint via PUT /issue/{key}/assignee", {
  accountId,
});
