/**
 * Issue update formatter
 */
import type { StringFormatter } from "@features/jira/shared";
import type { Issue } from "../models";

/**
 * Issue update context interface for additional formatting information
 */
export interface IssueUpdateContext {
  fieldsUpdated?: string[];
  arraysUpdated?: string[];
  hasTransition?: boolean;
  hasWorklog?: boolean;
}

/**
 * Issue update formatter class - formats updated issues for display
 */
export class IssueUpdateFormatter implements StringFormatter<Issue> {
  format(issue: Issue, context?: IssueUpdateContext): string {
    const sections: string[] = [];

    sections.push("# ✅ Issue Updated Successfully");

    this.addIssueHeader(issue, sections);
    this.addIssueDetails(issue, sections);

    if (context) {
      this.addUpdateContext(context, sections);
    }

    this.addIssueFields(issue, sections);
    this.addQuickActions(issue, sections);
    this.addNextActions(issue, sections);
    this.addSuccessFooter(sections, context);

    return sections.join("\n\n");
  }

  /**
   * Add issue header with key and summary
   */
  private addIssueHeader(issue: Issue, sections: string[]): void {
    const summary = issue.fields?.summary || "No summary";
    sections.push(`**${issue.key}**: ${summary}`);
  }

  /**
   * Add basic issue details
   */
  private addIssueDetails(issue: Issue, sections: string[]): void {
    const details: string[] = [];

    // Extract project from key
    const project = issue.key.split("-")[0];
    details.push(`**Project**: ${project}`);

    // Issue type
    const issueType = issue.fields?.issuetype?.name || "Unknown";
    details.push(`**Type**: ${issueType}`);

    // Status
    const status = issue.fields?.status?.name || "Open";
    details.push(`**Status**: ${status}`);

    // Assignee
    const assignee = issue.fields?.assignee?.displayName || "Unassigned";
    details.push(`**Assignee**: ${assignee}`);

    // Priority
    const priority = issue.fields?.priority?.name || "Medium";
    details.push(`**Priority**: ${priority}`);

    sections.push(details.join(" | "));
  }

  /**
   * Add update context information
   */
  private addUpdateContext(
    context: IssueUpdateContext,
    sections: string[],
  ): void {
    const contextInfo: string[] = [];

    if (context.fieldsUpdated && context.fieldsUpdated.length > 0) {
      contextInfo.push(
        `**Fields Updated:** ${context.fieldsUpdated.join(", ")}`,
      );
    }

    if (context.arraysUpdated && context.arraysUpdated.length > 0) {
      contextInfo.push(
        `**Arrays Modified:** ${context.arraysUpdated.join(", ")}`,
      );
    }

    // Only show transition/worklog info if they're true, or if there are other context items
    const hasOtherContext =
      (context.fieldsUpdated && context.fieldsUpdated.length > 0) ||
      (context.arraysUpdated && context.arraysUpdated.length > 0);

    if (context.hasTransition === true) {
      contextInfo.push("**Status Transition:** ✅ Applied");
    } else if (hasOtherContext) {
      contextInfo.push("**Status Transition:** ❌ Not Applied");
    }

    if (context.hasWorklog === true) {
      contextInfo.push("**Worklog Entry:** ✅ Added");
    } else if (context.hasWorklog === false && hasOtherContext) {
      contextInfo.push("**Worklog Entry:** ❌ Not Added");
    }

    if (contextInfo.length > 0) {
      sections.push(contextInfo.join(" | "));
    }
  }

  /**
   * Add detailed issue fields
   */
  private addIssueFields(issue: Issue, sections: string[]): void {
    const fields: string[] = [];

    // Description with truncation
    if (issue.fields?.description) {
      const description =
        typeof issue.fields.description === "string"
          ? issue.fields.description
          : JSON.stringify(issue.fields.description);

      const maxLength = 150;
      const truncatedDescription =
        description.length > maxLength
          ? `${description.substring(0, maxLength)}...`
          : description;

      fields.push(`**Description:** ${truncatedDescription}`);
    }

    // Time tracking
    this.addTimeTracking(issue, fields);

    // Story points
    this.addStoryPoints(issue, fields);

    // Labels
    if (
      issue.fields?.labels &&
      Array.isArray(issue.fields.labels) &&
      issue.fields.labels.length > 0
    ) {
      fields.push(`**Labels:** ${issue.fields.labels.join(", ")}`);
    }

    // Components
    if (
      issue.fields?.components &&
      Array.isArray(issue.fields.components) &&
      issue.fields.components.length > 0
    ) {
      const componentNames = issue.fields.components
        .map((c: { name?: string } | string) =>
          typeof c === "string" ? c : c.name || "Unknown",
        )
        .join(", ");
      fields.push(`**Components:** ${componentNames}`);
    }

    // Fix Versions
    if (
      issue.fields?.fixVersions &&
      Array.isArray(issue.fields.fixVersions) &&
      issue.fields.fixVersions.length > 0
    ) {
      const versionNames = issue.fields.fixVersions
        .map((v: { name?: string } | string) =>
          typeof v === "string" ? v : v.name || "Unknown",
        )
        .join(", ");
      fields.push(`**Fix Versions:** ${versionNames}`);
    }

    // Updated timestamp - show label even when missing
    if (issue.fields?.updated) {
      fields.push(
        `**Last Updated:** ${this.formatDateTime(issue.fields.updated)}`,
      );
    } else {
      fields.push("**Last Updated:**");
    }

    if (fields.length > 0) {
      sections.push(fields.join("\n"));
    }
  }

