import type { EpicRelationActionResult } from "../models/epic-relation-action.models";

/**
 * Markdown for set/remove epic relation operations.
 */
export class EpicRelationActionFormatter {
  format(result: EpicRelationActionResult): string {
    const verb = result.action === "set" ? "linked" : "unlinked";
    const fieldLine = result.epicLinkFieldId
      ? `\n**Epic Link field**: \`${result.epicLinkFieldId}\``
      : "";

    if (result.action === "set" && result.epicIssueKey) {
      return [
        "# Epic relation updated",
        "",
        `**Issue**: ${result.issueKey}`,
        `**Epic**: ${result.epicIssueKey}`,
        `**Mechanism**: ${result.mode}${fieldLine}`,
        "",
        `Successfully ${verb} via **${result.mode}**.`,
        "",
      ].join("\n");
    }

    return [
      "# Epic relation updated",
      "",
      `**Issue**: ${result.issueKey}`,
      `**Mechanism**: ${result.mode}${fieldLine}`,
      "",
      `Successfully ${verb} epic association.`,
      "",
    ].join("\n");
  }
}
