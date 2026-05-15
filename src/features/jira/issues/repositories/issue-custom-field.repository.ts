import { logger } from "@core/logging";
import type { HttpClient } from "@features/jira/client/http/jira.http.types";
import type {
  CustomFieldAllowedValue,
  CustomFieldMetadata,
  IssueEditMetaField,
} from "../models/custom-field.models";

interface JiraEditMetaField extends IssueEditMetaField {
  allowedValues?: CustomFieldAllowedValue[];
}

interface JiraEditMetaResponse {
  fields?: Record<string, JiraEditMetaField>;
}

/**
 * Repository interface for issue custom field metadata operations.
 */
export interface IssueCustomFieldRepository {
  getIssueCustomFieldMetadata(issueKey: string): Promise<CustomFieldMetadata[]>;
  getIssueEditMetaFields(
    issueKey: string,
  ): Promise<Record<string, IssueEditMetaField>>;
}

/**
 * Implementation of IssueCustomFieldRepository.
 */
export class IssueCustomFieldRepositoryImpl
  implements IssueCustomFieldRepository
{
  private readonly logger = logger;

  constructor(private readonly httpClient: HttpClient) {}

  async getIssueEditMetaFields(
    issueKey: string,
  ): Promise<Record<string, IssueEditMetaField>> {
    this.logger.debug(`Getting edit meta fields for issue: ${issueKey}`, {
      prefix: "JIRA:IssueCustomFieldRepository",
    });

    const response = await this.httpClient.sendRequest<JiraEditMetaResponse>({
      endpoint: `issue/${issueKey}/editmeta`,
      method: "GET",
    });

    return response.fields ?? {};
  }

  async getIssueCustomFieldMetadata(
    issueKey: string,
  ): Promise<CustomFieldMetadata[]> {
    this.logger.debug(`Getting custom field metadata for issue: ${issueKey}`, {
      prefix: "JIRA:IssueCustomFieldRepository",
    });

    const fields = await this.getIssueEditMetaFields(issueKey);

    const metadata = Object.entries(fields)
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
