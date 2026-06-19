import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JiraApiError } from "@features/jira/client/errors";
import { RemoveIssueEpicHandler } from "@features/jira/issues/handlers/remove-issue-epic.handler";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("RemoveIssueEpicHandler", () => {
  let handler: RemoveIssueEpicHandler;
  let executeMock: ReturnType<typeof mock>;

  beforeEach(() => {
    executeMock = mock(() =>
      Promise.resolve({
        issueKey: "PROJ-1",
        mode: "parent",
        action: "remove",
      } as never),
    );
    handler = new RemoveIssueEpicHandler({
      execute: executeMock,
    });
  });

  afterEach(() => {
    mock.restore();
  });

  it("returns formatted remove-epic result", async () => {
    const result = await handler.handle({ issueKey: "PROJ-1" });
    expect(result.success).toBe(true);
    expect(String(result.data)).toContain("PROJ-1");
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({ issueKey: "PROJ-1" }),
    );
  });

  it("rejects invalid issue key", async () => {
    const result = await handler.handle({ issueKey: "not-a-key" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid parameters/i);
  });

  it("wraps api errors", async () => {
    executeMock.mockImplementation(() => {
      throw JiraApiError.withStatusCode("Bad Request", 400);
    });
    const result = await handler.handle({ issueKey: "PROJ-1" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Remove Epic Failed");
  });
});
