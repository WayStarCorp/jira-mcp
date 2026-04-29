/**
 * Get Assignable Users Handler Tests
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { GetAssignableUsersHandler } from "@features/jira/users/handlers/get-assignable-users.handler";
import type { GetAssignableUsersUseCase } from "@features/jira/users/use-cases/get-assignable-users.use-case";
import { mockFactory } from "@test/mocks/jira-mock-factory";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("GetAssignableUsersHandler", () => {
  let handler: GetAssignableUsersHandler;
  let executeMock: ReturnType<typeof mock>;

  beforeEach(() => {
    executeMock = mock(() =>
      Promise.resolve([
        mockFactory.createMockUser({
          displayName: "QA User",
          emailAddress: "qa@example.com",
        }),
      ]),
    );

    const mockUseCase: GetAssignableUsersUseCase = {
      execute: executeMock,
    };

    handler = new GetAssignableUsersHandler(mockUseCase);
  });

  afterEach(() => {
    mock.restore();
  });

  it("should list assignable users for an issue", async () => {
    const result = await handler.handle({
      issueKey: "PROJ-1",
    });

    expect(result.success).toBe(true);
    expect(result.data).toContain("Assignable Users");
    expect(result.data).toContain("QA User");
    expect(executeMock).toHaveBeenCalledWith({
      issueKey: "PROJ-1",
      query: undefined,
      maxResults: 20,
    });
  });
});
