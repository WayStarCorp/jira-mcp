import { BaseToolHandler } from "@core/tools/tool-handler.class";
import { formatZodError } from "@core/utils/validation";
import {
  JiraApiError,
  JiraNotFoundError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { EpicRelationActionFormatter } from "@features/jira/issues/formatters/epic-relation-action.formatter";
import type { SetIssueEpicUseCase } from "@features/jira/issues/use-cases/set-issue-epic.use-case";
import {
  type SetIssueEpicParams,
  setIssueEpicParamsSchema,
} from "@features/jira/issues/validators/epic.validator";

export class SetIssueEpicHandler extends BaseToolHandler<
  SetIssueEpicParams,
  string
> {
  private readonly formatter = new EpicRelationActionFormatter();

  constructor(private readonly setIssueEpicUseCase: SetIssueEpicUseCase) {
    super("JIRA", "Set Issue Epic");
  }

  protected async execute(params: SetIssueEpicParams): Promise<string> {
    try {
      const validated = this.validate(params);
      const result = await this.setIssueEpicUseCase.execute(validated);
      return this.formatter.format(result);
    } catch (error) {
      throw this.enhanceError(error, params);
    }
  }

  private validate(params: SetIssueEpicParams): SetIssueEpicParams {
    const result = setIssueEpicParamsSchema.safeParse(params);
    if (!result.success) {
      throw JiraApiError.withStatusCode(
        `Invalid parameters: ${formatZodError(result.error)}`,
        400,
      );
    }
    return result.data;
  }

  private enhanceError(error: unknown, params?: SetIssueEpicParams): Error {
    const ctx = params
      ? ` (${params.issueKey} → epic ${params.epicIssueKey})`
      : "";

    if (error instanceof JiraNotFoundError) {
      return new Error(
        `❌ **Issue Not Found**${ctx}\n\nVerify child and epic keys with jira_get_issue.`,
      );
    }
    if (error instanceof JiraPermissionError) {
      return new Error(
        `❌ **Permission Denied**${ctx}\n\nEdit issues permission required.`,
      );
    }
    if (error instanceof JiraApiError) {
      return new Error(
        `❌ **Set Epic Failed**${ctx}\n\n${error.message}\n\nIf Jira rejected **parent**, try \`relationMode:"epicLink"\` and \`epicFieldId\`, or inspect fields with jira_get_issue_custom_field_metadata.`,
      );
    }
    if (error instanceof Error) {
      return new Error(`❌ **Set Epic Failed**${ctx}\n\n${error.message}`);
    }
    return new Error(`❌ **Set Epic Failed**${ctx}`);
  }
}
