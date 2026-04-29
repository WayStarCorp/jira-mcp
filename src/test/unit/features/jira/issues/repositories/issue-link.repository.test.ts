import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { HttpClient } from "@features/jira/client/http/jira.http.types";
import type { IssueLinkType } from "@features/jira/issues/models";
import { IssueLinkRepositoryImpl } from "@features/jira/issues/repositories/issue-link.repository";
import { setupTests } from "@test/utils/test-setup";

setupTests();

type SendRequestCall = {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: {
    type?: { name: string };
    inwardIssue?: { key: string };
    outwardIssue?: { key: string };
    comment?: {
      body: {
        type: string;
        version: number;
        content: Array<{
          type: string;
          content: Array<{ type: string; text: string }>;
        }>;
      };
    };
  };
};

describe("IssueLinkRepositoryImpl", () => {
  let repository: IssueLinkRepositoryImpl;
  let sendRequestMock: ReturnType<typeof mock>;

  beforeEach(() => {
    sendRequestMock = mock();
    const httpClient = {
      sendRequest: sendRequestMock,
    } as unknown as HttpClient;

    repository = new IssueLinkRepositoryImpl(httpClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it("gets issue link types", async () => {
    const linkTypes: IssueLinkType[] = [
      {
        id: "10000",
        name: "Blocks",
        inward: "is blocked by",
        outward: "blocks",
      },
      {
        id: "10001",
        name: "Relates",
        inward: "relates to",
        outward: "relates to",
      },
    ];

    sendRequestMock.mockResolvedValue({ issueLinkTypes: linkTypes });

    const result = await repository.getIssueLinkTypes();

    expect(result).toEqual(linkTypes);
    expect(sendRequestMock).toHaveBeenCalledTimes(1);

    const request = sendRequestMock.mock.calls[0][0] as SendRequestCall;
    expect(request.endpoint).toBe("issueLinkType");
    expect(request.method).toBe("GET");
  });

  it("creates issue links with plain comment omitted", async () => {
    sendRequestMock.mockResolvedValue(undefined);

    await repository.linkIssues({
      inwardIssueKey: "PROJ-200",
      outwardIssueKey: "PROJ-100",
      linkTypeName: "Blocks",
    });

    expect(sendRequestMock).toHaveBeenCalledTimes(1);

    const request = sendRequestMock.mock.calls[0][0] as SendRequestCall;
    expect(request.endpoint).toBe("issueLink");
    expect(request.method).toBe("POST");
    expect(request.body?.type?.name).toBe("Blocks");
    expect(request.body?.inwardIssue?.key).toBe("PROJ-200");
    expect(request.body?.outwardIssue?.key).toBe("PROJ-100");
    expect(request.body?.comment).toBeUndefined();
  });

  it("converts comment to ADF when creating issue links", async () => {
    sendRequestMock.mockResolvedValue(undefined);

    await repository.linkIssues({
      inwardIssueKey: "PROJ-200",
      outwardIssueKey: "PROJ-100",
      linkTypeName: "Blocks",
      comment: "Link comment",
    });

    const request = sendRequestMock.mock.calls[0][0] as SendRequestCall;
    expect(request.body?.comment?.body).toEqual({
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Link comment" }],
        },
      ],
    });
  });
});
