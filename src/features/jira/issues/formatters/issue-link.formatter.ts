import type { StringFormatter } from "@features/jira/shared/formatters/formatter.interface";
import type { IssueLinkType, LinkIssuesRequest } from "../models";

/**
 * Formats available issue link types.
 */
export class IssueLinkTypesFormatter
  implements StringFormatter<IssueLinkType[]>
{
  format(types: IssueLinkType[]): string {
    if (types.length === 0) {
      return ["# Issue Link Types", "", "No link types found."].join("\n");
    }

    const rows = types
      .map(
        (type) =>
          `| \`${type.name}\` | ${type.inward} | ${type.outward} | ${type.id} |`,
      )
      .join("\n");

    return [
      "# Issue Link Types",
      "",
      `Found **${types.length}** link type${types.length === 1 ? "" : "s"}`,
      "",
      "| Name | Inward (← this) | Outward (this →) | ID |",
      "|---|---|---|---|",
      rows,
      "",
      "Use `jira_link_issues` with exact `linkTypeName` (for example, `Blocks`).",
      "Inward: the issue that is the target of the link direction.",
      "Outward: the issue that initiates the link.",
    ].join("\n");
  }
}

/**
 * Formats a created issue link result.
 */
export class IssueLinkedFormatter
  implements StringFormatter<LinkIssuesRequest>
{
  format(params: LinkIssuesRequest): string {
    const commentStatus = params.comment ? "Yes" : "No";

    return [
      "# Issue Linked",
      "",
      `**${params.outwardIssueKey}** —[${params.linkTypeName}]→ **${params.inwardIssueKey}**`,
      "",
      `- **Inward issue**: ${params.inwardIssueKey}`,
      `- **Outward issue**: ${params.outwardIssueKey}`,
      `- **Link type**: ${params.linkTypeName}`,
      `- **Comment added**: ${commentStatus}`,
    ].join("\n");
  }
}
