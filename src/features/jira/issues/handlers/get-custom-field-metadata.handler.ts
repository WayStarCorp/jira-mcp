import { BaseToolHandler } from "@core/tools/tool-handler.class";
import {
  JiraApiError,
  JiraNotFoundError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { CustomFieldMetadataFormatter } from "@features/jira/issues/formatters/custom-field.formatter";
import type { GetIssueCustomFieldMetadataUseCase } from "@features/jira/issues/use-cases/custom-field-metadata.use-case";
import type {
  GetIssueCustomFieldMetadataParams,
  IssueCustomFieldValidator,
} from "@features/jira/issues/validators/custom-field.validator";

/**
 * Handler for listing custom field metadata for a Jira issue.
 */
export class GetCustomFieldMetadataHandler extends BaseToolHandler<
  GetIssueCustomFieldMetadataParams,
  string
> {
  private readonly formatter: CustomFieldMetadataFormatter;

  constructor(
    private readonly getIssueCustomFieldMetadataUseCase: GetIssueCustomFieldMetadataUseCase,
    private readonly issueCustomFieldValidator: IssueCustomFieldValidator,
  ) {
    super("JIRA", "Get Custom Field Metadata");
    this.formatter = new CustomFieldMetadataFormatter();
  }

  protected async execute(
    params: GetIssueCustomFieldMetadataParams,
  ): Promise<string> {
    try {
      const validatedParams = this.validateParameters(params);
      this.logger.info(
        `Getting custom field metadata for issue: ${validatedParams.issueKey}`,
      );

      const fields =
        await this.getIssueCustomFieldMetadataUseCase.execute(validatedParams);

      return this.formatter.format({
        issueKey: validatedParams.issueKey,
        fieldQuery: validatedParams.fieldQuery,
        fields,
      });
    } catch (error) {
      this.logger.error(`Failed to get custom field metadata: ${error}`);
      throw this.enhanceError(error, params.issueKey);
    }
  }

  private validateParameters(
    params: GetIssueCustomFieldMetadataParams,
  ): GetIssueCustomFieldMetadataParams {
    return this.issueCustomFieldValidator.validateGetIssueCustomFieldMetadataParams(
      params,
    );
  }

  private enhanceError(error: unknown, issueKey?: string): Error {
    const context = issueKey ? ` for issue '${issueKey}'` : "";

    if (error instanceof JiraNotFoundError) {
      return new Error(
        `❌ **Issue Not Found**${context}\n\nUnable to retrieve custom field metadata.\n\n**Solutions:**\n- Verify the issue key is correct\n- Check that the issue exists and you can view it`,
      );
    }

    if (error instanceof JiraPermissionError) {
      return new Error(
        `❌ **Permission Denied**${context}\n\nYou don't have permission to read issue metadata.\n\n**Solutions:**\n- Check your Jira permissions\n- Verify you can view the issue`,
      );
    }

    if (error instanceof JiraApiError) {
      return new Error(
        `❌ **Custom Field Metadata Failed**${context}\n\n${error.message}\n\n**Solutions:**\n- Try again with a valid issue key\n- Check your Jira connection`,
      );
    }

    if (error instanceof Error) {
      return new Error(
        `❌ **Custom Field Metadata Failed**${context}\n\n${error.message}`,
      );
    }

    return new Error(
      `❌ **Unknown Error**\n\nAn unknown error occurred while reading custom field metadata${context}.`,
    );
  }
}