  /**
   * Add time tracking information
   */
  private addTimeTracking(issue: Issue, fields: string[]): void {
    const originalEstimate = issue.fields?.timeoriginalestimate;
    const remainingEstimate = issue.fields?.timeestimate;

    if (originalEstimate !== undefined || remainingEstimate !== undefined) {
      const timeInfo: string[] = [];

      if (
        originalEstimate !== undefined &&
        originalEstimate !== null &&
        typeof originalEstimate === "number"
      ) {
        const hours = this.convertSecondsToHours(originalEstimate);
        timeInfo.push(`Original: ${hours}h`);
      }

      if (
        remainingEstimate !== undefined &&
        remainingEstimate !== null &&
        typeof remainingEstimate === "number"
      ) {
        const hours = this.convertSecondsToHours(remainingEstimate);
        timeInfo.push(`Remaining: ${hours}h`);
      }

      if (timeInfo.length > 0) {
        fields.push(`**Time Tracking:** ${timeInfo.join(", ")}`);
      }
    }
  }

  /**
   * Convert seconds to hours (rounded)
   */
  private convertSecondsToHours(seconds: number): number {
    return Math.round(seconds / 3600);
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

  /**
   * Add story points information
   */
  private addStoryPoints(issue: Issue, fields: string[]): void {
    const storyPoints = issue.fields?.customfield_10016;
    if (typeof storyPoints === "number" || typeof storyPoints === "string") {
      fields.push(`Story Points: ${storyPoints}`);
    }
  }

  /**
   * Add quick action links
   */
  private addQuickActions(issue: Issue, sections: string[]): void {
    const baseUrl = issue.self
      ? issue.self
          .replace("/rest/api/3/issue/", "/browse/")
          .replace(/\/[^/]*$/, `/${issue.key}`)
      : `https://your-domain.atlassian.net/browse/${issue.key}`;

    const editUrl = issue.self
      ? issue.self
          .replace("/rest/api/3/issue/", "/secure/EditIssue!default.jspa?key=")
          .replace(/\/[^/]*$/, `=${issue.key}`)
          .replace(/\/secure=/, "/secure/EditIssue!default.jspa?key=")
      : `https://your-domain.atlassian.net/secure/EditIssue!default.jspa?key=${issue.key}`;

    const commentUrl = issue.self
      ? `${baseUrl}?focusedCommentId=&page=com.atlassian.jira.plugin.system.issuetabpanels%3Acomment-tabpanel#action_id=comment`
      : `${baseUrl}#add-comment`;

    const actions = [
      `[View Issue](${baseUrl})`,
      `[Edit Issue](${editUrl})`,
      `[Add Comment](${commentUrl})`,
    ];

    sections.push(`**Quick Actions:** ${actions.join(" | ")}`);
  }

  /**
   * Add next actions with specific commands
   */
  private addNextActions(issue: Issue, sections: string[]): void {
    const project = issue.key.split("-")[0];

    sections.push("## 🚀 **Next Actions:**");

    const actions = [
      `• Use \`jira_get_issue ${issue.key}\` to view the updated issue details`,
      `• Use \`jira_update_issue ${issue.key}\` to make further changes`,
      `• Use \`jira_transition_issue ${issue.key}\` to change the issue status`,
      `• Use \`jira_add_worklog ${issue.key}\` to log time spent on this issue`,
      `• Use \`jira_get_issue_comments ${issue.key}\` to view or add comments`,
      `• Use \`search_jira_issues project=${project}\` to find related issues`,
    ];

    sections.push(actions.join("\n"));
  }

  /**
   * Add success footer
   */
  private addSuccessFooter(
    sections: string[],
    context?: IssueUpdateContext,
  ): void {
    // Use simple message only for specific empty context scenarios
    if (context && this.isEmptyContextScenario(context)) {
      sections.push("Issue updated successfully");
    } else {
      sections.push("✨ Issue update completed successfully!");
    }
  }

  /**
   * Check if this is an empty context scenario that should use simple message
   */
  private isEmptyContextScenario(context: IssueUpdateContext): boolean {
    // Empty context object
    if (Object.keys(context).length === 0) {
      return true;
    }

    // Context with empty arrays and false booleans (no meaningful content)
    const hasEmptyArrays =
      context.fieldsUpdated?.length === 0 ||
      context.arraysUpdated?.length === 0;
    const hasFalseBooleans =
      context.hasTransition === false || context.hasWorklog === false;
    const hasNoTrueValues =
      context.hasTransition !== true && context.hasWorklog !== true;
    const hasNoNonEmptyArrays =
      (!context.fieldsUpdated || context.fieldsUpdated.length === 0) &&
      (!context.arraysUpdated || context.arraysUpdated.length === 0);

    return (
      (hasEmptyArrays &&
        hasFalseBooleans &&
        hasNoTrueValues &&
        hasNoNonEmptyArrays) ||
      false
    );
  }
}
