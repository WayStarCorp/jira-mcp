import { describe, expect, it } from "bun:test";
import {
  IssueLinkTypesFormatter,
  IssueLinkedFormatter,
} from "@features/jira/issues/formatters/issue-link.formatter";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("IssueLinkTypesFormatter", () => {
  it("formats issue link types as markdown", () => {
    const formatter = new IssueLinkTypesFormatter();
    const output = formatter.format([
      {
        id: "10000",
        name: "Blocks",
        inward: "is blocked by",
        outward: "blocks",
      },
    ]);

    expect(output).toContain("# Issue Link Types");
    expect(output).toContain("Blocks");
    expect(output).toContain("is blocked by");
    expect(output).toContain("blocks");
  });
});

describe("IssueLinkedFormatter", () => {
  it("formats linked issues result", () => {
    const formatter = new IssueLinkedFormatter();
    const output = formatter.format({
      inwardIssueKey: "INV-200",
      outwardIssueKey: "INV-100",
      linkTypeName: "Blocks",
      comment: "Link comment",
    });

    expect(output).toContain("# Issue Linked");
    expect(output).toContain("INV-100");
    expect(output).toContain("INV-200");
    expect(output).toContain("Blocks");
    expect(output).toContain("Yes");
  });
});
