/**
 * Get Issue Transitions Handler
 *
 * MCP tool handler for listing available transitions for an issue.
 */

import { BaseToolHandler } from "@core/tools/tool-handler.class";
import { formatZodError } from "@core/utils/validation";
import {
  JiraApiError,
  JiraNotFoundError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { TransitionListFormatter } from "@features/jira/issues/formatters/transition.formatter";
import type { GetIssueTransitionsUseCase } from "@features/jira/issues/use-cases/get-issue-transitions.use-case";
import { IssueTransitionValidationError } from "@features/jira/issues/validators/errors";
import {
  type GetIssueTransitionsParams,
  getIssueTransitionsParamsSchema,
} from "@features/jira/issues/validators/issue-transition.validator";

/**
 * Handler for listing available transitions for a Jira issue.
 */
export class GetIssueTransitionsHandler extends BaseToolHandler<
  GetIssueTransitionsParams,
  string
> {
  private readonly formatter: TransitionListFormatter;

  constructor(
    private readonly getIssueTransitionsUseCase: GetIssueTransitionsUseCase,
  ) {
    super("JIRA", "Get Issue Transitions");
    this.formatter = new TransitionListFormatter();
  }

  protected async execute(params: GetIssueTransitionsParams): Promise<string> {
    try {
      const validatedParams = this.validateParameters(params);
      this.logger.info(
        `Getting available transitions for issue: ${validatedParams.issueKey}`,
      );

      const transitions = await this.getIssueTransitionsUseCase.execute(
        validatedParams.issueKey,
      );

      return this.formatter.format({
        issueKey: validatedParams.issueKey,
        transitions,
      });
    } catch (error) {
      this.logger.error(`Failed to get issue transitions: ${error}`);
      throw this.enhanceError(error, params.issueKey);
    }
  }

  private validateParameters(
    params: GetIssueTransitionsParams,
  ): GetIssueTransitionsParams {
    const result = getIssueTransitionsParamsSchema.safeParse(params);

    if (!result.success) {
      throw new IssueTransitionValidationError(
        `Invalid issue transition parameters: ${formatZodError(result.error)}`,
      );
    }

    return result.data;
  }

  private enhanceError(error: unknown, issueKey?: string): Error {
    const issueContext = issueKey ? ` for issue ${issueKey}` : "";

    if (error instanceof JiraNotFoundError) {
      return new Error(
        `❌ **Issue Not Found**\n\nUnable to find issue${issueContext}.\n\n**Solutions:**\n- Verify the issue key is correct\n- Try \`jira_get_issue issueKey=${issueKey}\` first\n- Check that you have access to the issue`,
      );
    }

    if (error instanceof JiraPermissionError) {
      return new Error(
        `❌ **Permission Denied**\n\nYou don't have permission to view transitions${issueContext}.\n\n**Solutions:**\n- Check your Jira permissions\n- Contact your Jira administrator\n- Verify you can view the issue itself`,
      );
    }

    if (error instanceof JiraApiError) {
      return new Error(
        `❌ **JIRA API Error**\n\n${error.message}\n\n**Solutions:**\n- Verify the issue key is correct\n- Check your Jira connection\n- Try again in a moment\n\n**Example:** \`jira_get_issue_transitions issueKey=PROJ-123\``,
      );
    }

    if (error instanceof Error) {
      return new Error(
        `❌ **Transition Retrieval Failed**\n\n${error.message}${issueContext}\n\n**Solutions:**\n- Verify the issue key is valid\n- Check your Jira connection\n- Use \`jira_get_issue\` to confirm the issue exists`,
      );
    }

    return new Error(
      `❌ **Unknown Error**\n\nAn unknown error occurred while getting transitions${issueContext}.`,
    );
  }
}
