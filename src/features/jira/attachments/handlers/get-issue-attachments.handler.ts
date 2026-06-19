/**
 * Get Issue Attachments Handler
 *
 * MCP tool handler for listing Jira issue attachment metadata
 */

import { BaseToolHandler } from "@core/tools/tool-handler.class";
import {
  JiraApiError,
  JiraNotFoundError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { AttachmentFormatter } from "../formatters/attachment.formatter";
import type { GetIssueAttachmentsUseCase } from "../use-cases/get-issue-attachments.use-case";
import type {
  AttachmentValidator,
  GetIssueAttachmentsParams,
} from "../validators/attachment.validator";

export class GetIssueAttachmentsHandler extends BaseToolHandler<
  GetIssueAttachmentsParams,
  string
> {
  private readonly attachmentFormatter: AttachmentFormatter;

  constructor(
    private readonly getIssueAttachmentsUseCase: GetIssueAttachmentsUseCase,
    private readonly attachmentValidator: AttachmentValidator,
  ) {
    super("JIRA", "Get Issue Attachments");
    this.attachmentFormatter = new AttachmentFormatter();
  }

  protected async execute(params: GetIssueAttachmentsParams): Promise<string> {
    try {
      const validatedParams =
        this.attachmentValidator.validateGetIssueAttachmentsParams(params);
      this.logger.info(
        `Getting attachments for issue: ${validatedParams.issueKey}`,
      );

      const result = await this.getIssueAttachmentsUseCase.execute({
        issueKey: validatedParams.issueKey,
      });

      return this.attachmentFormatter.formatAttachmentList(
        result.issueKey,
        result.attachments,
      );
    } catch (error) {
      this.logger.error(`Failed to get issue attachments: ${error}`);
      throw this.enhanceError(error, params);
    }
  }

  private enhanceError(
    error: unknown,
    params?: GetIssueAttachmentsParams,
  ): Error {
    const issueContext = params?.issueKey
      ? ` for issue ${params.issueKey}`
      : "";

    if (error instanceof JiraNotFoundError) {
      return new Error(
        `❌ **Issue Not Found**\n\nNo issue found${issueContext}.\n\n**Solutions:**\n- Verify the issue key is correct\n- Check if the issue exists\n- Verify you have permission to view the issue\n\n**Example:** \`jira_get_issue_attachments issueKey="PROJ-123"\``,
      );
    }

    if (error instanceof JiraPermissionError) {
      return new Error(
        `❌ **Permission Denied**\n\nYou don't have permission to view attachments${issueContext}.\n\n**Solutions:**\n- Check your JIRA permissions\n- Contact your JIRA administrator\n- Verify you have browse projects permission\n\n**Required Permissions:** Browse Projects`,
      );
    }

    if (error instanceof JiraApiError) {
      return new Error(
        `❌ **JIRA API Error**\n\n${error.message}\n\n**Solutions:**\n- Check the issue key is valid (format: PROJ-123)\n- Verify your JIRA connection\n- Try with a different issue\n\n**Example:** \`jira_get_issue_attachments issueKey="PROJ-123"\``,
      );
    }

    if (error instanceof Error) {
      return new Error(
        `❌ **Attachment Retrieval Failed**\n\n${error.message}${issueContext}\n\n**Solutions:**\n- Check your parameters are valid\n- Verify your JIRA connection\n- Try with a different issue\n\n**Example:** \`jira_get_issue_attachments issueKey="PROJ-123"\``,
      );
    }

    return new Error(
      `❌ **Unknown Error**\n\nAn unknown error occurred during attachment retrieval${issueContext}.\n\nPlease check your parameters and try again.`,
    );
  }
}
