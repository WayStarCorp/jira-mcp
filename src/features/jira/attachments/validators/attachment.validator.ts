/**
 * Attachment Validator
 *
 * Validator for attachment-related MCP tool parameters
 */

import { formatZodError } from "@core/utils/validation";
import { JiraApiError } from "@features/jira/client/errors";
import {
  DEFAULT_MAX_BYTES,
  HARD_MAX_BYTES,
} from "@features/jira/client/http/attachment-url.validator";
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
 * Schema for jira_download_attachment parameters
 */
export const downloadAttachmentParamsSchema = z.object({
  attachmentId: z.string().min(1, "attachmentId is required"),
  maxBytes: z
    .number()
    .int()
    .positive()
    .optional()
    .default(DEFAULT_MAX_BYTES)
    .transform((value) => Math.min(value, HARD_MAX_BYTES)),
});

export type DownloadAttachmentParamsInput = z.input<
  typeof downloadAttachmentParamsSchema
>;

export type DownloadAttachmentParams = z.output<
  typeof downloadAttachmentParamsSchema
>;

/**
 * Interface for attachment validator
 */
export interface AttachmentValidator {
  validateGetIssueAttachmentsParams(
    params: GetIssueAttachmentsParamsInput,
  ): GetIssueAttachmentsParams;
  validateDownloadAttachmentParams(
    params: DownloadAttachmentParamsInput,
  ): DownloadAttachmentParams;
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

  public validateDownloadAttachmentParams(
    params: DownloadAttachmentParamsInput,
  ): DownloadAttachmentParams {
    const result = downloadAttachmentParamsSchema.safeParse(params);

    if (!result.success) {
      const errorMessage = `Invalid attachment parameters: ${formatZodError(
        result.error,
      )}`;
      throw JiraApiError.withStatusCode(errorMessage, 400);
    }

    return result.data;
  }
}
