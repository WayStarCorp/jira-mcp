/**
 * Add Issue Comment Handler Tests
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JiraApiError } from "@features/jira/client/errors";
import { AddIssueCommentHandler } from "@features/jira/issues/handlers/add-issue-comment.handler";
import type { Comment } from "@features/jira/issues/models/comment.models";
import type { AddIssueCommentUseCase } from "@features/jira/issues/use-cases/add-issue-comment.use-case";
import type { IssueCommentValidator } from "@features/jira/issues/validators";
import { setupTests } from "@test/utils/test-setup";

setupTests();

const mockComment: Comment = {
  id: "10001",
  body: "Implementation note",
  author: {
    accountId: "account-1",
    displayName: "John Developer",
  },
  created: "2026-04-28T18:00:00.000Z",
  updated: "2026-04-28T18:00:00.000Z",
};

describe("AddIssueCommentHandler", () => {
  let handler: AddIssueCommentHandler;
  let executeMock: ReturnType<typeof mock>;
  let validateMock: ReturnType<typeof mock>;

  beforeEach(() => {
    executeMock = mock(() => Promise.resolve(mockComment));
    validateMock = mock((params) => params);

    const mockUseCase: AddIssueCommentUseCase = {
      execute: executeMock,
    };

    const mockValidator: IssueCommentValidator = {
      validateGetCommentsParams: mock((params) => params),
      validateAddCommentParams: validateMock,
    };

    handler = new AddIssueCommentHandler(mockUseCase, mockValidator);
  });

  afterEach(() => {
    mock.restore();
  });

  it("should add issue comment and format result", async () => {
    const result = await handler.handle({
      issueKey: "PROJ-1",
      comment: "Implementation note",
    });

    expect(result.success).toBe(true);
    expect(result.data).toContain("Comment Added");
    expect(result.data).toContain("Implementation note");
    expect(executeMock).toHaveBeenCalledWith({
      issueKey: "PROJ-1",
      comment: "Implementation note",
    });
    expect(validateMock).toHaveBeenCalledWith({
      issueKey: "PROJ-1",
      comment: "Implementation note",
    });
  });

  it("should format api errors", async () => {
    executeMock.mockImplementation(() => {
      throw new JiraApiError(
        "Comment failed",
        "JIRA_API_ERROR",
        undefined,
        400,
      );
    });

    const result = await handler.handle({
      issueKey: "PROJ-1",
      comment: "Implementation note",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Comment Add Failed");
  });

  it("should reject invalid parameters", async () => {
    validateMock.mockImplementation(() => {
      throw new Error("Invalid add comment parameters");
    });

    const result = await handler.handle({
      issueKey: "PROJ-1",
      comment: "",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Comment Add Failed");
    expect(executeMock).not.toHaveBeenCalled();
  });
});
