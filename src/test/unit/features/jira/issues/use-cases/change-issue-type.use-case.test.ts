import { beforeEach, describe, expect, mock, test } from "bun:test";
import { ChangeIssueTypeParamsValidationError } from "@features/jira/issues/validators/errors";
import { ChangeIssueTypeUseCaseImpl } from "@features/jira/issues/use-cases/change-issue-type.use-case";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("ChangeIssueTypeUseCase", () => {
  let updateExecute: ReturnType<typeof mock>;
  let getIssueEditMetaFields: ReturnType<typeof mock>;
  let resolveCustomExecute: ReturnType<typeof mock>;
  let useCase: ChangeIssueTypeUseCaseImpl;

  beforeEach(() => {
    updateExecute = mock(() =>
      Promise.resolve({
        key: "PROJ-1",
        fields: { issuetype: { name: "Epic" } },
      } as never),
    );
    getIssueEditMetaFields = mock(() =>
      Promise.resolve({
        issuetype: { operations: ["set"] },
      } as never),
    );
    resolveCustomExecute = mock(() =>
      Promise.resolve({ customfield_1: "v" } as Record<string, unknown>),
    );
    useCase = new ChangeIssueTypeUseCaseImpl(
      { execute: updateExecute },
      {
        getIssueEditMetaFields,
        getIssueCustomFieldMetadata: mock(() => Promise.resolve([])),
      },
      { execute: resolveCustomExecute },
    );
  });

  test("validateOnly does not call update", async () => {
    const r = await useCase.execute({
      issueKey: "PROJ-1",
      validateOnly: true,
      notifyUsers: true,
    });

    expect(r.kind).toBe("validated");
    if (r.kind === "validated") {
      expect(r.issuetypeEditable).toBe(true);
      expect(r.operations).toEqual(["set"]);
    }
    expect(updateExecute).not.toHaveBeenCalled();
  });

  test("validateOnly reports issuetype not editable when operations lack set/edit", async () => {
    getIssueEditMetaFields.mockResolvedValue({
      issuetype: { operations: [] },
    });

    const r = await useCase.execute({
      issueKey: "PROJ-1",
      validateOnly: true,
      notifyUsers: true,
    });

    expect(r.kind).toBe("validated");
    if (r.kind === "validated") {
      expect(r.issuetypeEditable).toBe(false);
      expect(r.operations).toEqual([]);
    }
    expect(updateExecute).not.toHaveBeenCalled();
  });

  test("update path throws when neither issueTypeName nor issueTypeId", async () => {
    await expect(
      useCase.execute({
        issueKey: "PROJ-1",
        validateOnly: false,
        notifyUsers: true,
      }),
    ).rejects.toThrow(/exactly one of issueTypeName or issueTypeId/);
  });

  test("update path throws when both issueTypeName and issueTypeId", async () => {
    await expect(
      useCase.execute({
        issueKey: "PROJ-1",
        issueTypeName: "Story",
        issueTypeId: "10001",
        validateOnly: false,
        notifyUsers: true,
      }),
    ).rejects.toThrow(/exactly one of issueTypeName or issueTypeId/);
  });

  test("update sends issuetype by name and merges resolved custom fields", async () => {
    await useCase.execute({
      issueKey: "PROJ-1",
      issueTypeName: "Epic",
      requiredFields: { fixVersions: [] },
      customFields: { someField: "x" },
      notifyUsers: true,
      validateOnly: false,
    });

    expect(resolveCustomExecute).toHaveBeenCalledWith({
      issueKey: "PROJ-1",
      customFields: { someField: "x" },
    });
    expect(updateExecute).toHaveBeenCalledWith({
      issueKey: "PROJ-1",
      fields: {
        issuetype: { name: "Epic" },
        fixVersions: [],
        customfield_1: "v",
      },
      notifyUsers: true,
    });
  });

  test("rejects overlapping keys between requiredFields and resolved customFields", async () => {
    resolveCustomExecute.mockResolvedValue({
      customfield_1: "fromResolved",
    });

    const rejection = useCase.execute({
      issueKey: "PROJ-1",
      issueTypeName: "Epic",
      requiredFields: { customfield_1: "fromRequired", fixVersions: [] },
      customFields: { someField: "x" },
      validateOnly: false,
      notifyUsers: true,
    });

    await expect(rejection).rejects.toBeInstanceOf(ChangeIssueTypeParamsValidationError);
    await expect(rejection).rejects.toThrow(/Conflicting field definitions for keys: customfield_1/);

    expect(updateExecute).not.toHaveBeenCalled();
  });

  test("requiredFields cannot override the validated issuetype", async () => {
    await useCase.execute({
      issueKey: "PROJ-1",
      issueTypeName: "Epic",
      requiredFields: { issuetype: { name: "Story" }, fixVersions: [] },
      validateOnly: false,
      notifyUsers: true,
    });

    expect(updateExecute).toHaveBeenCalledWith({
      issueKey: "PROJ-1",
      fields: {
        fixVersions: [],
        issuetype: { name: "Epic" },
      },
      notifyUsers: true,
    });
  });

  test("update sends issuetype by id when issueTypeId provided", async () => {
    await useCase.execute({
      issueKey: "PROJ-1",
      issueTypeId: "10001",
      validateOnly: false,
      notifyUsers: true,
    });

    expect(updateExecute).toHaveBeenCalledWith({
      issueKey: "PROJ-1",
      fields: { issuetype: { id: "10001" } },
      notifyUsers: true,
    });
  });
});
