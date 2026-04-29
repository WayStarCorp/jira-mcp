/**
 * Assign Issue Handler Tests
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JiraApiError } from "@features/jira/client/errors";
import { AssignIssueHandler } from "@features/jira/users/handlers/assign-issue.handler";
import type { AssignIssueUseCase } from "@features/jira/users/use-cases/assign-issue.use-case";
import { mockFactory } from "@test/mocks/jira-mock-factory";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("AssignIssueHandler", () => {
  let handler: AssignIssueHandler;
  let executeMock: ReturnType<typeof mock>;

  beforeEach(() => {
    const updatedIssue = mockFactory.createMockIssue({
      key: "PROJ-1",
      fields: {
        assignee: mockFactory.createMockUser({
          displayName: "Alisia Example",
          accountId: "account-123",
          emailAddress: "alisia@example.com",
        }),
      },
    });

    executeMock = mock(() => Promise.resolve(updatedIssue));

    const mockUseCase: AssignIssueUseCase = {
      execute: executeMock,
    };

    handler = new AssignIssueHandler(mockUseCase);
  });

  afterEach(() => {
    mock.restore();
  });

  it("should assign issue by accountId and format updated issue", async () => {
    const result = await handler.handle({
      issueKey: "PROJ-1",
      accountId: "account-123",
    });

    expect(result.success).toBe(true);
    expect(result.data).toContain("Issue Updated Successfully");
    expect(result.data).toContain("Alisia Example");
    expect(executeMock).toHaveBeenCalledWith({
      issueKey: "PROJ-1",
      accountId: "account-123",
    });
  });

  it("should format api errors", async () => {
    executeMock.mockImplementation(() => {
      throw new JiraApiError(
        "No users found",
        "JIRA_API_ERROR",
        undefined,
        400,
      );
    });

    const result = await handler.handle({
      issueKey: "PROJ-1",
      query: "missing",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Assign Failed");
  });
});
