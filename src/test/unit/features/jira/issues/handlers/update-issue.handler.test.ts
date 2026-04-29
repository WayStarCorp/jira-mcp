/**
 * Update Issue Handler Tests
 * Comprehensive test suite for the UpdateIssueHandler
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { McpResponse } from "@core/responses/mcp-response.types";
import {
  JiraApiError,
  JiraNotFoundError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { UpdateIssueHandler } from "@features/jira/issues/handlers/update-issue.handler";
import { mockFactory } from "@test/mocks/jira-mock-factory";
import { setupTests } from "@test/utils/test-setup";

// Setup test environment
setupTests();

describe("UpdateIssueHandler", () => {
  let handler: UpdateIssueHandler;
  let mockUpdateIssueUseCase: {
    execute: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    // Create mock use case
    mockUpdateIssueUseCase = {
      execute: mock(() => {}),
    };

    // Create handler with mock use case
    handler = new UpdateIssueHandler(mockUpdateIssueUseCase);
  });

  afterEach(() => {
    // Clear all mocks
    mockUpdateIssueUseCase.execute.mockClear();
  });

  describe("successful issue updates", () => {
    it("should update issue with basic fields", async () => {
      const mockUpdatedIssue = mockFactory.createMockIssue({
        key: "TEST-123",
        id: "issue-123",
        fields: {
          summary: "Updated test issue",
          description: "Updated description",
        },
      });

      mockUpdateIssueUseCase.execute.mockImplementation(() =>
        Promise.resolve(mockUpdatedIssue),
      );

      const result = (await handler.handle({
        issueKey: "TEST-123",
        summary: "Updated test issue",
        description: "Updated description",
      })) as McpResponse<string>;

      expect(result.success).toBe(true);
      expect(result.data).toContain("✅ Issue Updated Successfully");
      expect(result.data).toContain("TEST-123");
      expect(mockUpdateIssueUseCase.execute).toHaveBeenCalledTimes(1);
      expect(mockUpdateIssueUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          issueKey: "TEST-123",
          fields: expect.objectContaining({
            summary: "Updated test issue",
            description: expect.objectContaining({
              type: "doc",
              version: 1,
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: "paragraph",
                  content: expect.arrayContaining([
                    expect.objectContaining({
                      type: "text",
                      text: "Updated description",
                    }),
                  ]),
                }),
              ]),
            }),
          }),
        }),
      );
    });

    it("should resolve custom field names and option values", async () => {
      const mockUpdatedIssue = mockFactory.createMockIssue({
        key: "TEST-126",
        id: "issue-126",
      });

      const mockResolveCustomFieldsUseCase = {
        execute: mock(() =>
          Promise.resolve({
            customfield_10070: { id: "10026" },
          }),
        ),
      };

      mockUpdateIssueUseCase.execute.mockImplementation(() =>
        Promise.resolve(mockUpdatedIssue),
      );

      const localHandler = new UpdateIssueHandler(
        mockUpdateIssueUseCase,
        mockResolveCustomFieldsUseCase as never,
      );

      const result = (await localHandler.handle({
        issueKey: "TEST-126",
        customFields: {
          Инициатор: "Роман",
        },
      })) as McpResponse<string>;

      expect(result.success).toBe(true);
      expect(mockResolveCustomFieldsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          issueKey: "TEST-126",
          customFields: {
            Инициатор: "Роман",
          },
        }),
      );
      expect(mockUpdateIssueUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          issueKey: "TEST-126",
          fields: {
            customfield_10070: { id: "10026" },
          },
        }),
      );
    });

    it("should merge customFields into the update payload", async () => {
      const mockUpdatedIssue = mockFactory.createMockIssue({
        key: "TEST-124",
        id: "issue-124",
      });

      mockUpdateIssueUseCase.execute.mockImplementation(() =>
        Promise.resolve(mockUpdatedIssue),
      );

      const result = (await handler.handle({
        issueKey: "TEST-124",
        summary: "Updated test issue",
        customFields: {
          customfield_10001: { accountId: "account-123" },
          customfield_10002: "custom value",
          duedate: "2026-01-01",
          reporter: { accountId: "evil-user" },
        },
      })) as McpResponse<string>;

      expect(result.success).toBe(true);
      expect(mockUpdateIssueUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          issueKey: "TEST-124",
          fields: expect.objectContaining({
            summary: "Updated test issue",
            customfield_10001: { accountId: "account-123" },
            customfield_10002: "custom value",
          }),
        }),
      );

      const updateCall = mockUpdateIssueUseCase.execute.mock.calls[0][0];
      expect(updateCall.fields).not.toHaveProperty("duedate");
      expect(updateCall.fields).not.toHaveProperty("reporter");
    });

    it("should forward customFields even when no standard fields are provided", async () => {
      const mockUpdatedIssue = mockFactory.createMockIssue({
        key: "TEST-125",
        id: "issue-125",
      });

      mockUpdateIssueUseCase.execute.mockImplementation(() =>
        Promise.resolve(mockUpdatedIssue),
      );

      await handler.handle({
        issueKey: "TEST-125",
        customFields: {
          customfield_10001: { accountId: "account-123" },
        },
      });

      expect(mockUpdateIssueUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          issueKey: "TEST-125",
          fields: {
            customfield_10001: { accountId: "account-123" },
          },
        }),
      );
    });
  });

  describe("error handling", () => {
    it("should handle issue not found error", async () => {
      mockUpdateIssueUseCase.execute.mockImplementation(() => {
        throw new JiraNotFoundError("Issue", "NONEXIST-123");
      });

      const result = await handler.handle({
        issueKey: "NONEXIST-123",
        summary: "Updated summary",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Issue Not Found");
    });

    it("should handle permission denied error", async () => {
      mockUpdateIssueUseCase.execute.mockImplementation(() => {
        throw new JiraPermissionError("Insufficient permissions");
      });

      const result = await handler.handle({
        issueKey: "RESTRICTED-123",
        summary: "Updated summary",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Permission Denied");
    });

    it("should handle validation errors", async () => {
      mockUpdateIssueUseCase.execute.mockImplementation(() => {
        throw JiraApiError.withStatusCode(
          "Invalid issue update parameters",
          400,
        );
      });

      const result = await handler.handle({
        issueKey: "TEST-123",
        // Include an invalid parameter format
        priority: "invalid-format" as unknown as Record<string, string>,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Update Failed");
    });
  });

  describe("parameter validation", () => {
    it("should validate required issue key", async () => {
      const result = await handler.handle({
        // @ts-ignore - Intentionally omitting required field for test
        issueKey: undefined,
        summary: "Updated summary",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid issue update parameters");
    });

    it("should validate issue key format", async () => {
      const result = await handler.handle({
        issueKey: "invalid-format", // Invalid format
        summary: "Updated summary",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid issue update parameters");
    });

    it("should handle empty issue key", async () => {
      const result = await handler.handle({
        issueKey: "", // Empty string
        summary: "Updated summary",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid issue update parameters");
    });

    it("should reject empty description", async () => {
      const result = await handler.handle({
        issueKey: "TEST-123",
        description: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid issue update parameters");
    });
  });
});
