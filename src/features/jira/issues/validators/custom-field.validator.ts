import { formatZodError } from "@core/utils/validation";
import { z } from "zod";
import { CustomFieldMetadataParamsValidationError } from "./errors";
import { issueKeySchema } from "./issue-params.validator";

/**
 * Schema for listing custom field metadata on an issue.
 */
export const getIssueCustomFieldMetadataParamsSchema = z.object({
  issueKey: issueKeySchema,
  fieldQuery: z.string().min(1).max(255).optional(),
});

export type GetIssueCustomFieldMetadataParams = z.infer<
  typeof getIssueCustomFieldMetadataParamsSchema
>;

/**
 * Request for resolving user-friendly custom field values.
 */
export interface ResolveCustomFieldsRequest {
  issueKey: string;
  customFields: Record<string, unknown>;
}

/**
 * Validator contract for custom field tooling.
 */
export interface IssueCustomFieldValidator {
  validateGetIssueCustomFieldMetadataParams(
    params: GetIssueCustomFieldMetadataParams,
  ): GetIssueCustomFieldMetadataParams;
}

/**
 * Validator implementation for custom field tooling.
 */
export class IssueCustomFieldValidatorImpl
  implements IssueCustomFieldValidator
{
  validateGetIssueCustomFieldMetadataParams(
    params: GetIssueCustomFieldMetadataParams,
  ): GetIssueCustomFieldMetadataParams {
    const result = getIssueCustomFieldMetadataParamsSchema.safeParse(params);

    if (!result.success) {
      const errorMessage = `Invalid custom field metadata parameters: ${formatZodError(
        result.error,
      )}`;
      throw new CustomFieldMetadataParamsValidationError(errorMessage, {
        params,
      });
    }

    return result.data;
  }
}
