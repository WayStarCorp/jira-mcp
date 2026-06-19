import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JiraApiError } from "@features/jira/client/errors";
import { SetIssueEpicHandler } from "@features/jira/issues/handlers/set-issue-epic.handler";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("SetIssueEpicHandler", () => {
  let handler: SetIssueEpicHandler;
  let executeMock: ReturnType<typeof mock>;

  beforeEach(() => {
    executeMock = mock(() =>
      Promise.resolve({
        issueKey: "PROJ-1",
        epicIssueKey: "PROJ-99",
        mode: "parent",
        action: "set",
      } as never),
    );
    handler = new SetIssueEpicHandler({
      execute: executeMock,
    });
  });

  afterEach(() => {
    mock.restore();
  });

  it("returns formatted set-epic result", async () => {
    const result = await handler.handle({
      issueKey: "PROJ-1",
      epicIssueKey: "PROJ-99",
    });
    expect(result.success).toBe(true);
    expect(result.data).toBeTruthy();
    expect(String(result.data)).toContain("PROJ-1");
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        issueKey: "PROJ-1",
        epicIssueKey: "PROJ-99",
      }),
    );
  });

  it("rejects invalid params", async () => {
    const result = await handler.handle({
      issueKey: "bad-key",
      epicIssueKey: "PROJ-99",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid parameters/i);
  });

  it("wraps api errors", async () => {
    executeMock.mockImplementation(() => {
      throw JiraApiError.withStatusCode("Bad Request", 400);
    });
    const result = await handler.handle({
      issueKey: "PROJ-1",
      epicIssueKey: "PROJ-99",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Set Epic Failed");
  });
});
