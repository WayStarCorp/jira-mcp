import { logger } from "@core/logging";
import type { HttpClient } from "@features/jira/client/http/jira.http.types";
import type {
  CustomFieldAllowedValue,
  CustomFieldMetadata,
  CustomFieldSchema,
} from "../models/custom-field.models";

interface JiraEditMetaField {
  key?: string;
  name?: string;
  required?: boolean;
  operations?: string[];
  schema?: CustomFieldSchema;
  allowedValues?: CustomFieldAllowedValue[];
  custom?: boolean;
}

interface JiraEditMetaResponse {
  fields?: Record<string, JiraEditMetaField>;
}

/**
 * Repository interface for issue custom field metadata operations.
 */
export interface IssueCustomFieldRepository {
  getIssueCustomFieldMetadata(issueKey: string): Promise<CustomFieldMetadata[]>;
}

/**
 * Implementation of IssueCustomFieldRepository.
 */
export class IssueCustomFieldRepositoryImpl
  implements IssueCustomFieldRepository
{
  private readonly logger = logger;

  constructor(private readonly httpClient: HttpClient) {}

  async getIssueCustomFieldMetadata(
    issueKey: string,
  ): Promise<CustomFieldMetadata[]> {
    this.logger.debug(`Getting custom field metadata for issue: ${issueKey}`, {
      prefix: "JIRA:IssueCustomFieldRepository",
    });

    const response = await this.httpClient.sendRequest<JiraEditMetaResponse>({
      endpoint: `issue/${issueKey}/editmeta`,
      method: "GET",
    });

    const metadata = Object.entries(response.fields ?? {})
      .filter(([fieldId, field]) => this.isCustomField(fieldId, field))
      .map(([fieldId, field]) => this.toCustomFieldMetadata(fieldId, field));

    this.logger.debug(
      `Retrieved ${metadata.length} custom fields for issue: ${issueKey}`,
      {
        prefix: "JIRA:IssueCustomFieldRepository",
      },
    );

    return metadata;
  }

  private isCustomField(fieldId: string, field: JiraEditMetaField): boolean {
    return fieldId.startsWith("customfield_") || field.custom === true;
  }

  private toCustomFieldMetadata(
    fieldId: string,
    field: JiraEditMetaField,
  ): CustomFieldMetadata {
    return {
      fieldId,
      key: field.key ?? fieldId,
      name: field.name ?? fieldId,
      required: Boolean(field.required),
      operations: field.operations ?? [],
      schema: field.schema,
      allowedValues: field.allowedValues ?? [],
    };
  }
}
