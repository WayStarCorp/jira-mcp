/**
 * Assign Issue Use Case Tests
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { AssignIssueUseCaseImpl } from "@features/jira/users/use-cases/assign-issue.use-case";
import { mockFactory } from "@test/mocks/jira-mock-factory";
import {
  createMockIssueRepository,
  createMockUserProfileRepository,
} from "@test/utils/repository-test.utils";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("AssignIssueUseCaseImpl", () => {
  let useCase: AssignIssueUseCaseImpl;
  let issueRepository: ReturnType<typeof createMockIssueRepository>;
  let userRepository: ReturnType<typeof createMockUserProfileRepository>;

  beforeEach(() => {
    issueRepository = createMockIssueRepository();
    userRepository = createMockUserProfileRepository();
    useCase = new AssignIssueUseCaseImpl(userRepository, issueRepository);
  });

  afterEach(() => {
    mock.restore();
  });

  it("assigns issue directly by accountId", async () => {
    const updatedIssue = mockFactory.createMockIssue({
      key: "PROJ-1",
      fields: {
        ...mockFactory.createMockIssue().fields,
        assignee: mockFactory.createMockUser({
          accountId: "account-123",
          displayName: "Alisia Example",
        }),
      },
    });
    issueRepository.updateIssue.mockResolvedValue(updatedIssue);
    issueRepository.assignIssue.mockResolvedValue(updatedIssue);

    const result = await useCase.execute({
      issueKey: "PROJ-1",
      accountId: "account-123",
    });

    expect(issueRepository.assignIssue).toHaveBeenCalledWith(
      "PROJ-1",
      "account-123",
    );
    expect(issueRepository.updateIssue).not.toHaveBeenCalled();
    expect(userRepository.getAssignableUsers).not.toHaveBeenCalled();
    expect(result.fields?.assignee?.accountId).toBe("account-123");
  });

  it("assigns issue by a unique query match", async () => {
    const candidate = mockFactory.createMockUser({
      accountId: "account-456",
      displayName: "John Candidate",
    });
    const updatedIssue = mockFactory.createMockIssue({
      key: "PROJ-2",
      fields: {
        ...mockFactory.createMockIssue().fields,
        assignee: candidate,
      },
    });

    userRepository.getAssignableUsers.mockResolvedValue([candidate]);
    issueRepository.updateIssue.mockResolvedValue(updatedIssue);
    issueRepository.assignIssue.mockResolvedValue(updatedIssue);

    const result = await useCase.execute({
      issueKey: "PROJ-2",
      query: "john",
    });

    expect(userRepository.getAssignableUsers).toHaveBeenCalledWith(
      "PROJ-2",
      "john",
      20,
    );
    expect(issueRepository.assignIssue).toHaveBeenCalledWith(
      "PROJ-2",
      "account-456",
    );
    expect(issueRepository.updateIssue).not.toHaveBeenCalled();
    expect(result.fields?.assignee?.accountId).toBe("account-456");
  });

  it("wraps lookup failures from assignable user search", async () => {
    userRepository.getAssignableUsers.mockRejectedValue(
      new Error("Lookup failed"),
    );

    await expect(
      useCase.execute({
        issueKey: "PROJ-6",
        query: "john",
      }),
    ).rejects.toThrow("Failed to assign issue 'PROJ-6': Lookup failed");

    expect(issueRepository.assignIssue).not.toHaveBeenCalled();
  });

  it("fails when query matches no assignable users", async () => {
    userRepository.getAssignableUsers.mockResolvedValue([]);

    await expect(
      useCase.execute({
        issueKey: "PROJ-3",
        query: "missing",
      }),
    ).rejects.toThrow("No assignable users matched");

    expect(issueRepository.updateIssue).not.toHaveBeenCalled();
  });

  it("fails when query matches multiple assignable users", async () => {
    userRepository.getAssignableUsers.mockResolvedValue([
      mockFactory.createMockUser({
        accountId: "account-1",
        displayName: "John Candidate",
      }),
      mockFactory.createMockUser({
        accountId: "account-2",
        displayName: "Johnny Candidate",
      }),
    ]);

    await expect(
      useCase.execute({
        issueKey: "PROJ-4",
        query: "john",
      }),
    ).rejects.toThrow("Multiple assignable users matched");

    expect(issueRepository.updateIssue).not.toHaveBeenCalled();
  });

  it("fails when neither accountId nor query is provided", async () => {
    await expect(
      useCase.execute({
        issueKey: "PROJ-5",
      }),
    ).rejects.toThrow("Provide either accountId or query");
  });
});
