/**
 * Issue transition formatter
 *
 * Formats available transitions and transition results for MCP responses.
 */

import type { StringFormatter } from "@features/jira/shared/formatters/formatter.interface";
import type { Transition } from "../models";

export interface TransitionListFormatterInput {
  issueKey: string;
  transitions: Transition[];
}

export interface TransitionResultFormatterInput {
  issueKey: string;
  transitionId: string;
  transitionName: string;
  targetStatus: string;
}

/**
 * Formats available transitions for a Jira issue.
 */
export class TransitionListFormatter
  implements StringFormatter<TransitionListFormatterInput>
{
  format(input: TransitionListFormatterInput): string {
    const { issueKey, transitions } = input;

    if (transitions.length === 0) {
      return [
        "# Issue Transitions",
        "",
        `No available transitions found for **${issueKey}**.`,
        "",
        "The issue may already be in a terminal status, or your workflow may restrict transitions.",
        "",
        `Use \`jira_transition_issue issueKey=${issueKey} statusName="..."\` once you see a valid transition name.`,
      ].join("\n");
    }

    const rows = transitions.map(
      (transition) =>
        `| \`${transition.id}\` | ${transition.name} | ${transition.to.name} |`,
    );

    return [
      "# Issue Transitions",
      "",
      `**Issue:** ${issueKey}`,
      `**Found:** ${transitions.length} transition${transitions.length === 1 ? "" : "s"}`,
      "",
      "| ID | Transition | Target Status |",
      "|---|---|---|",
      ...rows,
      "",
      "Use `jira_transition_issue` with either `transitionId` or `statusName`.",
    ].join("\n");
  }
}

/**
 * Formats the result of a transition execution.
 */
export class TransitionResultFormatter
  implements StringFormatter<TransitionResultFormatterInput>
{
  format(input: TransitionResultFormatterInput): string {
    return [
      "# Issue Transitioned",
      "",
      `**Issue:** ${input.issueKey}`,
      `**Transition:** ${input.transitionName} (\`${input.transitionId}\`)`,
      `**Target Status:** ${input.targetStatus}`,
    ].join("\n");
  }
}
