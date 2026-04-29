import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JiraPermissionError } from "@features/jira/client/errors";
import { GetCustomFieldMetadataHandler } from "@features/jira/issues/handlers/get-custom-field-metadata.handler";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("GetCustomFieldMetadataHandler", () => {
  let handler: GetCustomFieldMetadataHandler;
  let executeMock: ReturnType<typeof mock>;

  beforeEach(() => {
    executeMock = mock(() =>
      Promise.resolve([
        {
          fieldId: "customfield_10070",
          key: "customfield_10070",
          name: "Инициатор",
          required: false,
          operations: ["set"],
          schema: { type: "option" },
          allowedValues: [{ id: "10026", value: "Роман" }],
        },
      ]),
    );

    handler = new GetCustomFieldMetadataHandler(
      {
        execute: executeMock,
      },
      {
        validateGetIssueCustomFieldMetadataParams: (params) => params,
      },
    );
  });

  afterEach(() => {
    mock.restore();
  });

  it("returns formatted metadata", async () => {
    const result = await handler.handle({
      issueKey: "INV-1930",
    });

    expect(result.success).toBe(true);
    expect(result.data).toContain("Custom Field Metadata");
    expect(result.data).toContain("Инициатор");
    expect(executeMock).toHaveBeenCalledTimes(1);
  });

  it("formats permission errors", async () => {
    executeMock.mockImplementation(() => {
      throw new JiraPermissionError("No permission");
    });

    const result = await handler.handle({
      issueKey: "INV-1930",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Permission Denied");
  });
});
