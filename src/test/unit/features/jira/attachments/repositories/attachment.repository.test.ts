import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { AttachmentTooLargeError, McpError } from "@core/errors";
import type { AttachmentMetadata } from "@features/jira/attachments/models";
import { AttachmentRepositoryImpl } from "@features/jira/attachments/repositories/attachment.repository";
import {
  JiraApiError,
  JiraAuthenticationError,
  JiraErrorCode,
  JiraPermissionError,
} from "@features/jira/client/errors";
import type { HttpClient } from "@features/jira/client/http/jira.http.types";
import { setupTests } from "@test/utils/test-setup";

setupTests();

const sampleDto = {
  id: "15894",
  filename: "file.png",
  mimeType: "image/png",
  size: 1024,
  created: "2026-05-20T10:00:00.000+0000",
  author: { displayName: "user@example.com" },
  content: "https://example.atlassian.net/rest/api/3/attachment/content/15894",
};

const sampleMetadata: AttachmentMetadata = {
  id: "15894",
  filename: "file.png",
  mimeType: "image/png",
  size: 1024,
  created: "2026-05-20T10:00:00.000+0000",
  author: "user@example.com",
  contentUrl:
    "https://example.atlassian.net/rest/api/3/attachment/content/15894",
  isImage: true,
};

describe("AttachmentRepositoryImpl", () => {
  let repository: AttachmentRepositoryImpl;
  let sendRequestMock: ReturnType<typeof mock>;
  let downloadBinaryMock: ReturnType<typeof mock>;

  beforeEach(() => {
    sendRequestMock = mock();
    downloadBinaryMock = mock();
    const httpClient = {
      sendRequest: sendRequestMock,
      downloadBinary: downloadBinaryMock,
    } as unknown as HttpClient;

    repository = new AttachmentRepositoryImpl(httpClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it("gets attachment metadata via REST", async () => {
    sendRequestMock.mockResolvedValue(sampleDto);

    const result = await repository.getMetadata("15894");

    expect(result).toEqual(sampleMetadata);
    expect(sendRequestMock).toHaveBeenCalledTimes(1);
    const request = sendRequestMock.mock.calls[0][0] as {
      endpoint: string;
      method: string;
    };
    expect(request.endpoint).toBe("attachment/15894");
    expect(request.method).toBe("GET");
  });

  it("encodes attachment id in metadata path when needed", async () => {
    sendRequestMock.mockResolvedValue(sampleDto);

    await repository.getMetadata("10001/with space");

    const request = sendRequestMock.mock.calls[0][0] as { endpoint: string };
    expect(request.endpoint).toBe(
      `attachment/${encodeURIComponent("10001/with space")}`,
    );
  });

  it("downloads binary content from metadata contentUrl", async () => {
    const buffer = new ArrayBuffer(8);
    downloadBinaryMock.mockResolvedValue(buffer);

    const result = await repository.downloadContent(sampleMetadata, 50_000);

    expect(result).toBe(buffer);
    expect(downloadBinaryMock).toHaveBeenCalledWith(
      sampleMetadata.contentUrl,
      50_000,
    );
  });

  it("maps 401 to JiraAuthenticationError with credential hint", async () => {
    sendRequestMock.mockRejectedValue(
      new JiraAuthenticationError("Unauthorized", 401),
    );

    await expect(repository.getMetadata("15894")).rejects.toThrow(
      JiraAuthenticationError,
    );
    await expect(repository.getMetadata("15894")).rejects.toThrow(
      "Check JIRA_USERNAME and JIRA_API_TOKEN",
    );
  });

  it("maps 403 to JiraPermissionError with scope hint", async () => {
    sendRequestMock.mockRejectedValue(
      new JiraApiError(
        "Access forbidden",
        JiraErrorCode.PERMISSION_ERROR,
        undefined,
        403,
      ),
    );

    await expect(repository.getMetadata("15894")).rejects.toThrow(
      JiraPermissionError,
    );
    await expect(repository.getMetadata("15894")).rejects.toThrow(
      "read:attachment",
    );
  });

  it("maps 404 to McpError with attachment id", async () => {
    sendRequestMock.mockRejectedValue(
      new JiraApiError(
        "Not found",
        JiraErrorCode.NOT_FOUND_ERROR,
        undefined,
        404,
      ),
    );

    await expect(repository.getMetadata("15894")).rejects.toThrow(McpError);
    await expect(repository.getMetadata("15894")).rejects.toThrow(
      "Attachment 15894 not found",
    );
  });

  it("maps forbidden content URL host to McpError on download", async () => {
    downloadBinaryMock.mockRejectedValue(
      new JiraApiError(
        "Attachment URL host is not allowed",
        JiraErrorCode.API_ERROR,
      ),
    );

    await expect(
      repository.downloadContent(sampleMetadata, 1024),
    ).rejects.toThrow(McpError);
    await expect(
      repository.downloadContent(sampleMetadata, 1024),
    ).rejects.toThrow("Attachment content URL is not allowed");
  });

  it("passes through AttachmentTooLargeError from download", async () => {
    downloadBinaryMock.mockRejectedValue(new AttachmentTooLargeError(1024));

    await expect(
      repository.downloadContent(sampleMetadata, 1024),
    ).rejects.toThrow(AttachmentTooLargeError);
  });
});
