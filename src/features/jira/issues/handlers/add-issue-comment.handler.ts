/**
 * Add Issue Comment Handler
 *
 * MCP tool handler for adding a comment to a Jira issue.
 */

import { BaseToolHandler } from "@core/tools/tool-handler.class";
import {
  JiraApiError,
  JiraNotFoundError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { CommentAddedFormatter } from "@features/jira/issues/formatters/comments.formatter";
import type { AddIssueCommentUseCase } from "@features/jira/issues/use-cases/add-issue-comment.use-case";
import type {
  AddIssueCommentParams,
  IssueCommentValidator,
} from "@features/jira/issues/validators/issue-comment.validator";

/**
 * Handler for adding a public Jira issue comment.
 */
export class AddIssueCommentHandler extends BaseToolHandler<
  AddIssueCommentParams,
  string
> {
  private readonly formatter: CommentAddedFormatter;

  constructor(
    private readonly addIssueCommentUseCase: AddIssueCommentUseCase,
    private readonly issueCommentValidator: IssueCommentValidator,
  ) {
    super("JIRA", "Add Issue Comment");
    this.formatter = new CommentAddedFormatter();
  }

  protected async execute(params: AddIssueCommentParams): Promise<string> {
    try {
      const validatedParams =
        this.issueCommentValidator.validateAddCommentParams(params);
      this.logger.info(
        `Adding comment to JIRA issue: ${validatedParams.issueKey}`,
      );
      const comment =
        await this.addIssueCommentUseCase.execute(validatedParams);
      return this.formatter.format(comment);
    } catch (error) {
      this.logger.error(`Failed to add issue comment: ${error}`);
      throw this.enhanceError(error, params.issueKey);
    }
  }

  private enhanceError(error: unknown, issueKey?: string): Error {
    const issueContext = issueKey ? ` for issue ${issueKey}` : "";

    if (error instanceof JiraNotFoundError) {
      return new Error(
        `❌ **Issue Not Found**\n\nUnable to find issue${issueContext}.\n\n**Solutions:**\n- Verify the issue key is correct\n- Use \`jira_get_issue issueKey=${issueKey}\` to confirm the issue exists\n- Check that you have access to the issue`,
      );
    }

    if (error instanceof JiraPermissionError) {
      return new Error(
        `❌ **Permission Denied**\n\nYou don't have permission to add comments${issueContext}.\n\n**Solutions:**\n- Check your Jira permissions\n- Contact your Jira administrator\n- Verify you can browse and comment on the issue`,
      );
    }

    if (error instanceof JiraApiError) {
      return new Error(
        `❌ **Comment Add Failed**\n\n${error.message}\n\n**Solutions:**\n- Verify the issue key is correct\n- Check your Jira permissions\n- Try a shorter comment\n\n**Example:** \`jira_add_issue_comment issueKey=PROJ-123 comment="Update from MCP"\``,
      );
    }

    if (error instanceof Error) {
      return new Error(
        `❌ **Comment Add Failed**\n\n${error.message}${issueContext}\n\n**Solutions:**\n- Check the issue key and comment text\n- Verify your Jira connection`,
      );
    }

    return new Error(
      `❌ **Unknown Error**\n\nAn unknown error occurred while adding a comment${issueContext}.`,
    );
  }
}
