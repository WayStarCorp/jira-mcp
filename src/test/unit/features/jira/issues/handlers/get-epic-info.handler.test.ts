import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JiraApiError } from "@features/jira/client/errors";
import { GetEpicInfoHandler } from "@features/jira/issues/handlers/get-epic-info.handler";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("GetEpicInfoHandler", () => {
  let handler: GetEpicInfoHandler;
  let executeMock: ReturnType<typeof mock>;

  beforeEach(() => {
    executeMock = mock(() =>
      Promise.resolve({
        issue: {
          key: "PROJ-1",
          fields: {
            summary: "Hello",
            issuetype: { name: "Story" },
          },
        },
        resolvedRelation: null,
        resolveError: null,
        epicLinkValue: null,
        children: [],
        childrenNote: null,
        childrenListedFromParentOnly: false,
        treatsAsEpic: false,
        epicIssuetypeNameCompared: "Epic",
      } as never),
    );
    handler = new GetEpicInfoHandler({
      execute: executeMock,
    });
  });

  afterEach(() => {
    mock.restore();
  });

  it("returns epic info markdown", async () => {
    const result = await handler.handle({ issueKey: "PROJ-1" });
    expect(result.success).toBe(true);
    expect(result.data).toContain("# Epic / hierarchy info");
    expect(result.data).toContain("PROJ-1");
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({ issueKey: "PROJ-1" }),
    );
  });

  it("rejects invalid issue key", async () => {
    const result = await handler.handle({ issueKey: "invalid" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid parameters/i);
  });

  it("wraps api errors", async () => {
    executeMock.mockImplementation(() => {
      throw JiraApiError.withStatusCode("Forbidden", 403);
    });
    const result = await handler.handle({ issueKey: "PROJ-1" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("JIRA API Error");
  });
});
