import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { IssueRepository } from "@features/jira/issues/repositories/issue.repository";
import type { EpicRelationResolver } from "@features/jira/issues/use-cases/epic-relation-resolver";
import { RemoveIssueEpicUseCaseImpl } from "@features/jira/issues/use-cases/remove-issue-epic.use-case";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("RemoveIssueEpicUseCase", () => {
  let updateExecute: ReturnType<typeof mock>;
  let getIssue: ReturnType<typeof mock>;
  let resolve: ReturnType<typeof mock>;
  let tryOptionalSingleEpicLinkFieldFromEditMeta: ReturnType<typeof mock>;
  let useCase: RemoveIssueEpicUseCaseImpl;

  beforeEach(() => {
    updateExecute = mock(() =>
      Promise.resolve({ key: "CHILD-1", fields: {} } as never),
    );
    getIssue = mock(() =>
      Promise.resolve({
        key: "CHILD-1",
        fields: {
          parent: null,
          customfield_10014: "EPIC-1",
        },
      } as never),
    );
    resolve = mock(() =>
      Promise.resolve({ mode: "parent" as const, reason: "test" }),
    );
    tryOptionalSingleEpicLinkFieldFromEditMeta = mock(() =>
      Promise.resolve("customfield_10014"),
    );
    useCase = new RemoveIssueEpicUseCaseImpl(
      { execute: updateExecute },
      { getIssue } as unknown as IssueRepository,
      {
        resolve,
        tryOptionalSingleEpicLinkFieldFromEditMeta,
      } as unknown as EpicRelationResolver,
    );
  });

  test("parent mode clears parent", async () => {
    resolve.mockResolvedValue({ mode: "parent", reason: "x" });
    getIssue.mockResolvedValueOnce({
      key: "CHILD-1",
      fields: {
        parent: { key: "EPIC-1" },
        customfield_10014: "EPIC-1",
      },
    });

    await useCase.execute({
      issueKey: "CHILD-1",
      relationMode: "parent",
      notifyUsers: true,
    });

    expect(updateExecute).toHaveBeenCalledWith({
      issueKey: "CHILD-1",
      fields: { parent: null },
      notifyUsers: true,
    });
  });

  test("epicLink mode sets customfield to null", async () => {
    resolve.mockResolvedValue({
      mode: "epicLink",
      epicLinkFieldId: "customfield_10014",
      reason: "x",
    });

    await useCase.execute({
      issueKey: "CHILD-1",
      relationMode: "epicLink",
      epicFieldId: "customfield_10014",
      notifyUsers: false,
    });

    expect(updateExecute).toHaveBeenCalledWith({
      issueKey: "CHILD-1",
      fields: { customfield_10014: null },
      notifyUsers: false,
    });
  });

  test("auto mode clears classic Epic Link when parent is absent", async () => {
    resolve.mockResolvedValue({
      mode: "epicLink",
      epicLinkFieldId: "customfield_10014",
      reason: "x",
    });

    await useCase.execute({
      issueKey: "CHILD-1",
      relationMode: "auto",
      notifyUsers: true,
    });

    expect(updateExecute).toHaveBeenCalledWith({
      issueKey: "CHILD-1",
      fields: { customfield_10014: null },
      notifyUsers: true,
    });
  });

  test("auto mode rejects ambiguous parent plus Epic Link state", async () => {
    getIssue.mockResolvedValueOnce({
      key: "CHILD-1",
      fields: {
        parent: { key: "EPIC-1" },
      },
    });
    getIssue.mockResolvedValueOnce({
      key: "CHILD-1",
      fields: {
        parent: { key: "EPIC-1" },
        customfield_10014: "EPIC-1",
      },
    });

    await expect(
      useCase.execute({
        issueKey: "CHILD-1",
        relationMode: "auto",
        notifyUsers: true,
      }),
    ).rejects.toThrow(/both parent and Epic Link data available/);

    expect(updateExecute).not.toHaveBeenCalled();
  });
});
