/**
 * Shared settings for live Jira integration tests (no secrets).
 */

/** Project key for permission/create integration tests (env override). */
export function getJiraTestProjectKey(): string {
  const explicit = process.env.JIRA_TEST_PROJECT_KEY?.trim();
  if (explicit) {
    return explicit;
  }

  const issueKey = process.env.JIRA_TEST_ISSUE_KEY?.trim();
  if (issueKey) {
    const dash = issueKey.lastIndexOf("-");
    if (dash > 0) {
      return issueKey.slice(0, dash);
    }
  }

  return "SUPP";
}
