import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { IssueEditMetaField } from "@features/jira/issues/models/custom-field.models";
import { EpicRelationResolver } from "@features/jira/issues/use-cases/epic-relation-resolver";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("EpicRelationResolver", () => {
  let getIssueEditMetaFields: ReturnType<typeof mock>;
  let resolver: EpicRelationResolver;

  beforeEach(() => {
    getIssueEditMetaFields = mock();
    resolver = new EpicRelationResolver({
      getIssueEditMetaFields,
    });
  });

  test("auto prefers parent when parent is editable", async () => {
    const meta: Record<string, IssueEditMetaField> = {
      parent: { operations: ["set"] },
      customfield_10014: {
        name: "Epic Link",
        operations: ["set"],
        schema: { custom: "com.pyxis.greenhopper.jira:gh-epic-link" },
      },
    };
    getIssueEditMetaFields.mockResolvedValue(meta);

    const r = await resolver.resolve({
      childIssueKey: "PROJ-1",
      mode: "auto",
    });

    expect(r.mode).toBe("parent");
  });

  test("auto uses single Epic Link candidate when parent not editable", async () => {
    const meta: Record<string, IssueEditMetaField> = {
      customfield_10014: {
        name: "Epic Link",
        operations: ["set"],
        schema: { custom: "com.pyxis.greenhopper.jira:gh-epic-link" },
      },
    };
    getIssueEditMetaFields.mockResolvedValue(meta);

    const r = await resolver.resolve({
      childIssueKey: "PROJ-1",
      mode: "auto",
    });

    expect(r.mode).toBe("epicLink");
    expect(r.epicLinkFieldId).toBe("customfield_10014");
  });

  test("auto with epicFieldId forces epicLink even if parent editable", async () => {
    const meta: Record<string, IssueEditMetaField> = {
      parent: { operations: ["set"] },
      customfield_10014: {
        name: "Epic Link",
        operations: ["set"],
        schema: { custom: "com.pyxis.greenhopper.jira:gh-epic-link" },
      },
    };
    getIssueEditMetaFields.mockResolvedValue(meta);

    const r = await resolver.resolve({
      childIssueKey: "PROJ-1",
      mode: "auto",
      epicFieldId: "customfield_10014",
    });

    expect(r.mode).toBe("epicLink");
    expect(r.epicLinkFieldId).toBe("customfield_10014");
  });

  test("auto throws when multiple epic candidates and no epicFieldId", async () => {
    const meta: Record<string, IssueEditMetaField> = {
      customfield_1: {
        name: "Epic Link",
        operations: ["set"],
        schema: { custom: "com.pyxis.greenhopper.jira:gh-epic-link" },
      },
      customfield_2: {
        name: "Epic Link (team)",
        operations: ["set"],
        schema: { custom: "com.pyxis.greenhopper.jira:gh-epic-link" },
      },
    };
    getIssueEditMetaFields.mockResolvedValue(meta);

    await expect(
      resolver.resolve({ childIssueKey: "PROJ-1", mode: "auto" }),
    ).rejects.toThrow(/Multiple Epic Link candidates/);
  });

  test("parent mode throws when parent not editable", async () => {
    getIssueEditMetaFields.mockResolvedValue({
      customfield_1: { name: "Epic Link", operations: ["set"] },
    });

    await expect(
      resolver.resolve({ childIssueKey: "PROJ-1", mode: "parent" }),
    ).rejects.toThrow(/parent.*not editable/);
  });

  test("epicLink explicit id validates against editmeta", async () => {
    getIssueEditMetaFields.mockResolvedValue({
      customfield_99: { name: "Epic Link", operations: ["set"] },
    });

    const r = await resolver.resolve({
      childIssueKey: "PROJ-1",
      mode: "epicLink",
      epicFieldId: "customfield_99",
    });

    expect(r.epicLinkFieldId).toBe("customfield_99");
  });

  test.each(["__proto__", "constructor", "prototype"] as const)(
    "epicLink rejects proto-pollution-style epicFieldId (%s)",
    async (unsafeId) => {
      getIssueEditMetaFields.mockResolvedValue({});

      await expect(
        resolver.resolve({
          childIssueKey: "PROJ-1",
          mode: "epicLink",
          epicFieldId: unsafeId,
        }),
      ).rejects.toThrow(/Invalid epicFieldId/);
    },
  );

  describe("tryOptionalSingleEpicLinkFieldFromEditMeta", () => {
    test("returns undefined when zero candidates", async () => {
      getIssueEditMetaFields.mockResolvedValue({
        summary: { name: "Summary", operations: ["set"] },
      });

      const id = await resolver.tryOptionalSingleEpicLinkFieldFromEditMeta(
        "PROJ-1",
      );
      expect(id).toBeUndefined();
    });

    test("returns field id when exactly one candidate", async () => {
      getIssueEditMetaFields.mockResolvedValue({
        customfield_10014: {
          name: "Epic Link",
          operations: ["set"],
          schema: { custom: "com.pyxis.greenhopper.jira:gh-epic-link" },
        },
      });

      const id = await resolver.tryOptionalSingleEpicLinkFieldFromEditMeta(
        "PROJ-1",
      );
      expect(id).toBe("customfield_10014");
    });

    test("returns undefined when multiple candidates", async () => {
      getIssueEditMetaFields.mockResolvedValue({
        customfield_1: {
          name: "Epic Link",
          operations: ["set"],
          schema: { custom: "com.pyxis.greenhopper.jira:gh-epic-link" },
        },
        customfield_2: {
          name: "Epic Link (team)",
          operations: ["set"],
          schema: { custom: "com.pyxis.greenhopper.jira:gh-epic-link" },
        },
      });

      const id = await resolver.tryOptionalSingleEpicLinkFieldFromEditMeta(
        "PROJ-1",
      );
      expect(id).toBeUndefined();
    });
  });
});
