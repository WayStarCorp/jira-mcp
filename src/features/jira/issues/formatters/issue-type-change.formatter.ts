import type { ChangeIssueTypeResult } from "../use-cases/change-issue-type.use-case";
import { IssueUpdateFormatter } from "./issue-update.formatter";

/**
 * Output for jira_change_issue_type (validate vs updated issue).
 */
export class IssueTypeChangeFormatter {
  private readonly updateFormatter = new IssueUpdateFormatter();

  format(result: ChangeIssueTypeResult): string {
    switch (result.kind) {
      case "validated":
        return [
          "# Issue type — validate only",
          "",
          `**Issue**: ${result.issueKey}`,
          `**issuetype field editable**: ${result.issuetypeEditable ? "yes" : "no"}`,
          `**Operations**: ${result.operations.length ? result.operations.join(", ") : "—"}`,
          "",
          "If issuetype is not editable here, Jira may require a **Move** or workflow action in the UI.",
          "",
        ].join("\n");
      case "updated":
        return [
          "# Issue type updated",
          "",
          this.updateFormatter.format(result.issue),
        ].join("\n");
      default: {
        const _exhaustive: never = result;
        throw new Error(`Unhandled change issue type result: ${_exhaustive}`);
      }
    }
  }
}
