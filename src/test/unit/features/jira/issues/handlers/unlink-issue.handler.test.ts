import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JiraApiError } from "@features/jira/client/errors";
import { UnlinkIssueHandler } from "@features/jira/issues/handlers/unlink-issue.handler";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("UnlinkIssueHandler", () => {
  let handler: UnlinkIssueHandler;
  let executeMock: ReturnType<typeof mock>;

  beforeEach(() => {
    executeMock = mock(() => Promise.resolve(undefined));
    handler = new UnlinkIssueHandler({
      execute: executeMock,
    });
  });

  afterEach(() => {
    mock.restore();
  });

  it("unlinks by link id", async () => {
    const result = await handler.handle({ linkId: "10001" });
    expect(result.success).toBe(true);
    expect(executeMock).toHaveBeenCalledWith({ linkId: "10001" });
  });

  it("wraps api errors", async () => {
    executeMock.mockImplementation(() => {
      throw JiraApiError.withStatusCode("Bad Request", 400);
    });
    const result = await handler.handle({ linkId: "10001" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unlink Failed");
  });
});
