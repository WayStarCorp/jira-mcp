import { describe, expect, it } from "bun:test";
import { getIssueCustomFieldMetadataParamsSchema } from "@features/jira/issues/validators/custom-field.validator";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("custom field validator schema", () => {
  it("accepts a valid issue key", () => {
    const result = getIssueCustomFieldMetadataParamsSchema.safeParse({
      issueKey: "INV-1930",
    });

    expect(result.success).toBe(true);
  });

  it("accepts optional field query", () => {
    const result = getIssueCustomFieldMetadataParamsSchema.safeParse({
      issueKey: "INV-1930",
      fieldQuery: "Инициатор",
    });

    expect(result.success).toBe(true);
  });
});
