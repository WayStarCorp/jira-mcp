/**
 * Jira custom field metadata models
 */

export interface CustomFieldAllowedValue {
  id?: string;
  value?: string;
  name?: string;
  self?: string;
  [key: string]: unknown;
}

export interface CustomFieldSchema {
  type?: string;
  custom?: string;
  customId?: number;
}

/**
 * One field entry from Jira `GET issue/{key}/editmeta` (system or custom).
 */
export interface IssueEditMetaField {
  key?: string;
  name?: string;
  required?: boolean;
  operations?: string[];
  schema?: CustomFieldSchema;
  custom?: boolean;
}

export interface CustomFieldMetadata {
  fieldId: string;
  key: string;
  name: string;
  required: boolean;
  operations: string[];
  schema?: CustomFieldSchema;
  allowedValues: CustomFieldAllowedValue[];
}
