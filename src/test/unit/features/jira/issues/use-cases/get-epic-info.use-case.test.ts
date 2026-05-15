import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { IssueRepository } from "@features/jira/issues/repositories/issue.repository";
import {
  EPIC_CHILDREN_SKIPPED_MISSING_EPIC_FIELD_ID,
  GetEpicInfoUseCaseImpl,
} from "@features/jira/issues/use-cases/get-epic-info.use-case";
import type { EpicRelationResolver } from "@features/jira/issues/use-cases/epic-relation-resolver";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("GetEpicInfoUseCase", () => {
  let getIssue: ReturnType<typeof mock>;
  let searchExecute: ReturnType<typeof mock>;
  let resolve: ReturnType<typeof mock>;
  let tryOptionalSingleEpicLinkFieldFromEditMeta: ReturnType<typeof mock>;
  let useCase: GetEpicInfoUseCaseImpl;

  beforeEach(() => {
    getIssue = mock(() =>
      Promise.resolve({
        key: "E-1",
        fields: {
          summary: "Epic",
          issuetype: { name: "Epic" },
          parent: null,
          issuelinks: [],
        },
      }),
    );
    searchExecute = mock(() => Promise.resolve([]));
    resolve = mock(() =>
      Promise.resolve({
        mode: "epicLink" as const,
        epicLinkFieldId: "customfield_10",
        reason: "test",
      }),
    );
    tryOptionalSingleEpicLinkFieldFromEditMeta = mock(() =>
      Promise.resolve(undefined),
    );
    useCase = new GetEpicInfoUseCaseImpl(
      { getIssue } as unknown as IssueRepository,
      { execute: searchExecute },
      {
        resolve,
        tryOptionalSingleEpicLinkFieldFromEditMeta,
      } as unknown as EpicRelationResolver,
    );
  });

  test("reads epic link raw value when resolver is epicLink", async () => {
    getIssue.mockResolvedValue({
      key: "CH-1",
      fields: {
        summary: "Child",
        issuetype: { name: "Story" },
        customfield_10: "E-1",
      },
    });

    const r = await useCase.execute({
      issueKey: "CH-1",
      relationMode: "auto",
      includeChildren: false,
      maxChildren: 25,
    });

    expect(r.epicLinkValue).toBe("E-1");
    expect(r.treatsAsEpic).toBe(false);
    expect(r.childrenListedFromParentOnly).toBe(false);
    expect(resolve).toHaveBeenCalled();
    expect(getIssue).toHaveBeenCalledWith(
      "CH-1",
      expect.arrayContaining(["summary", "customfield_10"]),
    );
  });

  test("includes epicFieldId in getIssue and reads Epic Link when resolve throws", async () => {
    resolve.mockRejectedValue(new Error("resolve failed"));
    getIssue.mockResolvedValue({
      key: "CH-1",
      fields: {
        summary: "Child",
        issuetype: { name: "Story" },
        parent: null,
        issuelinks: [],
        customfield_10: "E-1",
      },
    });

    const r = await useCase.execute({
      issueKey: "CH-1",
      relationMode: "auto",
      includeChildren: false,
      maxChildren: 25,
      epicFieldId: "customfield_10",
    });

    expect(r.resolveError).toContain("resolve failed");
    expect(r.resolvedRelation).toBeNull();
    expect(r.epicLinkValue).toBe("E-1");
    expect(r.childrenListedFromParentOnly).toBe(false);
    expect(getIssue).toHaveBeenCalledWith(
      "CH-1",
      expect.arrayContaining(["customfield_10"]),
    );
  });

  test("includeChildren with auto falls back to Epic Link JQL using resolver field id when parent is empty", async () => {
    searchExecute
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ key: "C-1" }]);

    const r = await useCase.execute({
      issueKey: "E-1",
      relationMode: "auto",
      includeChildren: true,
      maxChildren: 5,
    });

    expect(r.children.map((x) => x.key)).toEqual(["C-1"]);
    expect(r.childrenListedFromParentOnly).toBe(false);
    expect(searchExecute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        jql: 'parent = "E-1" ORDER BY updated DESC',
      }),
    );
    expect(searchExecute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        jql: 'cf[10] = "E-1" ORDER BY updated DESC',
        maxResults: 5,
      }),
    );
    expect(tryOptionalSingleEpicLinkFieldFromEditMeta).not.toHaveBeenCalled();
    expect(r.childrenNote).toBeNull();
  });

  test("auto epic children merges parent + Epic Link (dedupe by key, cap maxChildren, sort by updated desc)", async () => {
    searchExecute
      .mockResolvedValueOnce([
        {
          key: "C-PARENT",
          fields: { updated: "2024-01-02T00:00:00.000+0000" },
        },
      ])
      .mockResolvedValueOnce([
        {
          key: "C-LINK",
          fields: { updated: "2024-06-01T00:00:00.000+0000" },
        },
        {
          key: "C-PARENT",
          fields: { updated: "2024-03-01T00:00:00.000+0000" },
        },
      ]);

    const r = await useCase.execute({
      issueKey: "E-1",
      relationMode: "auto",
      includeChildren: true,
      maxChildren: 10,
    });

    expect(searchExecute).toHaveBeenCalledTimes(2);
    expect(r.children.map((x) => x.key)).toEqual(["C-LINK", "C-PARENT"]);
    expect(r.childrenListedFromParentOnly).toBe(false);
    expect(r.childrenNote).toBeNull();
  });

  test("epic includeChildren auto: when resolve is parent-only, probes editmeta for single Epic Link cf", async () => {
    resolve.mockResolvedValue({
      mode: "parent" as const,
      reason: "auto: parent editable in editmeta",
    });
    tryOptionalSingleEpicLinkFieldFromEditMeta.mockResolvedValue(
      "customfield_10",
    );
    searchExecute
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ key: "C-1" }]);

    const r = await useCase.execute({
      issueKey: "E-1",
      relationMode: "auto",
      includeChildren: true,
      maxChildren: 5,
    });

    expect(r.children.map((x) => x.key)).toEqual(["C-1"]);
    expect(r.childrenListedFromParentOnly).toBe(false);
    expect(tryOptionalSingleEpicLinkFieldFromEditMeta).toHaveBeenCalledWith(
      "E-1",
    );
    expect(searchExecute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        jql: 'cf[10] = "E-1" ORDER BY updated DESC',
        maxResults: 5,
      }),
    );
    expect(r.childrenNote).toBeNull();
  });

  test("auto epic children sets childrenNote when editmeta probe finds no Epic Link field (parent JQL empty)", async () => {
    resolve.mockResolvedValue({
      mode: "parent" as const,
      reason: "auto: parent editable in editmeta",
    });
    tryOptionalSingleEpicLinkFieldFromEditMeta.mockResolvedValue(undefined);
    searchExecute.mockResolvedValueOnce([]);

    const r = await useCase.execute({
      issueKey: "E-1",
      relationMode: "auto",
      includeChildren: true,
      maxChildren: 5,
    });

    expect(r.children).toEqual([]);
    expect(r.childrenListedFromParentOnly).toBe(true);
    expect(r.childrenNote).toBe(EPIC_CHILDREN_SKIPPED_MISSING_EPIC_FIELD_ID);
    expect(searchExecute).toHaveBeenCalledTimes(1);
  });

  test("auto epic lists non-empty children from parent search only when Epic Link cf id unavailable", async () => {
    resolve.mockResolvedValue({
      mode: "parent" as const,
      reason: "parent mode",
    });
    tryOptionalSingleEpicLinkFieldFromEditMeta.mockResolvedValue(undefined);
    searchExecute.mockResolvedValueOnce([
      {
        key: "C-P ONLY",
        fields: {
          summary: "S",
          issuetype: { name: "Story" },
          status: { name: "Open" },
          updated: "2024-06-02T12:00:00.000+0000",
        },
      },
    ]);

    const r = await useCase.execute({
      issueKey: "E-1",
      relationMode: "auto",
      includeChildren: true,
      maxChildren: 5,
    });

    expect(searchExecute).toHaveBeenCalledTimes(1);
    expect(r.childrenListedFromParentOnly).toBe(true);
    expect(r.childrenNote).toBe(EPIC_CHILDREN_SKIPPED_MISSING_EPIC_FIELD_ID);
    expect(r.children.map((x) => x.key)).toEqual(["C-P ONLY"]);
  });

  test("includeChildren runs JQL when is epic", async () => {
    searchExecute.mockResolvedValue([{ key: "C-1" }]);

    const r = await useCase.execute({
      issueKey: "E-1",
      relationMode: "parent",
      includeChildren: true,
      maxChildren: 5,
    });

    expect(r.childrenListedFromParentOnly).toBe(true);
    expect(searchExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        jql: 'parent = "E-1" ORDER BY updated DESC',
        maxResults: 5,
      }),
    );
  });

  test("includeChildren with relationMode epicLink and no customfield id returns empty children without throwing", async () => {
    resolve.mockResolvedValue({
      mode: "parent" as const,
      reason: "no epic link in editmeta",
    });

    const r = await useCase.execute({
      issueKey: "E-1",
      relationMode: "epicLink",
      includeChildren: true,
      maxChildren: 5,
    });

    expect(r.children).toEqual([]);
    expect(r.childrenListedFromParentOnly).toBe(false);
    expect(r.childrenNote).toBe(EPIC_CHILDREN_SKIPPED_MISSING_EPIC_FIELD_ID);
    expect(searchExecute).not.toHaveBeenCalled();
  });

  test("treatsAsEpic respects epicIssuetypeName for non-English Epic label", async () => {
    getIssue.mockResolvedValue({
      key: "E-1",
      fields: {
        summary: "Эпик задача",
        issuetype: { name: "Эпик" },
        parent: null,
        issuelinks: [],
      },
    });
    searchExecute.mockResolvedValue([{ key: "C-1" }]);

    const r = await useCase.execute({
      issueKey: "E-1",
      relationMode: "parent",
      includeChildren: true,
      epicIssuetypeName: "Эпик",
      maxChildren: 5,
    });

    expect(r.treatsAsEpic).toBe(true);
    expect(r.epicIssuetypeNameCompared).toBe("Эпик");
    expect(r.childrenListedFromParentOnly).toBe(true);
    expect(searchExecute).toHaveBeenCalled();
  });
});
