/**
 * Get Issue Transitions Handler Tests
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JiraApiError } from "@features/jira/client/errors";
import { GetIssueTransitionsHandler } from "@features/jira/issues/handlers/get-issue-transitions.handler";
import type { Transition } from "@features/jira/issues/models";
import type { GetIssueTransitionsUseCase } from "@features/jira/issues/use-cases/get-issue-transitions.use-case";
import { setupTests } from "@test/utils/test-setup";

setupTests();

type TransitionOverrides = Omit<Partial<Transition>, "to"> & {
  to?: Partial<Transition["to"]>;
};

const createTransition = (overrides: TransitionOverrides = {}): Transition => {
  const { to, ...rest } = overrides;

  return {
    id: "11",
    name: "Start Progress",
    to: {
      self: "https://example.atlassian.net/rest/api/3/status/1",
      description: "",
      iconUrl: "",
      name: "In Progress",
      id: "21",
      statusCategory: {
        self: "https://example.atlassian.net/rest/api/3/statuscategory/1",
        id: 2,
        key: "indeterminate",
        colorName: "yellow",
        name: "In Progress",
      },
      ...to,
    },
    hasScreen: false,
    isGlobal: true,
    isInitial: false,
    isAvailable: true,
    isConditional: false,
    ...rest,
  };
};

describe("GetIssueTransitionsHandler", () => {
  let handler: GetIssueTransitionsHandler;
  let executeMock: ReturnType<typeof mock>;

  beforeEach(() => {
    executeMock = mock(() =>
      Promise.resolve([
        createTransition(),
        createTransition({ id: "12", name: "QA", to: { name: "Testing" } }),
      ]),
    );

    const mockUseCase: GetIssueTransitionsUseCase = {
      execute: executeMock,
    };

    handler = new GetIssueTransitionsHandler(mockUseCase);
  });

  afterEach(() => {
    mock.restore();
  });

  it("should list issue transitions", async () => {
    const result = await handler.handle({ issueKey: "PROJ-1" });

    expect(result.success).toBe(true);
    expect(result.data).toContain("Issue Transitions");
    expect(result.data).toContain("Start Progress");
    expect(executeMock).toHaveBeenCalledWith("PROJ-1");
  });

  it("should handle api errors", async () => {
    executeMock.mockImplementation(() => {
      throw new JiraApiError("Boom", "JIRA_API_ERROR", undefined, 500);
    });

    const result = await handler.handle({ issueKey: "PROJ-2" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("JIRA API Error");
  });
});
