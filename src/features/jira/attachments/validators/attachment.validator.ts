/**
 * Attachment Validator
 *
 * Validator for attachment-related MCP tool parameters
 */

import { formatZodError } from "@core/utils/validation";
import { JiraApiError } from "@features/jira/client/errors";
import { issueKeySchema } from "@features/jira/issues/validators/issue-params.validator";
import { z } from "zod";

/**
 * Schema for jira_get_issue_attachments parameters
 */
export const getIssueAttachmentsParamsSchema = z.object({
  issueKey: issueKeySchema,
});

export type GetIssueAttachmentsParamsInput = z.input<
  typeof getIssueAttachmentsParamsSchema
>;

export type GetIssueAttachmentsParams = z.output<
  typeof getIssueAttachmentsParamsSchema
>;

/**
 * Interface for attachment validator
 */
export interface AttachmentValidator {
  validateGetIssueAttachmentsParams(
    params: GetIssueAttachmentsParamsInput,
  ): GetIssueAttachmentsParams;
}

/**
 * Implementation of AttachmentValidator
 */
export class AttachmentValidatorImpl implements AttachmentValidator {
  public validateGetIssueAttachmentsParams(
    params: GetIssueAttachmentsParamsInput,
  ): GetIssueAttachmentsParams {
    const result = getIssueAttachmentsParamsSchema.safeParse(params);

    if (!result.success) {
      const errorMessage = `Invalid attachment parameters: ${formatZodError(
        result.error,
      )}`;
      throw JiraApiError.withStatusCode(errorMessage, 400);
    }

    return result.data;
  }
}
