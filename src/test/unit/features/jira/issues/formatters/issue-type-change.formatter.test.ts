import { beforeEach, describe, expect, test } from "bun:test";
import { IssueTypeChangeFormatter } from "@features/jira/issues/formatters/issue-type-change.formatter";
import { testDataBuilder } from "@test/utils/mock-helpers";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("IssueTypeChangeFormatter", () => {
  let formatter: IssueTypeChangeFormatter;

  beforeEach(() => {
    formatter = new IssueTypeChangeFormatter();
  });

  test("formats validated branch (not editable, no operations)", () => {
    const out = formatter.format({
      kind: "validated",
      issueKey: "PROJ-1",
      issuetypeEditable: false,
      operations: [],
    });

    expect(out).toContain("# Issue type — validate only");
    expect(out).toContain("PROJ-1");
    expect(out).toContain("issuetype field editable**: no");
    expect(out).toContain("**Operations**: —");
  });

  test("formats validated branch with operations list", () => {
    const out = formatter.format({
      kind: "validated",
      issueKey: "X-2",
      issuetypeEditable: true,
      operations: ["set", "edit"],
    });

    expect(out).toContain("issuetype field editable**: yes");
    expect(out).toContain("set, edit");
  });

  test("formats updated branch", () => {
    const issue = testDataBuilder.issueWithStatus("Open", "blue");
    issue.key = "PROJ-9";

    const out = formatter.format({ kind: "updated", issue });

    expect(out).toContain("# Issue type updated");
    expect(out).toContain("PROJ-9");
    expect(out).toContain("Issue Updated Successfully");
  });
});
