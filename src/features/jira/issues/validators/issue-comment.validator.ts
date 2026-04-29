/**
 * Issue Comment Validator
 *
 * Validator for issue comment-related operations and parameters
 */

import { formatZodError } from "@core/utils/validation";
import { JIRA_MAX_COMMENT_LENGTH } from "@features/jira/shared/constants/jira-limits";
import { z } from "zod";
import { CommentParamsValidationError } from "./errors";
import { issueKeySchema } from "./issue-params.validator";

/**
 * Schema for get issue comments parameters
 * Implements progressive disclosure approach from creative phase decisions
 */
export const getIssueCommentsSchema = z.object({
  // Core parameters (required/essential)
  issueKey: issueKeySchema,

  // Basic options (most common use cases)
  maxComments: z.number().int().min(1).max(100).optional().default(10),

  // Advanced options (power user features)
  includeInternal: z.boolean().optional().default(false),
  orderBy: z.enum(["created", "updated"]).optional().default("created"),
  authorFilter: z.string().min(1).optional(),
  dateRange: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
});

/**
 * Schema for adding an issue comment.
 */
export const addIssueCommentSchema = z.object({
  issueKey: issueKeySchema,
  comment: z.string().min(1).max(JIRA_MAX_COMMENT_LENGTH),
});

/**
 * Type for get issue comments parameters
 */
export type GetIssueCommentsParams = z.infer<typeof getIssueCommentsSchema>;

export type AddIssueCommentParams = z.infer<typeof addIssueCommentSchema>;

/**
 * Interface for issue comment validator
 */
export interface IssueCommentValidator {
  /**
   * Validate get issue comments parameters
   *
   * @param params - Parameters to validate
   * @returns Validated parameters
   */
  validateGetCommentsParams(
    params: GetIssueCommentsParams,
  ): GetIssueCommentsParams;

  /**
   * Validate add issue comment parameters
   *
   * @param params - Parameters to validate
   * @returns Validated parameters
   */
  validateAddCommentParams(
    params: AddIssueCommentParams,
  ): AddIssueCommentParams;
}

/**
 * Implementation of IssueCommentValidator
 */
export class IssueCommentValidatorImpl implements IssueCommentValidator {
  /**
   * Validate parameters for getting issue comments
   *
   * @param params - Parameters to validate
   * @returns Validated parameters
   * @throws JiraApiError - If validation fails
   */
  public validateGetCommentsParams(
    params: GetIssueCommentsParams,
  ): GetIssueCommentsParams {
    const result = getIssueCommentsSchema.safeParse(params);

    if (!result.success) {
      const errorMessage = `Invalid issue comment parameters: ${formatZodError(
        result.error,
      )}`;
      throw new CommentParamsValidationError(errorMessage, { params });
    }

    return result.data;
  }

  /**
   * Validate parameters for adding an issue comment
   */
  public validateAddCommentParams(
    params: AddIssueCommentParams,
  ): AddIssueCommentParams {
    const result = addIssueCommentSchema.safeParse(params);

    if (!result.success) {
      const errorMessage = `Invalid add comment parameters: ${formatZodError(
        result.error,
      )}`;
      throw new CommentParamsValidationError(errorMessage, { params });
    }

    return result.data;
  }
}
