import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { adaptToMcpContent } from "@core/responses/mcp-adapter.util";
import type { McpResponse } from "@core/responses/mcp-response.types";
import { AttachmentTooLargeError } from "@core/errors";
import { DEFAULT_MAX_BYTES } from "@features/jira/client/http/attachment-url.validator";
import { DownloadAttachmentHandler } from "@features/jira/attachments/handlers/download-attachment.handler";
import type { DownloadAttachmentUseCase } from "@features/jira/attachments/use-cases/download-attachment.use-case";
import type {
  AttachmentValidator,
  DownloadAttachmentParams,
} from "@features/jira/attachments/validators/attachment.validator";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("DownloadAttachmentHandler", () => {
  let handler: DownloadAttachmentHandler;
  let executeMock: ReturnType<typeof mock>;
  let validateMock: ReturnType<typeof mock>;

  const pngBytes = new Uint8Array([137, 80, 78, 71]).buffer;

  beforeEach(() => {
    executeMock = mock(() =>
      Promise.resolve({
        metadata: {
          id: "10042",
          filename: "screenshot.png",
          mimeType: "image/png",
          size: 4,
          created: "2026-05-20T10:00:00.000Z",
          author: "user@example.com",
          contentUrl:
            "https://example.atlassian.net/secure/attachment/10042/file.png",
          isImage: true,
        },
        content: pngBytes,
      }),
    );
    validateMock = mock((params: DownloadAttachmentParams) => params);

    const mockUseCase: DownloadAttachmentUseCase = {
      execute: executeMock,
    };

    const mockValidator: AttachmentValidator = {
      validateGetIssueAttachmentsParams: mock(() => ({ issueKey: "X" })),
      validateDownloadAttachmentParams: validateMock,
    };

    handler = new DownloadAttachmentHandler(mockUseCase, mockValidator);
  });

  afterEach(() => {
    mock.restore();
  });

  it("returns ImageContent for image mime types, not JSON in text", async () => {
    const result = (await handler.handle({
      attachmentId: "10042",
    })) as McpResponse;

    expect(validateMock).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.content).toBeDefined();
    expect(result.content?.[0]?.type).toBe("image");
    expect(result.content?.[0]).toMatchObject({
      type: "image",
      mimeType: "image/png",
    });
    expect((result.content?.[0] as { data?: string })?.data).toBe(
      Buffer.from(pngBytes).toString("base64"),
    );

    expect(result.data).toBe("");

    const adapted = adaptToMcpContent(result);
    expect(adapted.content).toEqual(result.content);
    expect(adapted.content[0]?.type).toBe("image");
    expect(
      adapted.content.some(
        (item) =>
          item.type === "text" &&
          typeof item.text === "string" &&
          item.text.includes('"type":"image"'),
      ),
    ).toBe(false);
  });

  it("returns text content for text/* mime types", async () => {
    executeMock.mockImplementation(() =>
      Promise.resolve({
        metadata: {
          id: "10044",
          filename: "log.txt",
          mimeType: "text/plain",
          size: 11,
          created: "2026-05-20T10:00:00.000Z",
          author: "user@example.com",
          contentUrl:
            "https://example.atlassian.net/secure/attachment/10044/log.txt",
          isImage: false,
        },
        content: new TextEncoder().encode("hello world").buffer,
      }),
    );

    const result = (await handler.handle({
      attachmentId: "10044",
    })) as McpResponse<string>;

    expect(result.success).toBe(true);
    expect(result.data).toBe("hello world");
    expect(result.content).toBeUndefined();
  });

  it("returns metadata message for binary non-text types", async () => {
    executeMock.mockImplementation(() =>
      Promise.resolve({
        metadata: {
          id: "10043",
          filename: "report.pdf",
          mimeType: "application/pdf",
          size: 1_200_000,
          created: "2026-05-20T10:00:00.000Z",
          author: "user@example.com",
          contentUrl:
            "https://example.atlassian.net/secure/attachment/10043/report.pdf",
          isImage: false,
        },
        content: new ArrayBuffer(0),
      }),
    );

    const result = (await handler.handle({
      attachmentId: "10043",
    })) as McpResponse<string>;

    expect(result.success).toBe(true);
    expect(result.data).toContain("Downloaded: report.pdf");
    expect(result.data).toContain("application/pdf");
    expect(result.data).toContain(
      "(binary content not returned for non-image/non-text files)",
    );
  });

  it("passes default maxBytes from validator to use case", async () => {
    validateMock.mockImplementation((params: DownloadAttachmentParams) => ({
      ...params,
      maxBytes: DEFAULT_MAX_BYTES,
    }));

    await handler.handle({ attachmentId: "10042" });

    expect(executeMock).toHaveBeenCalledWith({
      attachmentId: "10042",
      maxBytes: DEFAULT_MAX_BYTES,
    });
  });

  it("surfaces AttachmentTooLargeError message", async () => {
    executeMock.mockImplementation(() => {
      throw new AttachmentTooLargeError(1024);
    });

    const result = (await handler.handle({
      attachmentId: "10042",
      maxBytes: 1024,
    })) as McpResponse;

    expect(result.success).toBe(false);
    expect(result.error).toContain("maxBytes limit");
  });
});
