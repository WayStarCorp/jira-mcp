import { describe, expect, it } from "bun:test";
import {
  getIssueLinkTypesParamsSchema,
  linkIssuesFieldsSchema,
  linkIssuesParamsSchema,
} from "@features/jira/issues/validators/issue-link.validator";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("Issue link validator schemas", () => {
  it("accepts empty params for getIssueLinkTypes", () => {
    const result = getIssueLinkTypesParamsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid link params", () => {
    const result = linkIssuesParamsSchema.safeParse({
      inwardIssueKey: "PROJ-200",
      outwardIssueKey: "PROJ-100",
      linkTypeName: "Blocks",
    });

    expect(result.success).toBe(true);
  });

  it("rejects self-linking issues", () => {
    const result = linkIssuesParamsSchema.safeParse({
      inwardIssueKey: "PROJ-100",
      outwardIssueKey: "PROJ-100",
      linkTypeName: "Blocks",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "Cannot link an issue to itself",
      );
    }
  });

  it("exposes shape for tool config", () => {
    expect(linkIssuesFieldsSchema.shape.inwardIssueKey).toBeDefined();
    expect(linkIssuesFieldsSchema.shape.outwardIssueKey).toBeDefined();
    expect(linkIssuesFieldsSchema.shape.linkTypeName).toBeDefined();
  });
});
