import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JiraApiError } from "@features/jira/client/errors";
import { ChangeIssueTypeHandler } from "@features/jira/issues/handlers/change-issue-type.handler";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("ChangeIssueTypeHandler", () => {
  let handler: ChangeIssueTypeHandler;
  let executeMock: ReturnType<typeof mock>;

  beforeEach(() => {
    executeMock = mock(() =>
      Promise.resolve({
        kind: "validated",
        issueKey: "PROJ-1",
        issuetypeEditable: true,
        operations: ["set"],
      } as never),
    );
    handler = new ChangeIssueTypeHandler({
      execute: executeMock,
    });
  });

  afterEach(() => {
    mock.restore();
  });

  it("returns formatted validate-only result", async () => {
    const result = await handler.handle({
      issueKey: "PROJ-1",
      validateOnly: true,
    });
    expect(result.success).toBe(true);
    expect(result.data).toContain("# Issue type — validate only");
    expect(executeMock).toHaveBeenCalled();
  });

  it("returns formatted updated issue result", async () => {
    executeMock.mockImplementation(() =>
      Promise.resolve({
        kind: "updated",
        issue: { key: "PROJ-2", fields: { summary: "S" } },
      } as never),
    );
    const result = await handler.handle({
      issueKey: "PROJ-2",
      issueTypeName: "Bug",
    });
    expect(result.success).toBe(true);
    expect(result.data).toContain("# Issue type updated");
  });

  it("rejects invalid params (missing type when not validate-only)", async () => {
    const result = await handler.handle({
      issueKey: "PROJ-1",
      validateOnly: false,
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
      issueTypeName: "Story",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Change Issue Type Failed");
  });
});
