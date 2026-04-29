/**
 * Get Assignable Users Handler
 *
 * MCP tool handler for listing users that can be assigned to an issue.
 */

import { BaseToolHandler } from "@core/tools/tool-handler.class";
import { formatZodError } from "@core/utils/validation";
import {
  JiraApiError,
  JiraNotFoundError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { JiraIssueValidationError } from "@features/jira/shared/validators/errors";
import { UserListFormatter } from "@features/jira/users/formatters/user-list.formatter";
import type { GetAssignableUsersUseCase } from "@features/jira/users/use-cases/get-assignable-users.use-case";
import {
  type GetAssignableUsersParams,
  getAssignableUsersParamsSchema,
} from "@features/jira/users/validators/user-search.validator";

/**
 * Handler for listing assignable users.
 */
export class GetAssignableUsersHandler extends BaseToolHandler<
  GetAssignableUsersParams,
  string
> {
  private readonly formatter: UserListFormatter;

  constructor(
    private readonly getAssignableUsersUseCase: GetAssignableUsersUseCase,
  ) {
    super("JIRA", "Get Assignable Users");
    this.formatter = new UserListFormatter();
  }

  protected async execute(params: GetAssignableUsersParams): Promise<string> {
    try {
      const validatedParams = this.validateParameters(params);
      this.logger.info(
        `Getting assignable users for issue: ${validatedParams.issueKey}`,
      );

      const users =
        await this.getAssignableUsersUseCase.execute(validatedParams);

      return this.formatter.format({
        users,
        title: "Assignable Users",
        query: validatedParams.query,
        issueKey: validatedParams.issueKey,
      });
    } catch (error) {
      this.logger.error(`Failed to get assignable users: ${error}`);
      throw this.enhanceError(error, params.issueKey);
    }
  }

  private validateParameters(
    params: GetAssignableUsersParams,
  ): GetAssignableUsersParams {
    const result = getAssignableUsersParamsSchema.safeParse(params);

    if (!result.success) {
      throw new JiraIssueValidationError(
        `Invalid assignable users parameters: ${formatZodError(result.error)}`,
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
        `❌ **Permission Denied**\n\nYou don't have permission to inspect assignable users${issueContext}.\n\n**Solutions:**\n- Check your Jira permissions\n- Contact your Jira administrator`,
      );
    }

    if (error instanceof JiraApiError) {
      return new Error(
        `❌ **JIRA API Error**\n\n${error.message}\n\n**Solutions:**\n- Verify the issue key is correct\n- Check your Jira connection\n- Try again in a moment\n\n**Example:** \`jira_get_assignable_users issueKey=PROJ-123\``,
      );
    }

    if (error instanceof Error) {
      return new Error(
        `❌ **Assignable User Lookup Failed**\n\n${error.message}${issueContext}\n\n**Solutions:**\n- Verify the issue key is valid\n- Check your Jira connection`,
      );
    }

    return new Error(
      `❌ **Unknown Error**\n\nAn unknown error occurred while getting assignable users${issueContext}.`,
    );
  }
}
