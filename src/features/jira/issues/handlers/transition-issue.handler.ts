/**
 * Transition Issue Handler
 *
 * MCP tool handler for applying a workflow transition to an issue.
 */

import { BaseToolHandler } from "@core/tools/tool-handler.class";
import { formatZodError } from "@core/utils/validation";
import {
  JiraApiError,
  JiraNotFoundError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { TransitionResultFormatter } from "@features/jira/issues/formatters/transition.formatter";
import type {
  TransitionIssueUseCase,
  TransitionIssueUseCaseRequest,
} from "@features/jira/issues/use-cases/transition.use-cases";
import { IssueTransitionValidationError } from "@features/jira/issues/validators/errors";
import {
  type WorkflowTransitionIssueParams,
  workflowTransitionIssueParamsSchema,
} from "@features/jira/issues/validators/issue-transition.validator";

/**
 * Handler for transitioning a Jira issue.
 */
export class TransitionIssueHandler extends BaseToolHandler<
  WorkflowTransitionIssueParams,
  string
> {
  private readonly formatter: TransitionResultFormatter;

  constructor(private readonly transitionIssueUseCase: TransitionIssueUseCase) {
    super("JIRA", "Transition Issue");
    this.formatter = new TransitionResultFormatter();
  }

  protected async execute(
    params: WorkflowTransitionIssueParams,
  ): Promise<string> {
    try {
      const validatedParams = this.validateParameters(params);
      this.logger.info(
        `Transitioning issue ${validatedParams.issueKey} with workflow target`,
      );

      const request: TransitionIssueUseCaseRequest = {
        issueKey: validatedParams.issueKey,
        transitionId: validatedParams.transitionId,
        statusName: validatedParams.statusName,
        fields: validatedParams.fields,
      };

      const result = await this.transitionIssueUseCase.execute(request);

      return this.formatter.format({
        issueKey: result.issueKey,
        transitionId: result.transition.id,
        transitionName: result.transition.name,
        targetStatus: result.transition.to.name,
      });
    } catch (error) {
      this.logger.error(`Failed to transition issue: ${error}`);
      throw this.enhanceError(error, params.issueKey);
    }
  }

  private validateParameters(
    params: WorkflowTransitionIssueParams,
  ): WorkflowTransitionIssueParams {
    const result = workflowTransitionIssueParamsSchema.safeParse(params);

    if (!result.success) {
      throw new IssueTransitionValidationError(
        `Invalid transition parameters: ${formatZodError(result.error)}`,
      );
    }

    return result.data;
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
        `❌ **Permission Denied**\n\nYou don't have permission to transition${issueContext}.\n\n**Solutions:**\n- Check your Jira permissions\n- Contact your Jira administrator\n- Verify you can edit the issue`,
      );
    }

    if (error instanceof JiraApiError) {
      return new Error(
        `❌ **Transition Failed**\n\n${error.message}\n\n**Solutions:**\n- Use \`jira_get_issue_transitions issueKey=${issueKey}\` to inspect available transitions\n- Try \`transitionId\` if \`statusName\` is ambiguous\n- Check your Jira workflow permissions`,
      );
    }

    if (error instanceof Error) {
      return new Error(
        `❌ **Transition Failed**\n\n${error.message}${issueContext}\n\n**Solutions:**\n- Check the issue key and transition name\n- Use \`jira_get_issue_transitions issueKey=${issueKey}\` to inspect available transitions\n- Verify your Jira connection`,
      );
    }

    return new Error(
      `❌ **Unknown Error**\n\nAn unknown error occurred while transitioning${issueContext}.`,
    );
  }
}
