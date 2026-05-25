/**
 * Issue Comment Repository Tests
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { HttpClient } from "@features/jira/client/http/jira.http.types";
import type { Comment } from "@features/jira/issues/models/comment.models";
import { IssueCommentRepositoryImpl } from "@features/jira/issues/repositories/issue-comment.repository";
import { setupTests } from "@test/utils/test-setup";

setupTests();

type CommentRequest = {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body: {
    body: {
      type: string;
      version: number;
      content: Array<{
        type: string;
        content: Array<{
          type: string;
          text: string;
        }>;
      }>;
    };
  };
};

describe("IssueCommentRepositoryImpl", () => {
  let repository: IssueCommentRepositoryImpl;
  let sendRequestMock: ReturnType<typeof mock>;

  beforeEach(() => {
    sendRequestMock = mock();
    const httpClient = {
      sendRequest: sendRequestMock,
    } as unknown as HttpClient;

    repository = new IssueCommentRepositoryImpl(httpClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it("returns comments and total from paginated API response", async () => {
    sendRequestMock.mockResolvedValue({
      comments: [
        {
          id: "10001",
          body: "First",
          author: { accountId: "user-1", displayName: "User" },
          created: "2026-04-28T18:00:00.000Z",
          updated: "2026-04-28T18:00:00.000Z",
        },
      ],
      maxResults: 10,
      startAt: 0,
      total: 50,
    });

    const result = await repository.getIssueComments("PROJ-1", {
      issueKey: "PROJ-1",
      maxResults: 10,
      startAt: 0,
    });

    expect(result.comments).toHaveLength(1);
    expect(result.total).toBe(50);
    expect(sendRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "issue/PROJ-1/comment",
        method: "GET",
        queryParams: { maxResults: 10 },
      }),
    );
  });

  it("adds a comment using ADF body", async () => {
    const response: Comment = {
      id: "10001",
      body: "Line one\n\nLine two",
      author: {
        accountId: "user-1",
        displayName: "John Developer",
      },
      created: "2026-04-28T18:00:00.000Z",
      updated: "2026-04-28T18:00:00.000Z",
    };

    sendRequestMock.mockResolvedValue(response);

    const result = await repository.addIssueComment(
      "PROJ-1",
      "Line one\n\nLine two",
    );

    expect(result).toEqual(response);
    expect(sendRequestMock).toHaveBeenCalledTimes(1);

    const request = sendRequestMock.mock.calls[0][0] as CommentRequest;
    expect(request.endpoint).toBe("issue/PROJ-1/comment");
    expect(request.method).toBe("POST");
    expect(request.body.body).toEqual({
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Line one",
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Line two",
            },
          ],
        },
      ],
    });
  });
});
