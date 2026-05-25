import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { McpResponse } from "@core/responses/mcp-response.types";
import {
  JiraApiError,
  JiraNotFoundError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { GetIssueAttachmentsHandler } from "@features/jira/attachments/handlers/get-issue-attachments.handler";
import type { GetIssueAttachmentsUseCase } from "@features/jira/attachments/use-cases/get-issue-attachments.use-case";
import type {
  AttachmentValidator,
  GetIssueAttachmentsParams,
} from "@features/jira/attachments/validators/attachment.validator";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("GetIssueAttachmentsHandler", () => {
  let handler: GetIssueAttachmentsHandler;
  let executeMock: ReturnType<typeof mock>;
  let validateMock: ReturnType<typeof mock>;

  beforeEach(() => {
    executeMock = mock(() =>
      Promise.resolve({
        issueKey: "SUPP-79",
        attachments: [],
      }),
    );
    validateMock = mock((params: GetIssueAttachmentsParams) => params);

    const mockUseCase: GetIssueAttachmentsUseCase = {
      execute: executeMock,
    };

    const mockValidator: AttachmentValidator = {
      validateGetIssueAttachmentsParams: validateMock,
    };

    handler = new GetIssueAttachmentsHandler(mockUseCase, mockValidator);
  });

  afterEach(() => {
    mock.restore();
  });

  it("validates params, calls use case, formats empty list message", async () => {
    const result = (await handler.handle({
      issueKey: "SUPP-79",
    })) as McpResponse<string>;

    expect(validateMock).toHaveBeenCalledWith({ issueKey: "SUPP-79" });
    expect(executeMock).toHaveBeenCalledWith({ issueKey: "SUPP-79" });
    expect(result.success).toBe(true);
    expect(result.data).toBe("No attachments found for SUPP-79");
  });

  it("formats non-empty attachment list", async () => {
    executeMock.mockImplementation(() =>
      Promise.resolve({
        issueKey: "SUPP-79",
        attachments: [
          {
            id: "10042",
            filename: "screenshot.png",
            mimeType: "image/png",
            size: 250_880,
            created: "2026-05-20T10:00:00.000Z",
            author: "user@example.com",
            contentUrl: "https://example.atlassian.net/secure/attachment/10042/file.png",
            isImage: true,
          },
        ],
      }),
    );

    const result = (await handler.handle({
      issueKey: "SUPP-79",
    })) as McpResponse<string>;

    expect(result.success).toBe(true);
    expect(result.data).toContain("Attachments for SUPP-79 (1 file):");
    expect(result.data).toContain("screenshot.png");
    expect(result.data).toContain("id: 10042  isImage: true");
    expect(result.data).not.toContain("contentUrl");
  });

  it("handles not found errors", async () => {
    executeMock.mockImplementation(() => {
      throw new JiraNotFoundError("Issue not found", "SUPP-79");
    });

    const result = (await handler.handle({
      issueKey: "SUPP-79",
    })) as McpResponse<string>;

    expect(result.success).toBe(false);
    expect(result.error).toContain("Issue Not Found");
  });

  it("handles permission errors", async () => {
    executeMock.mockImplementation(() => {
      throw new JiraPermissionError("Permission denied");
    });

    const result = (await handler.handle({
      issueKey: "SUPP-79",
    })) as McpResponse<string>;

    expect(result.success).toBe(false);
    expect(result.error).toContain("Permission Denied");
  });

  it("handles api errors", async () => {
    executeMock.mockImplementation(() => {
      throw JiraApiError.withStatusCode("API error", 400);
    });

    const result = (await handler.handle({
      issueKey: "SUPP-79",
    })) as McpResponse<string>;

    expect(result.success).toBe(false);
    expect(result.error).toContain("JIRA API Error");
  });
});
