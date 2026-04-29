import { describe, expect, it } from "bun:test";
import { CustomFieldMetadataFormatter } from "@features/jira/issues/formatters/custom-field.formatter";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("CustomFieldMetadataFormatter", () => {
  it("formats metadata as markdown", () => {
    const formatter = new CustomFieldMetadataFormatter();
    const output = formatter.format({
      issueKey: "INV-1930",
      fieldQuery: "Инициатор",
      fields: [
        {
          fieldId: "customfield_10070",
          key: "customfield_10070",
          name: "Инициатор",
          required: false,
          operations: ["set"],
          schema: {
            type: "option",
            custom: "com.atlassian.jira.plugin.system.customfieldtypes:select",
            customId: 10070,
          },
          allowedValues: [{ id: "10026", value: "Роман" }],
        },
      ],
    });

    expect(output).toContain("# Custom Field Metadata");
    expect(output).toContain("Инициатор");
    expect(output).toContain("customfield_10070");
    expect(output).toContain("Роман");
  });
});
