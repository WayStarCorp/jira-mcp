import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { AttachmentRepository } from "@features/jira/attachments/repositories";
import { DownloadAttachmentUseCaseImpl } from "@features/jira/attachments/use-cases/download-attachment.use-case";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("DownloadAttachmentUseCaseImpl", () => {
  let getMetadataMock: ReturnType<typeof mock>;
  let downloadContentMock: ReturnType<typeof mock>;
  let useCase: DownloadAttachmentUseCaseImpl;

  const metadata = {
    id: "10042",
    filename: "screenshot.png",
    mimeType: "image/png",
    size: 4,
    created: "2026-05-20T10:00:00.000Z",
    author: "user@example.com",
    contentUrl: "https://example.atlassian.net/secure/attachment/10042/file.png",
    isImage: true,
  };

  beforeEach(() => {
    getMetadataMock = mock(() => Promise.resolve(metadata));
    downloadContentMock = mock(() =>
      Promise.resolve(new Uint8Array([137, 80, 78, 71]).buffer),
    );
    useCase = new DownloadAttachmentUseCaseImpl({
      getMetadata: getMetadataMock,
      downloadContent: downloadContentMock,
    } as unknown as AttachmentRepository);
  });

  test("loads metadata then downloads content with maxBytes", async () => {
    const result = await useCase.execute({
      attachmentId: "10042",
      maxBytes: 1024,
    });

    expect(getMetadataMock).toHaveBeenCalledWith("10042");
    expect(downloadContentMock).toHaveBeenCalledWith(metadata, 1024);
    expect(result.metadata).toEqual(metadata);
    expect(result.content.byteLength).toBe(4);
  });
});
