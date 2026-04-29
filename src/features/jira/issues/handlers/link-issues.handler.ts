import { BaseToolHandler } from "@core/tools/tool-handler.class";
import { formatZodError } from "@core/utils/validation";
import {
  JiraApiError,
  JiraNotFoundError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { IssueLinkedFormatter } from "@features/jira/issues/formatters/issue-link.formatter";
import type { LinkIssuesUseCase } from "@features/jira/issues/use-cases/issue-link.use-case";
import { IssueLinkValidationError } from "@features/jira/issues/validators/errors";
import {
  type LinkIssuesParams,
  linkIssuesParamsSchema,
} from "@features/jira/issues/validators/issue-link.validator";

/**
 * Handler for creating Jira issue links.
 */
export class LinkIssuesHandler extends BaseToolHandler<
  LinkIssuesParams,
  string
> {
  private readonly formatter: IssueLinkedFormatter;

  constructor(private readonly linkIssuesUseCase: LinkIssuesUseCase) {
    super("JIRA", "Link Issues");
    this.formatter = new IssueLinkedFormatter();
  }

  protected async execute(params: LinkIssuesParams): Promise<string> {
    try {
      const validatedParams = this.validateParameters(params);
      this.logger.info(
        `Linking ${validatedParams.outwardIssueKey} to ${validatedParams.inwardIssueKey}`,
      );

      await this.linkIssuesUseCase.execute(validatedParams);
      return this.formatter.format(validatedParams);
    } catch (error) {
      this.logger.error(`Failed to link issues: ${error}`);
      throw this.enhanceError(error, params);
    }
  }

  private validateParameters(params: LinkIssuesParams): LinkIssuesParams {
    const result = linkIssuesParamsSchema.safeParse(params);

    if (!result.success) {
      throw new IssueLinkValidationError(
        `Invalid parameters: ${formatZodError(result.error)}`,
      );
    }

    return result.data;
  }

  private enhanceError(
    error: unknown,
    params?: Partial<LinkIssuesParams>,
  ): Error {
    const context =
      params?.outwardIssueKey && params?.inwardIssueKey
        ? ` (${params.outwardIssueKey} → ${params.inwardIssueKey})`
        : "";

    if (error instanceof JiraNotFoundError) {
      return new Error(
        `❌ **Issue Not Found**${context}\n\nOne of the issues was not found.\n\n**Solutions:**\n- Verify both issue keys exist\n- Use jira_get_issue to confirm`,
      );
    }

    if (error instanceof JiraPermissionError) {
      return new Error(
        `❌ **Permission Denied**${context}\n\nLink Issues permission required.\n\n**Solutions:**\n- Contact Jira administrator\n- Check project permissions`,
      );
    }

    if (error instanceof JiraApiError) {
      return new Error(
        `❌ **Link Failed**${context}\n\n${error.message}\n\n**Solutions:**\n- Use jira_get_issue_link_types to see valid linkTypeName values\n- Check inward/outward direction\n- Link may already exist`,
      );
    }

    if (error instanceof Error) {
      return new Error(
        `❌ **Link Failed**${context}\n\n${error.message}\n\n**Solutions:**\n- Use jira_get_issue_link_types to see available link types`,
      );
    }

    return new Error(
      "❌ **Unknown Error** — An unknown error occurred during issue linking.",
    );
  }
}
