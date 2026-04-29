/**
 * Search Users Handler
 *
 * MCP tool handler for searching Jira users by query.
 */

import { BaseToolHandler } from "@core/tools/tool-handler.class";
import { formatZodError } from "@core/utils/validation";
import {
  JiraApiError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { JiraIssueValidationError } from "@features/jira/shared/validators/errors";
import { UserListFormatter } from "@features/jira/users/formatters/user-list.formatter";
import type { SearchUsersUseCase } from "@features/jira/users/use-cases/search-users.use-case";
import {
  type SearchUsersParams,
  searchUsersParamsSchema,
} from "@features/jira/users/validators/user-search.validator";

/**
 * Handler for searching Jira users.
 */
export class SearchUsersHandler extends BaseToolHandler<
  SearchUsersParams,
  string
> {
  private readonly formatter: UserListFormatter;

  constructor(private readonly searchUsersUseCase: SearchUsersUseCase) {
    super("JIRA", "Search Users");
    this.formatter = new UserListFormatter();
  }

  protected async execute(params: SearchUsersParams): Promise<string> {
    try {
      const validatedParams = this.validateParameters(params);
      this.logger.info(
        `Searching Jira users for query: ${validatedParams.query}`,
      );

      const users = await this.searchUsersUseCase.execute(validatedParams);

      return this.formatter.format({
        users,
        title: "JIRA Users",
        query: validatedParams.query,
      });
    } catch (error) {
      this.logger.error(`Failed to search users: ${error}`);
      throw this.enhanceError(error, params.query);
    }
  }

  private validateParameters(params: SearchUsersParams): SearchUsersParams {
    const result = searchUsersParamsSchema.safeParse(params);

    if (!result.success) {
      throw new JiraIssueValidationError(
        `Invalid user search parameters: ${formatZodError(result.error)}`,
      );
    }

    return result.data;
  }

  private enhanceError(error: unknown, query?: string): Error {
    const queryContext = query ? ` for query "${query}"` : "";

    if (error instanceof JiraPermissionError) {
      return new Error(
        `❌ **Permission Denied**\n\nYou don't have permission to search users${queryContext}.\n\n**Solutions:**\n- Check your Jira permissions\n- Verify your API token\n- Contact your Jira administrator`,
      );
    }

    if (error instanceof JiraApiError) {
      return new Error(
        `❌ **JIRA API Error**\n\n${error.message}\n\n**Solutions:**\n- Verify your Jira connection\n- Try a simpler query\n- Check your authentication credentials\n\n**Example:** \`jira_search_users query="Alisia"\``,
      );
    }

    if (error instanceof Error) {
      return new Error(
        `❌ **User Search Failed**\n\n${error.message}${queryContext}\n\n**Solutions:**\n- Check your query\n- Verify your Jira connection\n- Try a broader search term`,
      );
    }

    return new Error(
      `❌ **Unknown Error**\n\nAn unknown error occurred while searching users${queryContext}.`,
    );
  }
}
