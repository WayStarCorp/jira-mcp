import type { IssueLinkItem } from "../models/issue.models";
import type { EpicInfoResult } from "../use-cases/get-epic-info.use-case";

/** Markdown table cell: escape `|` as `\|` for correct pipe parsing. */
const MARKDOWN_ESCAPED_PIPE = String.raw`\|`;

/**
 * Markdown report for epic / hierarchy context of an issue.
 */
export class EpicInfoFormatter {
  format(result: EpicInfoResult): string {
    const lines: string[] = [
      "# Epic / hierarchy info",
      "",
      ...this.buildIssueOverviewLines(result),
      ...this.buildResolvedRelationLines(result.resolvedRelation),
      ...this.buildResolveErrorLines(result.resolveError),
      ...this.buildEpicLinkValueLines(result.epicLinkValue),
      ...this.buildGenericIssueLinkLines(result.issue.fields?.issuelinks),
      ...this.buildChildrenLines(
        result.children,
        result.childrenNote,
        result.childrenListedFromParentOnly,
      ),
      "",
      "Use `jira_set_issue_epic` / `jira_remove_issue_epic` to change Epic Link or parent-based epic association.",
    ];

    return `${lines.join("\n")}\n`;
  }

  private buildIssueOverviewLines(result: EpicInfoResult): string[] {
    const f = result.issue.fields;
    const typeName = f?.issuetype?.name ?? "Unknown";

    return [
      `**Issue**: ${result.issue.key}`,
      `**Summary**: ${f?.summary ?? "—"}`,
      `**Type**: ${typeName}`,
      `**Implied Epic (issuetype matches \`${result.epicIssuetypeNameCompared}\`)**: ${result.treatsAsEpic ? "yes" : "no"}`,
      `**Status**: ${f?.status?.name ?? "—"}`,
      `**Parent (REST)**: ${f?.parent?.key ?? "—"}`,
    ];
  }

  private buildResolvedRelationLines(
    resolvedRelation: EpicInfoResult["resolvedRelation"],
  ): string[] {
    if (!resolvedRelation) {
      return [];
    }

    const lines = [
      `**Editmeta-preferred mode**: ${resolvedRelation.mode} — ${resolvedRelation.reason}`,
    ];
    if (resolvedRelation.epicLinkFieldId) {
      lines.push(
        `**Epic Link field id**: \`${resolvedRelation.epicLinkFieldId}\``,
      );
    }
    return lines;
  }

  private buildResolveErrorLines(resolveError: string | null): string[] {
    if (!resolveError) {
      return [];
    }

    return [
      "",
      "## Editmeta auto-detect",
      `Could not resolve an editmeta-preferred mode: ${resolveError}`,
      "With **includeChildren**, the child list is built from the current issue state plus the chosen relation mode. The editmeta result above only explains how the server would prefer to update the issue if it needs to write back.",
    ];
  }

  private buildEpicLinkValueLines(epicLinkValue: string | null): string[] {
    if (epicLinkValue === null) {
      return [];
    }

    return [`**Epic Link value on issue**: ${epicLinkValue ?? "—"}`];
  }

  private buildGenericIssueLinkLines(
    links: IssueLinkItem[] | null | undefined,
  ): string[] {
    if (!links?.length) {
      return [];
    }

    const lines = ["", "## Generic issue links"];
    for (const link of links.slice(0, 15)) {
      const t = link.type?.name ?? "Link";
      const inward = link.inwardIssue?.key ?? "?";
      const outward = link.outwardIssue?.key ?? "?";
      lines.push(
        `- **${t}** (id \`${link.id}\`): \`${outward}\` ↔ \`${inward}\``,
      );
    }
    if (links.length > 15) {
      lines.push(`*…and ${links.length - 15} more*`);
    }
    return lines;
  }

  private buildChildrenLines(
    children: EpicInfoResult["children"],
    childrenNote: string | null,
    listedFromParentOnly: boolean,
  ): string[] {
    if (children.length > 0) {
      const lines = [
        "",
        `## Child issues (${children.length})`,
        ...(listedFromParentOnly
          ? [
              "*Child issues: listed from **parent hierarchy** only (`parent = epic`); Classic Epic Link JQL was not merged.*",
            ]
          : []),
        ...(childrenNote ? ["", childrenNote] : []),
        "| Key | Type | Summary | Status | Updated |",
        "| --- | ---- | ------- | ------ | ------- |",
      ];
      for (const ch of children) {
        const cf = ch.fields;
        const updatedCell = cf?.updated ? this.formatDate(cf.updated) : "—";
        lines.push(
          `| ${ch.key} | ${cf?.issuetype?.name ?? "—"} | ${(cf?.summary ?? "—").replace(/\|/g, MARKDOWN_ESCAPED_PIPE)} | ${cf?.status?.name ?? "—"} | ${updatedCell} |`,
        );
      }
      return lines;
    }

    if (childrenNote) {
      return ["", "## Child issues", childrenNote];
    }

    return [];
  }

  /**
   * Format a date string in a deterministic locale (matches issue-list.formatter).
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
