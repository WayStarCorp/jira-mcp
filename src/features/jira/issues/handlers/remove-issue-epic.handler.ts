import { BaseToolHandler } from "@core/tools/tool-handler.class";
import { formatZodError } from "@core/utils/validation";
import {
  JiraApiError,
  JiraNotFoundError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { EpicRelationActionFormatter } from "@features/jira/issues/formatters/epic-relation-action.formatter";
import type { RemoveIssueEpicUseCase } from "@features/jira/issues/use-cases/remove-issue-epic.use-case";
import {
  type RemoveIssueEpicParams,
  removeIssueEpicParamsSchema,
} from "@features/jira/issues/validators/epic.validator";

export class RemoveIssueEpicHandler extends BaseToolHandler<
  RemoveIssueEpicParams,
  string
> {
  private readonly formatter = new EpicRelationActionFormatter();

  constructor(private readonly removeIssueEpicUseCase: RemoveIssueEpicUseCase) {
    super("JIRA", "Remove Issue Epic");
  }

  protected async execute(params: RemoveIssueEpicParams): Promise<string> {
    try {
      const validated = this.validate(params);
      const result = await this.removeIssueEpicUseCase.execute(validated);
      return this.formatter.format(result);
    } catch (error) {
      throw this.enhanceError(error, params);
    }
  }

  private validate(params: RemoveIssueEpicParams): RemoveIssueEpicParams {
    const result = removeIssueEpicParamsSchema.safeParse(params);
    if (!result.success) {
      throw JiraApiError.withStatusCode(
        `Invalid parameters: ${formatZodError(result.error)}`,
        400,
      );
    }
    return result.data;
  }

  private enhanceError(error: unknown, params?: RemoveIssueEpicParams): Error {
    const key = params?.issueKey ? ` '${params.issueKey}'` : "";

    if (error instanceof JiraNotFoundError) {
      return new Error(`❌ **Issue Not Found**\n\nIssue${key} not found.`);
    }
    if (error instanceof JiraPermissionError) {
      return new Error(`❌ **Permission Denied**\n\nCannot edit issue${key}.`);
    }
    if (error instanceof JiraApiError) {
      return new Error(`❌ **Remove Epic Failed**\n\n${error.message}`);
    }
    if (error instanceof Error) {
      return new Error(`❌ **Remove Epic Failed**\n\n${error.message}`);
    }
    return new Error("❌ **Remove Epic Failed**");
  }
}
