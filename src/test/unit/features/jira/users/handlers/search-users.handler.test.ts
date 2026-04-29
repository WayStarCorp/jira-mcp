/**
 * Search Users Handler Tests
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { SearchUsersHandler } from "@features/jira/users/handlers/search-users.handler";
import type { SearchUsersUseCase } from "@features/jira/users/use-cases/search-users.use-case";
import { mockFactory } from "@test/mocks/jira-mock-factory";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("SearchUsersHandler", () => {
  let handler: SearchUsersHandler;
  let executeMock: ReturnType<typeof mock>;

  beforeEach(() => {
    executeMock = mock(() =>
      Promise.resolve([
        mockFactory.createMockUser({
          displayName: "Alisia Example",
          emailAddress: "alisia@example.com",
        }),
      ]),
    );

    const mockUseCase: SearchUsersUseCase = {
      execute: executeMock,
    };

    handler = new SearchUsersHandler(mockUseCase);
  });

  afterEach(() => {
    mock.restore();
  });

  it("should search users and format results", async () => {
    const result = await handler.handle({
      query: "Alisia",
      maxResults: 10,
    });

    expect(result.success).toBe(true);
    expect(result.data).toContain("JIRA Users");
    expect(result.data).toContain("Alisia Example");
    expect(result.data).toContain("alisia@example.com");
    expect(executeMock).toHaveBeenCalledWith({
      query: "Alisia",
      maxResults: 10,
    });
  });

  it("should show an empty state when no users are found", async () => {
    executeMock.mockImplementation(() => Promise.resolve([]));

    const result = await handler.handle({
      query: "missing-user",
    });

    expect(result.success).toBe(true);
    expect(result.data).toContain("No users found");
  });
});
