import { BaseToolHandler } from "@core/tools/tool-handler.class";
import { formatZodError } from "@core/utils/validation";
import {
  JiraApiError,
  JiraNotFoundError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { IssueLinkTypesFormatter } from "@features/jira/issues/formatters/issue-link.formatter";
import type { GetIssueLinkTypesUseCase } from "@features/jira/issues/use-cases/issue-link.use-case";
import { IssueLinkValidationError } from "@features/jira/issues/validators/errors";
import {
  type GetIssueLinkTypesParams,
  getIssueLinkTypesParamsSchema,
} from "@features/jira/issues/validators/issue-link.validator";

/**
 * Handler for listing Jira issue link types.
 */
export class GetIssueLinkTypesHandler extends BaseToolHandler<
  GetIssueLinkTypesParams,
  string
> {
  private readonly formatter: IssueLinkTypesFormatter;

  constructor(
    private readonly getIssueLinkTypesUseCase: GetIssueLinkTypesUseCase,
  ) {
    super("JIRA", "Get Issue Link Types");
    this.formatter = new IssueLinkTypesFormatter();
  }

  protected async execute(params: GetIssueLinkTypesParams): Promise<string> {
    try {
      this.validateParameters(params);
      this.logger.info("Getting issue link types");

      const types = await this.getIssueLinkTypesUseCase.execute();
      return this.formatter.format(types);
    } catch (error) {
      this.logger.error(`Failed to get issue link types: ${error}`);
      throw this.enhanceError(error);
    }
  }

  private validateParameters(
    params: GetIssueLinkTypesParams,
  ): GetIssueLinkTypesParams {
    const result = getIssueLinkTypesParamsSchema.safeParse(params);

    if (!result.success) {
      throw new IssueLinkValidationError(
        `Invalid parameters: ${formatZodError(result.error)}`,
      );
    }

    return result.data;
  }

  private enhanceError(error: unknown): Error {
    if (error instanceof JiraNotFoundError) {
      return new Error(
        "❌ **Not Found**\n\nUnable to retrieve issue link types.\n\n**Solutions:**\n- Check Jira connection\n- Verify API access",
      );
    }

    if (error instanceof JiraPermissionError) {
      return new Error(
        "❌ **Permission Denied**\n\nCannot access issue link types.\n\n**Solutions:**\n- Check Jira permissions",
      );
    }

    if (error instanceof JiraApiError) {
      return new Error(`❌ **Link Types Failed**\n\n${error.message}`);
    }

    if (error instanceof Error) {
      return new Error(`❌ **Link Types Failed**\n\n${error.message}`);
    }

    return new Error("❌ **Unknown Error**");
  }
}
