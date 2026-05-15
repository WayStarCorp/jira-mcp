/**
 * Issue Header Formatter
 *
 * Handles formatting of issue headers and basic information
 * Extracted from IssueFormatter to reduce complexity
 */
import type { Issue, IssueLinkItem } from "../models/issue.models";

/**
 * Formats issue headers and basic information sections
 */
export class IssueHeaderFormatter {
  /**
   * Format the main issue header with key and summary
   */
  formatTitle(key: string, summary: string): string {
    return `# ${key}: ${summary}\n\n`;
  }

  /**
   * Format the basic issue information section
   * @param extras.issueType Always shown when provided; omit unknown if you pass undefined for issueType line only via caller
   */
  formatBasicInfo(
    status: string,
    priority: string,
    assignee: string,
    extras?: { issueType?: string; parentKey?: string },
  ): string {
    const lines: string[] = [];

    if (extras?.issueType !== undefined && extras.issueType !== "") {
      lines.push(`**Type:** ${extras.issueType}`);
    }

    lines.push(
      `**Status:** ${status}`,
      `**Priority:** ${priority}`,
      `**Assignee:** ${assignee}`,
    );

    if (extras?.parentKey) {
      lines.push(`**Parent:** ${extras.parentKey}`);
    }

    return `${lines.join("\n")}\n\n`;
  }

  /**
   * Short markdown list of generic issue links (not Epic Link / parent).
   */
  formatIssueLinksSnippet(links: IssueLinkItem[] | null | undefined): string {
    if (!links || links.length === 0) {
      return "";
    }

    const max = 10;
    const rows = links.slice(0, max).map((link) => {
      const typeName = link.type?.name ?? "Link";
      const inwardKey = link.inwardIssue?.key ?? "";
      const outwardKey = link.outwardIssue?.key ?? "";
      return `- **${typeName}** (id \`${link.id}\`): \`${outwardKey || "?"}\` ↔ \`${inwardKey || "?"}\``;
    });

    let out = `## Issue links\n${rows.join("\n")}\n\n`;

    if (links.length > max) {
      out += `*Showing first ${max} of ${links.length} links.*\n\n`;
    }

    return out;
  }

  /**
   * Format the labels section
   */
  formatLabels(labels: string[]): string {
    if (!labels || labels.length === 0) {
      return "";
    }

    return `## Labels\n${labels.join(", ")}\n\n`;
  }

  /**
   * Format the JIRA link section
   */
  formatJiraLink(issue: Issue): string {
    if (!issue?.self || !issue?.key) {
      return "";
    }

    const baseUrl = issue.self.split("/rest/")[0];
    return `[View in JIRA](${baseUrl}/browse/${issue.key})\n`;
  }

  /**
   * Format a fallback header for issues with missing fields
   */
  formatFallbackHeader(key: string): string {
    const lines = [
      key ? `# ${key}: No Summary\n\n` : "",
      "**Status:** Unknown",
      "**Priority:** None",
      "**Assignee:** Unassigned\n\n",
    ];

    return lines.filter(Boolean).join("\n");
  }
}
