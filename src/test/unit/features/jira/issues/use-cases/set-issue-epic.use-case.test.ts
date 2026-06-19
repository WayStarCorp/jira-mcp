import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { IssueRepository } from "@features/jira/issues/repositories/issue.repository";
import type { EpicRelationResolver } from "@features/jira/issues/use-cases/epic-relation-resolver";
import { SetIssueEpicUseCaseImpl } from "@features/jira/issues/use-cases/set-issue-epic.use-case";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("SetIssueEpicUseCase", () => {
  let updateExecute: ReturnType<typeof mock>;
  let getIssue: ReturnType<typeof mock>;
  let resolve: ReturnType<typeof mock>;
  let useCase: SetIssueEpicUseCaseImpl;

  beforeEach(() => {
    updateExecute = mock(() =>
      Promise.resolve({ key: "CHILD-1", fields: {} } as never),
    );
    getIssue = mock(() =>
      Promise.resolve({
        fields: { issuetype: { name: "Epic" } },
      } as never),
    );
    resolve = mock(() =>
      Promise.resolve({ mode: "parent" as const, reason: "test" }),
    );
    useCase = new SetIssueEpicUseCaseImpl(
      { execute: updateExecute },
      { getIssue } as unknown as IssueRepository,
      { resolve } as unknown as EpicRelationResolver,
    );
  });

  test("parent mode sends fields.parent with epic key", async () => {
    resolve.mockResolvedValue({
      mode: "parent",
      reason: "editmeta",
    });

    await useCase.execute({
      issueKey: "CHILD-1",
      epicIssueKey: "EPIC-1",
      relationMode: "parent",
      validateEpicType: true,
      notifyUsers: true,
    });

    expect(updateExecute).toHaveBeenCalledWith({
      issueKey: "CHILD-1",
      fields: { parent: { key: "EPIC-1" } },
      notifyUsers: true,
    });
  });

  test("epicLink mode sends customfield payload", async () => {
    resolve.mockResolvedValue({
      mode: "epicLink",
      epicLinkFieldId: "customfield_10014",
      reason: "explicit",
    });

    await useCase.execute({
      issueKey: "CHILD-1",
      epicIssueKey: "EPIC-1",
      relationMode: "epicLink",
      epicFieldId: "customfield_10014",
      validateEpicType: true,
      notifyUsers: false,
    });

    expect(updateExecute).toHaveBeenCalledWith({
      issueKey: "CHILD-1",
      fields: { customfield_10014: "EPIC-1" },
      notifyUsers: false,
    });
  });

  test("epicLink mode without epicLinkFieldId throws before update", async () => {
    resolve.mockResolvedValue({
      mode: "epicLink",
      reason: "broken resolver state",
      // intentionally omit epicLinkFieldId — should not emit update payload
    });

    await expect(
      useCase.execute({
        issueKey: "CHILD-1",
        epicIssueKey: "EPIC-1",
        relationMode: "epicLink",
        epicFieldId: "customfield_10014",
        validateEpicType: false,
        notifyUsers: true,
      }),
    ).rejects.toThrow(/epicLinkFieldId is missing/);

    expect(updateExecute).not.toHaveBeenCalled();
  });

  test("validateEpicType rejects non-epic target", async () => {
    getIssue.mockResolvedValue({
      fields: { issuetype: { name: "Story" } },
    });

    await expect(
      useCase.execute({
        issueKey: "CHILD-1",
        epicIssueKey: "NOT-EPIC-1",
        relationMode: "parent",
        validateEpicType: true,
        notifyUsers: true,
      }),
    ).rejects.toThrow(/does not match issuetype 'Epic'/);

    expect(updateExecute).not.toHaveBeenCalled();
  });

  test("validateEpicType accepts epicIssuetypeName for localized Epic label", async () => {
    getIssue.mockResolvedValue({
      fields: { issuetype: { name: "Эпик" } },
    });

    await useCase.execute({
      issueKey: "CHILD-1",
      epicIssueKey: "EPIC-1",
      relationMode: "parent",
      validateEpicType: true,
      epicIssuetypeName: "Эпик",
      notifyUsers: true,
    });

    expect(updateExecute).toHaveBeenCalled();
  });
});
