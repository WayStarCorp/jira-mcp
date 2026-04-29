import type { StringFormatter } from "@features/jira/shared/formatters/formatter.interface";
import type { CustomFieldMetadata } from "../models/custom-field.models";

export interface CustomFieldMetadataFormatterInput {
  issueKey: string;
  fieldQuery?: string;
  fields: CustomFieldMetadata[];
}

/**
 * Formats issue custom field metadata for MCP responses.
 */
export class CustomFieldMetadataFormatter
  implements StringFormatter<CustomFieldMetadataFormatterInput>
{
  format(input: CustomFieldMetadataFormatterInput): string {
    const { issueKey, fieldQuery, fields } = input;

    if (fields.length === 0) {
      return [
        "# Custom Field Metadata",
        "",
        `**Issue:** ${issueKey}`,
        fieldQuery ? `**Filter:** \`${fieldQuery}\`` : undefined,
        "",
        "No custom fields were found for this issue.",
      ]
        .filter((line): line is string => line !== undefined)
        .join("\n");
    }

    const rows = fields.map(
      (field) =>
        `| \`${field.name}\` | \`${field.fieldId}\` | ${this.formatType(field)} | ${field.required ? "Yes" : "No"} | ${this.formatOperations(field.operations)} | ${field.allowedValues.length > 0 ? field.allowedValues.length : "—"} |`,
    );

    const details = fields.flatMap((field) => this.formatFieldDetails(field));

    return [
      "# Custom Field Metadata",
      "",
      `**Issue:** ${issueKey}`,
      `**Found:** ${fields.length} custom field${fields.length === 1 ? "" : "s"}`,
      fieldQuery ? `**Filter:** \`${fieldQuery}\`` : undefined,
      "",
      "Use `jira_update_issue` with either the field id or the field name. For option fields, plain text values are resolved when they match an allowed option.",
      "",
      "| Name | Field ID | Type | Required | Operations | Allowed Values |",
      "|---|---|---|---|---|---|",
      ...rows,
      "",
      ...details,
    ]
      .filter((line): line is string => line !== undefined)
      .join("\n");
  }

  private formatFieldDetails(field: CustomFieldMetadata): string[] {
    const lines = [
      `### ${field.name} (\`${field.fieldId}\`)`,
      "",
      `- **Type:** ${this.formatType(field)}`,
      `- **Custom type:** ${field.schema?.custom || "unknown"}`,
      `- **Required:** ${field.required ? "Yes" : "No"}`,
      `- **Operations:** ${this.formatOperations(field.operations)}`,
    ];

    if (field.allowedValues.length > 0) {
      const allowedValues = field.allowedValues
        .slice(0, 20)
        .map((candidate) => {
          const label =
            candidate.value || candidate.name || candidate.id || "unknown";
          const idSuffix = candidate.id ? ` (\`${candidate.id}\`)` : "";
          return `  - ${label}${idSuffix}`;
        });
      lines.push("", "- **Allowed values:**", ...allowedValues);
      if (field.allowedValues.length > 20) {
        lines.push(`  - ...and ${field.allowedValues.length - 20} more`);
      }
    }

    return lines;
  }

  private formatType(field: CustomFieldMetadata): string {
    return field.schema?.type || "unknown";
  }

  private formatOperations(operations: string[]): string {
    return operations.length > 0 ? operations.join(", ") : "—";
  }
}
