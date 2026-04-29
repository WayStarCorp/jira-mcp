/**
 * Assign Issue Handler
 *
 * MCP tool handler for assigning a Jira issue to a user.
 */

import { BaseToolHandler } from "@core/tools/tool-handler.class";
import { formatZodError } from "@core/utils/validation";
import {
  JiraApiError,
  JiraNotFoundError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { IssueUpdateFormatter } from "@features/jira/issues/formatters/issue-update.formatter";
import { JiraIssueValidationError } from "@features/jira/shared/validators/errors";
import type { AssignIssueUseCase } from "@features/jira/users/use-cases/assign-issue.use-case";
import {
  type AssignIssueParams,
  assignIssueParamsSchema,
} from "@features/jira/users/validators/user-search.validator";

/**
 * Handler for assigning a Jira issue to a user.
 */
export class AssignIssueHandler extends BaseToolHandler<
  AssignIssueParams,
  string
> {
  private readonly formatter: IssueUpdateFormatter;

  constructor(private readonly assignIssueUseCase: AssignIssueUseCase) {
    super("JIRA", "Assign Issue");
    this.formatter = new IssueUpdateFormatter();
  }

  protected async execute(params: AssignIssueParams): Promise<string> {
    try {
      const validatedParams = this.validateParameters(params);
      this.logger.info(`Assigning issue: ${validatedParams.issueKey}`);

      const updatedIssue =
        await this.assignIssueUseCase.execute(validatedParams);

      return this.formatter.format(updatedIssue);
    } catch (error) {
      this.logger.error(`Failed to assign issue: ${error}`);
      throw this.enhanceError(error, params.issueKey);
    }
  }

  private validateParameters(params: AssignIssueParams): AssignIssueParams {
    const result = assignIssueParamsSchema.safeParse(params);

    if (!result.success) {
      throw new JiraIssueValidationError(
        `Invalid assign issue parameters: ${formatZodError(result.error)}`,
      );
    }

    return result.data;
  }

  private enhanceError(error: unknown, issueKey?: string): Error {
    const issueContext = issueKey ? ` for issue ${issueKey}` : "";

    if (error instanceof JiraNotFoundError) {
      return new Error(
        `❌ **Issue Not Found**\n\nUnable to find issue${issueContext}.\n\n**Solutions:**\n- Verify the issue key is correct\n- Use \`jira_get_issue issueKey=${issueKey}\` to confirm the issue exists`,
      );
    }

    if (error instanceof JiraPermissionError) {
      return new Error(
        `❌ **Permission Denied**\n\nYou don't have permission to assign issues${issueContext}.\n\n**Solutions:**\n- Check your Jira permissions\n- Contact your Jira administrator\n- Verify you can edit the issue`,
      );
    }

    if (error instanceof JiraApiError) {
      return new Error(
        `❌ **Assign Failed**\n\n${error.message}\n\n**Solutions:**\n- Try a more specific query\n- Use the exact accountId if you know it\n- Check your Jira permissions\n\n**Example:** \`jira_assign_issue issueKey=PROJ-123 query="alice"\``,
      );
    }

    if (error instanceof Error) {
      return new Error(
        `❌ **Assign Failed**\n\n${error.message}${issueContext}\n\n**Solutions:**\n- Check the issue key and user query\n- Verify your Jira connection`,
      );
    }

    return new Error(
      `❌ **Unknown Error**\n\nAn unknown error occurred while assigning${issueContext}.`,
    );
  }
}
