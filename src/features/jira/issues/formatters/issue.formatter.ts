import { AttachmentFormatter } from "@features/jira/attachments/formatters/attachment.formatter";
import { mapIssueAttachments } from "@features/jira/attachments/models";
import type { Formatter } from "@features/jira/shared/formatters/formatter.interface";
/**
 * Issue formatter
 */
import type { Issue, IssueFields } from "../models/issue.models";
import {
  IssueFieldValidator,
  hasDateInfo,
  hasLabels,
  hasValidDescription,
  hasValidSelfUrl,
  validateIssue,
} from "../validators/issue-field.validator";
import { IssueDatesFormatter } from "./issue-dates.formatter";
import { IssueDescriptionFormatter } from "./issue-description.formatter";
import { IssueHeaderFormatter } from "./issue-header.formatter";

/**
 * Issue formatter class that converts issues to markdown strings using Zod schema validation
 */
export class IssueFormatter implements Formatter<Issue, string> {
  private readonly fieldValidator: IssueFieldValidator;
  private readonly headerFormatter: IssueHeaderFormatter;
  private readonly descriptionFormatter: IssueDescriptionFormatter;
  private readonly datesFormatter: IssueDatesFormatter;
  private readonly attachmentFormatter: AttachmentFormatter;

  constructor() {
    this.fieldValidator = new IssueFieldValidator();
    this.headerFormatter = new IssueHeaderFormatter();
    this.descriptionFormatter = new IssueDescriptionFormatter();
    this.datesFormatter = new IssueDatesFormatter();
    this.attachmentFormatter = new AttachmentFormatter();
  }

  format(issue: Issue): string {
    if (!issue) {
      return "";
    }

    const validationResult = validateIssue(issue);
    if (
      !validationResult.success ||
      this.fieldValidator.hasEmptyFields(issue)
    ) {
      return this.headerFormatter.formatFallbackHeader(issue.key || "");
    }

    return this.formatValidIssue(issue);
  }

  private formatValidIssue(issue: Issue): string {
    const safeValues = this.fieldValidator.getSafeFieldValues(issue);
    let markdown = this.headerFormatter.formatTitle(
      safeValues.key,
      safeValues.summary,
    );

    markdown += this.formatBasicInfo(issue, safeValues);
    markdown += this.headerFormatter.formatIssueLinksSnippet(
      issue.fields?.issuelinks ?? undefined,
    );
    markdown += this.formatDescription(issue);
    markdown += this.formatLabels(issue);
    markdown += this.formatDates(issue);
    markdown += this.formatJiraLink(issue);
    markdown += this.formatAttachments(issue);

    return markdown;
  }

  private formatBasicInfo(
    issue: Issue,
    safeValues: ReturnType<IssueFieldValidator["getSafeFieldValues"]>,
  ): string {
    const { fields } = issue;
    const issueTypeName = fields?.issuetype?.name ?? "Unknown";
    const parentKey = this.getParentKey(fields?.parent);

    return this.headerFormatter.formatBasicInfo(
      safeValues.status,
      safeValues.priority,
      safeValues.assignee,
      {
        issueType: issueTypeName,
        parentKey,
      },
    );
  }

  private getParentKey(parent: IssueFields["parent"]): string | undefined {
    if (parent == null || typeof parent !== "object") {
      return undefined;
    }
    return parent.key;
  }

  private formatDescription(issue: Issue): string {
    if (!hasValidDescription(issue)) {
      return "";
    }
    return this.descriptionFormatter.formatDescription(issue);
  }

  private formatLabels(issue: Issue): string {
    if (!hasLabels(issue)) {
      return "";
    }
    return this.headerFormatter.formatLabels(issue.fields?.labels || []);
  }

  private formatDates(issue: Issue): string {
    if (!hasDateInfo(issue)) {
      return "";
    }
    return this.datesFormatter.formatDates(issue);
  }

  private formatJiraLink(issue: Issue): string {
    if (!hasValidSelfUrl(issue)) {
      return "";
    }
    return this.headerFormatter.formatJiraLink(issue);
  }

  private formatAttachments(issue: Issue): string {
    const attachments = mapIssueAttachments(issue.fields?.attachment);
    if (attachments.length === 0) {
      return "";
    }
    return `\n\n${this.attachmentFormatter.formatIssueAttachmentsSection(attachments)}`;
  }

  /**
   * Format an issue as a simple object (for API compatibility) with schema validation
   */
  formatAsObject(issue: Issue) {
    if (!issue) {
      return {};
    }

    // Validate issue structure using Zod schema
    const validationResult = validateIssue(issue);
    if (!validationResult.success || !issue.fields) {
      return {};
    }

    // Use original issue for compatibility with existing interfaces
    const { id, key, self, fields } = issue;

    return {
      id,
      key,
      self,
      fields: {
        summary: fields.summary,
        description: fields.description,
        issuetype: fields.issuetype,
        project: fields.project,
        status: fields.status,
        creator: fields.creator,
        reporter: fields.reporter,
        assignee: fields.assignee,
        created: fields.created,
        updated: fields.updated,
      },
    };
  }
}
