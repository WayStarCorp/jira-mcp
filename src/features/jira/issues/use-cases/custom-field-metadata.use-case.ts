import { logger } from "@core/logging";
import type { CustomFieldMetadata } from "../models/custom-field.models";
import type { IssueCustomFieldRepository } from "../repositories/issue-custom-field.repository";
import type {
  GetIssueCustomFieldMetadataParams,
  ResolveCustomFieldsRequest,
} from "../validators/custom-field.validator";

/**
 * Use case for listing issue custom field metadata.
 */
export interface GetIssueCustomFieldMetadataUseCase {
  execute(
    params: GetIssueCustomFieldMetadataParams,
  ): Promise<CustomFieldMetadata[]>;
}

/**
 * Use case for resolving user-friendly custom field values to Jira payloads.
 */
export interface ResolveCustomFieldsUseCase {
  execute(
    request: ResolveCustomFieldsRequest,
  ): Promise<Record<string, unknown>>;
}

/**
 * Implementation of GetIssueCustomFieldMetadataUseCase.
 */
export class GetIssueCustomFieldMetadataUseCaseImpl
  implements GetIssueCustomFieldMetadataUseCase
{
  private readonly logger = logger;

  constructor(
    private readonly issueCustomFieldRepository: IssueCustomFieldRepository,
  ) {}

  async execute(
    params: GetIssueCustomFieldMetadataParams,
  ): Promise<CustomFieldMetadata[]> {
    this.logger.debug("Getting custom field metadata", {
      prefix: "JIRA:GetIssueCustomFieldMetadataUseCase",
      issueKey: params.issueKey,
      fieldQuery: params.fieldQuery,
    });

    const metadata =
      await this.issueCustomFieldRepository.getIssueCustomFieldMetadata(
        params.issueKey,
      );

    if (!params.fieldQuery) {
      return metadata;
    }

    const normalizedQuery = this.normalize(params.fieldQuery);
    const filtered = metadata.filter((field) => {
      return (
        this.normalize(field.fieldId).includes(normalizedQuery) ||
        this.normalize(field.name).includes(normalizedQuery) ||
        this.normalize(field.key).includes(normalizedQuery)
      );
    });

    return filtered;
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase();
  }
}

/**
 * Implementation of ResolveCustomFieldsUseCase.
 */
export class ResolveCustomFieldsUseCaseImpl
  implements ResolveCustomFieldsUseCase
{
  private readonly logger = logger;

  constructor(
    private readonly issueCustomFieldRepository: IssueCustomFieldRepository,
  ) {}

  async execute(
    request: ResolveCustomFieldsRequest,
  ): Promise<Record<string, unknown>> {
    this.logger.debug("Resolving custom fields", {
      prefix: "JIRA:ResolveCustomFieldsUseCase",
      issueKey: request.issueKey,
      customFieldCount: Object.keys(request.customFields).length,
    });

    const metadata =
      await this.issueCustomFieldRepository.getIssueCustomFieldMetadata(
        request.issueKey,
      );

    const resolvedFields: Record<string, unknown> = {};
    for (const [fieldIdentifier, value] of Object.entries(
      request.customFields,
    )) {
      const field = this.resolveField(
        metadata,
        request.issueKey,
        fieldIdentifier,
      );
      resolvedFields[field.fieldId] = this.resolveValue(field, value);
    }

    return resolvedFields;
  }

  private resolveField(
    metadata: CustomFieldMetadata[],
    issueKey: string,
    fieldIdentifier: string,
  ): CustomFieldMetadata {
    const normalized = this.normalize(fieldIdentifier);
    const matches = metadata.filter(
      (field) =>
        this.normalize(field.fieldId) === normalized ||
        this.normalize(field.name) === normalized ||
        this.normalize(field.key) === normalized,
    );

    if (matches.length === 0) {
      const available = metadata
        .slice(0, 12)
        .map((field) => `${field.name} (${field.fieldId})`)
        .join(", ");
      throw new Error(
        `Custom field '${fieldIdentifier}' was not found for issue '${issueKey}'. Use jira_get_issue_custom_field_metadata to inspect available fields. Available fields: ${available || "none"}.`,
      );
    }

    if (matches.length > 1) {
      const names = matches
        .map((field) => `${field.name} (${field.fieldId})`)
        .join(", ");
      throw new Error(
        `Custom field '${fieldIdentifier}' is ambiguous for issue '${issueKey}'. Matching fields: ${names}. Use the field id to disambiguate.`,
      );
    }

    return matches[0];
  }

  private resolveValue(field: CustomFieldMetadata, value: unknown): unknown {
    if (value == null) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.resolveSingleValue(field, item));
    }

    return this.resolveSingleValue(field, value);
  }

  private resolveSingleValue(
    field: CustomFieldMetadata,
    value: unknown,
  ): unknown {
    if (typeof value !== "string") {
      return value;
    }

    const normalized = this.normalize(value);
    const option = field.allowedValues.find((candidate) => {
      const candidateValues = [
        candidate.id,
        candidate.value,
        candidate.name,
      ].filter((entry): entry is string => typeof entry === "string");
      return candidateValues.some(
        (candidateValue) => this.normalize(candidateValue) === normalized,
      );
    });

    if (option) {
      if (option.id) {
        return { id: option.id };
      }

      if (option.value) {
        return { value: option.value };
      }
    }

    if (field.allowedValues.length > 0) {
      const allowedValues = field.allowedValues
        .slice(0, 12)
        .map((candidate) => candidate.value || candidate.name || candidate.id)
        .filter((entry): entry is string => Boolean(entry));
      throw new Error(
        `Value '${value}' is not valid for custom field '${field.name}'. Allowed values: ${allowedValues.join(", ")}.`,
      );
    }

    return value;
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase();
  }
}
