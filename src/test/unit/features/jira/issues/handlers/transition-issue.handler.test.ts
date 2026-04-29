/**
 * Transition Issue Handler Tests
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JiraApiError } from "@features/jira/client/errors";
import { TransitionIssueHandler } from "@features/jira/issues/handlers/transition-issue.handler";
import type {
  TransitionIssueUseCase,
  TransitionIssueUseCaseResult,
} from "@features/jira/issues/use-cases/transition.use-cases";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("TransitionIssueHandler", () => {
  let handler: TransitionIssueHandler;
  let executeMock: ReturnType<typeof mock>;

  beforeEach(() => {
    executeMock = mock(() =>
      Promise.resolve({
        issueKey: "PROJ-1",
        transition: {
          id: "11",
          name: "Start Progress",
          to: {
            name: "In Progress",
          },
        },
      } as TransitionIssueUseCaseResult),
    );

    const mockUseCase: TransitionIssueUseCase = {
      execute: executeMock,
    };

    handler = new TransitionIssueHandler(mockUseCase);
  });

  afterEach(() => {
    mock.restore();
  });

  it("should transition issue successfully", async () => {
    const result = await handler.handle({
      issueKey: "PROJ-1",
      statusName: "In Progress",
    });

    expect(result.success).toBe(true);
    expect(result.data).toContain("Issue Transitioned");
    expect(result.data).toContain("Start Progress");
    expect(executeMock).toHaveBeenCalled();
  });

  it("should reject invalid parameters", async () => {
    const result = await handler.handle({
      issueKey: "PROJ-1",
    } as never);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid transition parameters");
  });

  it("should format api errors", async () => {
    executeMock.mockImplementation(() => {
      throw new JiraApiError(
        "No transition matched",
        "JIRA_API_ERROR",
        undefined,
        400,
      );
    });

    const result = await handler.handle({
      issueKey: "PROJ-1",
      statusName: "missing",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Transition Failed");
  });
});
