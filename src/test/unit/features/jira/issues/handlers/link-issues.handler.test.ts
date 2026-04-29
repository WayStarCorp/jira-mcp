import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JiraApiError } from "@features/jira/client/errors";
import { LinkIssuesHandler } from "@features/jira/issues/handlers/link-issues.handler";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("LinkIssuesHandler", () => {
  let handler: LinkIssuesHandler;
  let executeMock: ReturnType<typeof mock>;

  beforeEach(() => {
    executeMock = mock(() => Promise.resolve(undefined));

    handler = new LinkIssuesHandler({
      execute: executeMock,
    });
  });

  afterEach(() => {
    mock.restore();
  });

  it("links issues successfully", async () => {
    const result = await handler.handle({
      inwardIssueKey: "PROJ-200",
      outwardIssueKey: "PROJ-100",
      linkTypeName: "Blocks",
      comment: "Link comment",
    });

    expect(result.success).toBe(true);
    expect(result.data).toContain("Issue Linked");
    expect(result.data).toContain("Blocks");
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        inwardIssueKey: "PROJ-200",
        outwardIssueKey: "PROJ-100",
        linkTypeName: "Blocks",
        comment: "Link comment",
      }),
    );
  });

  it("rejects linking an issue to itself", async () => {
    const result = await handler.handle({
      inwardIssueKey: "PROJ-100",
      outwardIssueKey: "PROJ-100",
      linkTypeName: "Blocks",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot link an issue to itself");
  });

  it("formats api errors with link type guidance", async () => {
    executeMock.mockImplementation(() => {
      throw JiraApiError.withStatusCode("Bad Request", 400);
    });

    const result = await handler.handle({
      inwardIssueKey: "PROJ-200",
      outwardIssueKey: "PROJ-100",
      linkTypeName: "Blocks",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Link Failed");
    expect(result.error).toContain("jira_get_issue_link_types");
  });
});
