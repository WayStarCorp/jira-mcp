import type { Issue } from "@features/jira/issues/models/issue.models";
/**
 * Formatter for lists of JIRA issues to markdown
 */
import type { Formatter } from "@features/jira/shared";
/**
 * Formats a list of JIRA issues into markdown
 * Implements the Formatter interface for arrays of Issue objects
 */
export class IssueListFormatter implements Formatter<Issue[], string> {
  /**
   * Format a list of issues to markdown
   * Note: This function assumes the issues array is not empty.
   * Empty arrays should be handled before calling this function.
   */
  format(issues: Issue[]): string {
    // Note: The caller should check for empty arrays before calling this function
    let markdown = "# Your Assigned Issues\n\n";

    // Use proper singular/plural form based on count
    const issueCount = issues.length;
    const issueText = issueCount === 1 ? "issue" : "issues";
    markdown += `${issueCount} ${issueText} assigned to you\n\n`;

    // Create a table
    markdown += "| Key | Type | Summary | Status | Priority | Updated |\n";
    markdown += "| --- | ---- | ------- | ------ | -------- | ------- |\n";

    for (const { key, fields: issueFields } of issues) {
      const { summary, status, priority, updated, issuetype } =
        issueFields ?? {};
      const summaryText = summary || "No Summary";
      const typeName = issuetype?.name || "—";
      const statusName = status?.name || "Unknown";
      const priorityName = priority?.name || "None";
      const updatedDisplay = updated ? this.formatDate(updated) : "N/A";

      markdown += `| ${key} | ${typeName} | ${summaryText} | ${statusName} | ${priorityName} | ${updatedDisplay} |\n`;
    }

    return markdown;
  }

  /**
   * Format a date string in a deterministic locale
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }
}
