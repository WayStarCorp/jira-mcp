import { describe, expect, test } from "bun:test";
import {
  changeIssueTypeParamsSchema,
  getEpicInfoParamsSchema,
} from "@features/jira/issues/validators/epic.validator";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("changeIssueTypeParamsSchema", () => {
  test("allows validateOnly without issue type", () => {
    const r = changeIssueTypeParamsSchema.safeParse({
      issueKey: "PROJ-1",
      validateOnly: true,
    });
    expect(r.success).toBe(true);
  });

  test("rejects both issueTypeName and issueTypeId when not validateOnly", () => {
    const r = changeIssueTypeParamsSchema.safeParse({
      issueKey: "PROJ-1",
      issueTypeName: "Story",
      issueTypeId: "1",
      validateOnly: false,
    });
    expect(r.success).toBe(false);
  });

  test("rejects neither name nor id when not validateOnly", () => {
    const r = changeIssueTypeParamsSchema.safeParse({
      issueKey: "PROJ-1",
      validateOnly: false,
    });
    expect(r.success).toBe(false);
  });

  test("rejects malformed epicFieldId values", () => {
    const r = getEpicInfoParamsSchema.safeParse({
      issueKey: "PROJ-1",
      epicFieldId: "customfield_10,summary",
    });
    expect(r.success).toBe(false);
  });
});
