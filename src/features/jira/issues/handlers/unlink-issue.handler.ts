import { BaseToolHandler } from "@core/tools/tool-handler.class";
import { formatZodError } from "@core/utils/validation";
import {
  JiraApiError,
  JiraNotFoundError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { IssueUnlinkedFormatter } from "@features/jira/issues/formatters/issue-link.formatter";
import type { UnlinkIssueUseCase } from "@features/jira/issues/use-cases/unlink-issue.use-case";
import {
  unlinkIssueParamsSchema,
  type UnlinkIssueParams,
} from "@features/jira/issues/validators/issue-link.validator";

export class UnlinkIssueHandler extends BaseToolHandler<
  UnlinkIssueParams,
  string
> {
  private readonly formatter = new IssueUnlinkedFormatter();

  constructor(private readonly unlinkIssueUseCase: UnlinkIssueUseCase) {
    super("JIRA", "Unlink Issue");
  }

  protected async execute(params: UnlinkIssueParams): Promise<string> {
    try {
      const validated = this.validate(params);
      await this.unlinkIssueUseCase.execute(validated);
      return this.formatter.format(validated.linkId);
    } catch (error) {
      throw this.enhanceError(error, params);
    }
  }

  private validate(params: UnlinkIssueParams): UnlinkIssueParams {
    const result = unlinkIssueParamsSchema.safeParse(params);
    if (!result.success) {
      throw JiraApiError.withStatusCode(
        `Invalid parameters: ${formatZodError(result.error)}`,
        400,
      );
    }
    return result.data;
  }

  private enhanceError(error: unknown, params?: UnlinkIssueParams): Error {
    const id = params?.linkId ? ` '${params.linkId}'` : "";

    if (error instanceof JiraNotFoundError) {
      return new Error(
        `❌ **Link Not Found**\n\nIssue link${id} was not found or already deleted.`,
      );
    }
    if (error instanceof JiraPermissionError) {
      return new Error(
        `❌ **Permission Denied**\n\nLink Issues permission required to delete link${id}.`,
      );
    }
    if (error instanceof JiraApiError) {
      return new Error(`❌ **Unlink Failed**\n\n${error.message}`);
    }
    if (error instanceof Error) {
      return new Error(`❌ **Unlink Failed**\n\n${error.message}`);
    }
    return new Error("❌ **Unlink Failed**");
  }
}
