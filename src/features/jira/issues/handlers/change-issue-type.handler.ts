import { BaseToolHandler } from "@core/tools/tool-handler.class";
import { formatZodError } from "@core/utils/validation";
import {
  JiraApiError,
  JiraNotFoundError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { IssueTypeChangeFormatter } from "@features/jira/issues/formatters/issue-type-change.formatter";
import type { ChangeIssueTypeUseCase } from "@features/jira/issues/use-cases/change-issue-type.use-case";
import {
  type ChangeIssueTypeParams,
  changeIssueTypeParamsSchema,
} from "@features/jira/issues/validators/epic.validator";

export class ChangeIssueTypeHandler extends BaseToolHandler<
  ChangeIssueTypeParams,
  string
> {
  private readonly formatter = new IssueTypeChangeFormatter();

  constructor(private readonly changeIssueTypeUseCase: ChangeIssueTypeUseCase) {
    super("JIRA", "Change Issue Type");
  }

  protected async execute(params: ChangeIssueTypeParams): Promise<string> {
    try {
      const validated = this.validate(params);
      const result = await this.changeIssueTypeUseCase.execute(validated);
      return this.formatter.format(result);
    } catch (error) {
      throw this.enhanceError(error, params);
    }
  }

  private validate(params: ChangeIssueTypeParams): ChangeIssueTypeParams {
    const result = changeIssueTypeParamsSchema.safeParse(params);
    if (!result.success) {
      throw JiraApiError.withStatusCode(
        `Invalid parameters: ${formatZodError(result.error)}`,
        400,
      );
    }
    return result.data;
  }

  private enhanceError(error: unknown, params?: ChangeIssueTypeParams): Error {
    const key = params?.issueKey ? ` '${params.issueKey}'` : "";

    if (error instanceof JiraNotFoundError) {
      return new Error(`❌ **Issue Not Found**\n\nIssue${key} not found.`);
    }
    if (error instanceof JiraPermissionError) {
      return new Error(`❌ **Permission Denied**\n\nCannot edit issue${key}.`);
    }
    if (error instanceof JiraApiError) {
      return new Error(
        `❌ **Change Issue Type Failed**\n\n${error.message}\n\nJira may require **Move issue** in the UI, extra fields on the transition screen, or may block downgrading an Epic with children.`,
      );
    }
    if (error instanceof Error) {
      return new Error(`❌ **Change Issue Type Failed**\n\n${error.message}`);
    }
    return new Error("❌ **Change Issue Type Failed**");
  }
}
