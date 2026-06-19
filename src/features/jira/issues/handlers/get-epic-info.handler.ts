/**
 * Get Epic Info Handler — epic / hierarchy diagnostics for an issue.
 */
import { BaseToolHandler } from "@core/tools/tool-handler.class";
import { formatZodError } from "@core/utils/validation";
import {
  JiraApiError,
  JiraNotFoundError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { EpicInfoFormatter } from "@features/jira/issues/formatters/epic-info.formatter";
import type { GetEpicInfoUseCase } from "@features/jira/issues/use-cases/get-epic-info.use-case";
import {
  type GetEpicInfoParams,
  getEpicInfoParamsSchema,
} from "@features/jira/issues/validators/epic.validator";

export class GetEpicInfoHandler extends BaseToolHandler<
  GetEpicInfoParams,
  string
> {
  private readonly formatter = new EpicInfoFormatter();

  constructor(private readonly getEpicInfoUseCase: GetEpicInfoUseCase) {
    super("JIRA", "Get Epic Info");
  }

  protected async execute(params: GetEpicInfoParams): Promise<string> {
    try {
      const validated = this.validate(params);
      const result = await this.getEpicInfoUseCase.execute(validated);
      return this.formatter.format(result);
    } catch (error) {
      throw this.enhanceError(error, params);
    }
  }

  private validate(params: GetEpicInfoParams): GetEpicInfoParams {
    const result = getEpicInfoParamsSchema.safeParse(params);
    if (!result.success) {
      throw JiraApiError.withStatusCode(
        `Invalid parameters: ${formatZodError(result.error)}`,
        400,
      );
    }
    return result.data;
  }

  private enhanceError(error: unknown, params?: GetEpicInfoParams): Error {
    const key = params?.issueKey ? ` '${params.issueKey}'` : "";
    if (error instanceof JiraNotFoundError) {
      return new Error(
        `❌ **Issue Not Found**\n\nIssue${key} was not found.\n\nUse jira_get_issue to verify the key.`,
      );
    }
    if (error instanceof JiraPermissionError) {
      return new Error(
        `❌ **Permission Denied**\n\nCannot read issue${key}.\n\nCheck Browse / Edit permissions.`,
      );
    }
    if (error instanceof JiraApiError) {
      return new Error(`❌ **JIRA API Error**\n\n${error.message}`);
    }
    if (error instanceof Error) {
      return new Error(`❌ **Get Epic Info Failed**\n\n${error.message}`);
    }
    return new Error("❌ **Unknown Error**\n\nGet epic info failed.");
  }
}
