import { describe, expect, it } from "bun:test";
import { EpicInfoFormatter } from "@features/jira/issues/formatters/epic-info.formatter";
import {
  EPIC_CHILDREN_SKIPPED_MISSING_EPIC_FIELD_ID,
  type EpicInfoResult,
} from "@features/jira/issues/use-cases/get-epic-info.use-case";
import { createMockIssue } from "@test/mocks/issues/issue-mock-factory";
import { setupTests } from "@test/utils/test-setup";

setupTests();

function minimalResult(
  overrides: Partial<EpicInfoResult> = {},
): EpicInfoResult {
  return {
    issue: createMockIssue({
      key: "E-1",
      id: "1",
      self: "https://test.atlassian.net/rest/api/3/issue/1",
      fields: {
        summary: "Epic",
        issuetype: { name: "Epic" },
      },
    }),
    resolvedRelation: null,
    resolveError: null,
    epicLinkValue: null,
    children: [],
    childrenNote: null,
    childrenListedFromParentOnly: false,
    treatsAsEpic: true,
    epicIssuetypeNameCompared: "Epic",
    ...overrides,
  };
}

describe("EpicInfoFormatter", () => {
  const formatter = new EpicInfoFormatter();

  it("adds parent-only sourcing line when epic children merged from parent JQL alone", () => {
    const out = formatter.format(
      minimalResult({
        children: [
          {
            id: "2",
            key: "C-1",
            self: "https://test.atlassian.net/rest/api/3/issue/2",
            fields: {
              summary: "Child",
              issuetype: { name: "Story" },
              status: { name: "To Do" },
              updated: "2024-01-01T10:00:00.000+0000",
            },
          },
        ],
        childrenListedFromParentOnly: true,
      }),
    );

    expect(out).toContain("parent hierarchy");
    expect(out).toContain("Classic Epic Link JQL was not merged");
  });

  it("includes childrenNote under child table when list is non-empty", () => {
    const out = formatter.format(
      minimalResult({
        children: [
          {
            id: "2",
            key: "C-1",
            self: "https://test.atlassian.net/rest/api/3/issue/2",
            fields: {
              summary: "Child",
              issuetype: { name: "Story" },
              status: { name: "To Do" },
              updated: "2024-01-01T10:00:00.000+0000",
            },
          },
        ],
        childrenListedFromParentOnly: true,
        childrenNote: EPIC_CHILDREN_SKIPPED_MISSING_EPIC_FIELD_ID,
      }),
    );

    expect(out).toContain("parent hierarchy");
    expect(out).toContain(EPIC_CHILDREN_SKIPPED_MISSING_EPIC_FIELD_ID);
  });

  it("omits parent-only line when Epic Link merge was applied", () => {
    const out = formatter.format(
      minimalResult({
        children: [
          {
            id: "2",
            key: "C-1",
            self: "https://test.atlassian.net/rest/api/3/issue/2",
            fields: {
              summary: "Child",
              issuetype: { name: "Story" },
              status: { name: "To Do" },
              updated: "2024-01-01T10:00:00.000+0000",
            },
          },
        ],
        childrenListedFromParentOnly: false,
      }),
    );

    expect(out).not.toContain("Classic Epic Link JQL was not merged");
  });

  it("omits Epic Link value line when value is empty or whitespace-only", () => {
    expect(
      formatter.format(minimalResult({ epicLinkValue: "" })),
    ).not.toContain("Epic Link value on issue");
    expect(
      formatter.format(minimalResult({ epicLinkValue: "   " })),
    ).not.toContain("Epic Link value on issue");
  });

  it("includes Epic Link value line when value is non-empty", () => {
    const out = formatter.format(minimalResult({ epicLinkValue: "PROJ-42" }));
    expect(out).toContain("**Epic Link value on issue**: PROJ-42");
  });
});
