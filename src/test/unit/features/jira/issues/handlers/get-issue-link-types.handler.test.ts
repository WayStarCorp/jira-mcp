import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JiraPermissionError } from "@features/jira/client/errors";
import { GetIssueLinkTypesHandler } from "@features/jira/issues/handlers/get-issue-link-types.handler";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("GetIssueLinkTypesHandler", () => {
  let handler: GetIssueLinkTypesHandler;
  let executeMock: ReturnType<typeof mock>;

  beforeEach(() => {
    executeMock = mock(() =>
      Promise.resolve([
        {
          id: "10000",
          name: "Blocks",
          inward: "is blocked by",
          outward: "blocks",
        },
      ]),
    );

    handler = new GetIssueLinkTypesHandler({
      execute: executeMock,
    });
  });

  afterEach(() => {
    mock.restore();
  });

  it("returns available link types", async () => {
    const result = await handler.handle({});

    expect(result.success).toBe(true);
    expect(result.data).toContain("Issue Link Types");
    expect(result.data).toContain("Blocks");
    expect(executeMock).toHaveBeenCalledTimes(1);
  });

  it("formats permission errors", async () => {
    executeMock.mockImplementation(() => {
      throw new JiraPermissionError("No permission");
    });

    const result = await handler.handle({});

    expect(result.success).toBe(false);
    expect(result.error).toContain("Permission Denied");
  });
});
