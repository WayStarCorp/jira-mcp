import { beforeEach, describe, expect, mock, test } from "bun:test";
import { JiraNotFoundError } from "@features/jira/client/errors";
import type { IssueRepository } from "@features/jira/issues/repositories/issue.repository";
import { GetIssueAttachmentsUseCaseImpl } from "@features/jira/attachments/use-cases/get-issue-attachments.use-case";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("GetIssueAttachmentsUseCaseImpl", () => {
  let getIssueMock: ReturnType<typeof mock>;
  let useCase: GetIssueAttachmentsUseCaseImpl;

  beforeEach(() => {
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
              content: "https://example.atlassian.net/secure/attachment/10042/file.png",
            },
          ],
        },
      }),
    );
    useCase = new GetIssueAttachmentsUseCaseImpl({
      getIssue: getIssueMock,
    } as unknown as IssueRepository);
  });

  test("loads issue and maps fields.attachment", async () => {
    const result = await useCase.execute({ issueKey: "SUPP-79" });

    expect(getIssueMock).toHaveBeenCalledWith("SUPP-79");
    expect(result.issueKey).toBe("SUPP-79");
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0]).toMatchObject({
      id: "10042",
      filename: "screenshot.png",
      mimeType: "image/png",
      isImage: true,
      author: "user@example.com",
    });
  });

  test("returns empty attachments when field missing or invalid", async () => {
    getIssueMock.mockImplementation(() =>
      Promise.resolve({
        id: "1",
        key: "SUPP-80",
        self: null,
        fields: {},
      }),
    );

    const result = await useCase.execute({ issueKey: "SUPP-80" });

    expect(result.attachments).toEqual([]);
  });

  test("rethrows repository not-found with 404 status", async () => {
    const notFound = new JiraNotFoundError("Issue", "MISSING-1");
    getIssueMock.mockImplementation(() => Promise.reject(notFound));

    await expect(useCase.execute({ issueKey: "MISSING-1" })).rejects.toBe(
      notFound,
    );
    expect(notFound.statusCode).toBe(404);
  });
});
