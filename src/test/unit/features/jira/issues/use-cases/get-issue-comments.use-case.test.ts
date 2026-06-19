import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { Comment } from "@features/jira/issues/models/comment.models";
import type { IssueCommentRepository } from "@features/jira/issues/repositories/issue-comment.repository";
import type { IssueRepository } from "@features/jira/issues/repositories/issue.repository";
import { GetIssueCommentsUseCaseImpl } from "@features/jira/issues/use-cases/get-issue-comments.use-case";
import type { IssueCommentValidator } from "@features/jira/issues/validators";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("GetIssueCommentsUseCaseImpl", () => {
  const mockComments: Comment[] = [
    {
      id: "10001",
      self: "https://example.atlassian.net/rest/api/3/issue/1/comment/10001",
      author: { displayName: "User", accountId: "u1" },
      body: "Comment text",
      created: "2026-05-20T10:00:00.000Z",
      updated: "2026-05-20T10:00:00.000Z",
    },
  ];

  let getIssueCommentsMock: ReturnType<typeof mock>;
  let getIssueMock: ReturnType<typeof mock>;
  let validateMock: ReturnType<typeof mock>;
  let useCase: GetIssueCommentsUseCaseImpl;

  beforeEach(() => {
    getIssueCommentsMock = mock(() =>
      Promise.resolve({ comments: mockComments, total: mockComments.length }),
    );
    getIssueMock = mock(() =>
      Promise.resolve({
        id: "1",
        key: "SUPP-79",
        self: null,
        fields: {
          attachment: [
            {
              id: "10042",
              filename: "screenshot.png",
              mimeType: "image/png",
              size: 250_880,
              created: "2026-05-20T10:00:00.000Z",
              author: { displayName: "user@example.com" },
              content:
                "https://example.atlassian.net/secure/attachment/10042/file.png",
            },
          ],
        },
      }),
    );
    validateMock = mock((params: { issueKey: string }) => params);

    useCase = new GetIssueCommentsUseCaseImpl(
      {
        getIssueComments: getIssueCommentsMock,
      } as unknown as IssueCommentRepository,
      { getIssue: getIssueMock } as unknown as IssueRepository,
      {
        validateGetCommentsParams: validateMock,
      } as unknown as IssueCommentValidator,
    );
  });

  test("fetches comments and issue attachments in parallel", async () => {
    const params = {
      issueKey: "SUPP-79",
      maxComments: 10,
      orderBy: "created" as const,
      includeInternal: false,
    };
    const result = await useCase.execute(params);

    expect(validateMock).toHaveBeenCalled();
    expect(getIssueCommentsMock).toHaveBeenCalledWith("SUPP-79", {
      issueKey: "SUPP-79",
      maxResults: 10,
      startAt: 0,
      orderBy: "created",
    });
    expect(getIssueMock).toHaveBeenCalledWith("SUPP-79");
    expect(result.comments).toEqual(mockComments);
    expect(result.totalComments).toBe(1);
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0]).toMatchObject({
      id: "10042",
      filename: "screenshot.png",
      mimeType: "image/png",
      isImage: true,
    });
  });

  test("returns empty attachments when issue has no attachment field", async () => {
    getIssueMock.mockImplementation(() =>
      Promise.resolve({
        id: "1",
        key: "SUPP-80",
        self: null,
        fields: {},
      }),
    );

    const result = await useCase.execute({
      issueKey: "SUPP-80",
      maxComments: 10,
      orderBy: "created",
      includeInternal: false,
    });

    expect(result.comments).toEqual(mockComments);
    expect(result.totalComments).toBe(1);
    expect(result.attachments).toEqual([]);
  });

  test("returns totalComments from repository page, not displayed count", async () => {
    getIssueCommentsMock.mockImplementation(() =>
      Promise.resolve({ comments: mockComments, total: 50 }),
    );

    const result = await useCase.execute({
      issueKey: "SUPP-79",
      maxComments: 10,
      orderBy: "created",
      includeInternal: false,
    });

    expect(result.comments).toHaveLength(1);
    expect(result.totalComments).toBe(50);
  });
});
