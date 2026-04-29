/**
 * Transition Issue Use Case matcher tests
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { Transition } from "@features/jira/issues/models";
import type { IssueTransitionRepository } from "@features/jira/issues/repositories/issue-transition.repository";
import { TransitionIssueUseCaseImpl } from "@features/jira/issues/use-cases/transition.use-cases";
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

describe("TransitionIssueUseCaseImpl", () => {
  let useCase: TransitionIssueUseCaseImpl;
  let getIssueTransitionsMock: ReturnType<typeof mock>;
  let transitionIssueMock: ReturnType<typeof mock>;

  beforeEach(() => {
    getIssueTransitionsMock = mock(() =>
      Promise.resolve([
        createTransition(),
        createTransition({
          id: "12",
          name: "Send to QA",
          to: { name: "Testing", id: "22" },
        }),
      ]),
    );
    transitionIssueMock = mock(() => Promise.resolve());

    const repository = {
      getIssueTransitions: getIssueTransitionsMock,
      transitionIssue: transitionIssueMock,
    } as unknown as IssueTransitionRepository;

    useCase = new TransitionIssueUseCaseImpl(repository);
  });

  afterEach(() => {
    mock.restore();
  });

  it("should transition issue by explicit transition id", async () => {
    const result = await useCase.execute({
      issueKey: "PROJ-1",
      transitionId: "11",
    });

    expect(result.issueKey).toBe("PROJ-1");
    expect(result.transition.id).toBe("11");
    expect(transitionIssueMock).toHaveBeenCalledWith("PROJ-1", "11", undefined);
  });

  it("should transition issue by status name matching target status", async () => {
    const result = await useCase.execute({
      issueKey: "PROJ-2",
      statusName: "testing",
    });

    expect(result.transition.id).toBe("12");
    expect(result.transition.to.name).toBe("Testing");
    expect(transitionIssueMock).toHaveBeenCalledWith("PROJ-2", "12", undefined);
  });

  it("should reject ambiguous transition matches", async () => {
    getIssueTransitionsMock.mockImplementation(() =>
      Promise.resolve([
        createTransition({
          id: "11",
          name: "Start Work",
          to: { name: "Working" },
        }),
        createTransition({
          id: "12",
          name: "Start QA",
          to: { name: "Working" },
        }),
      ]),
    );

    await expect(
      useCase.execute({
        issueKey: "PROJ-3",
        statusName: "start",
      }),
    ).rejects.toThrow("Multiple transitions matched");
  });

  it("should reject when no transition matches", async () => {
    await expect(
      useCase.execute({
        issueKey: "PROJ-4",
        statusName: "done-done",
      }),
    ).rejects.toThrow("No transition matched");
  });
});
