/**
 * Issue Dates Formatter
 *
 * Handles formatting of issue date information
 * Extracted from IssueFormatter to reduce complexity
 */
import type { Issue } from "../models/issue.models";

/**
 * Formats issue date information (created, updated)
 */
export class IssueDatesFormatter {
  /**
   * Format the dates section if at least one date exists
   */
  formatDates(issue: Issue): string {
    if (!this.hasDates(issue)) {
      return "";
    }

    const dateLines: string[] = [];

    if (issue.fields?.created) {
      dateLines.push(
        `**Created**: ${this.formatDateTime(issue.fields.created)}`,
      );
    }

    if (issue.fields?.updated) {
      dateLines.push(
        `**Updated**: ${this.formatDateTime(issue.fields.updated)}`,
      );
    }

    if (dateLines.length === 0) {
      return "";
    }

    return `## Dates\n${dateLines.join("\n")}\n\n`;
  }

  /**
   * Check if issue has any date information
   */
  private hasDates(issue: Issue): boolean {
    return !!(issue?.fields?.created || issue?.fields?.updated);
  }

  /**
   * Format date-time strings in a deterministic locale
   */
  private formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });
  }
}
