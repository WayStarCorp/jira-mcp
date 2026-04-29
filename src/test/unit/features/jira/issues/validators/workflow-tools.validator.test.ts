/**
 * Workflow tool validator tests
 */

import { describe, expect, it } from "bun:test";
import { workflowTransitionIssueParamsSchema } from "@features/jira/issues/validators/issue-transition.validator";
import { addIssuesToSprintParamsSchema } from "@features/jira/sprints/validators";
import { assignIssueParamsSchema } from "@features/jira/users/validators/user-search.validator";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("workflow tool validator schemas", () => {
  describe("addIssuesToSprintParamsSchema", () => {
    it("accepts exactly one sprintId", () => {
      const result = addIssuesToSprintParamsSchema.safeParse({
        issueKeys: ["PROJ-1"],
        sprintId: 11,
      });

      expect(result.success).toBe(true);
    });

    it("rejects neither sprintId nor boardId", () => {
      const result = addIssuesToSprintParamsSchema.safeParse({
        issueKeys: ["PROJ-1"],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          "Provide exactly one of sprintId",
        );
      }
    });

    it("rejects both sprintId and boardId", () => {
      const result = addIssuesToSprintParamsSchema.safeParse({
        issueKeys: ["PROJ-1"],
        sprintId: 11,
        boardId: 22,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          "Provide exactly one of sprintId",
        );
      }
    });
  });

  describe("assignIssueParamsSchema", () => {
    it("accepts exactly one accountId", () => {
      const result = assignIssueParamsSchema.safeParse({
        issueKey: "PROJ-1",
        accountId: "account-123",
      });

      expect(result.success).toBe(true);
    });

    it("rejects neither accountId nor query", () => {
      const result = assignIssueParamsSchema.safeParse({
        issueKey: "PROJ-1",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          "Provide exactly one of accountId or query.",
        );
      }
    });

    it("rejects both accountId and query", () => {
      const result = assignIssueParamsSchema.safeParse({
        issueKey: "PROJ-1",
        accountId: "account-123",
        query: "john",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          "Provide exactly one of accountId or query.",
        );
      }
    });
  });

  describe("workflowTransitionIssueParamsSchema", () => {
    it("accepts exactly one transitionId", () => {
      const result = workflowTransitionIssueParamsSchema.safeParse({
        issueKey: "PROJ-1",
        transitionId: "11",
      });

      expect(result.success).toBe(true);
    });

    it("rejects neither transitionId nor statusName", () => {
      const result = workflowTransitionIssueParamsSchema.safeParse({
        issueKey: "PROJ-1",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          "Provide exactly one of transitionId or statusName.",
        );
      }
    });

    it("rejects both transitionId and statusName", () => {
      const result = workflowTransitionIssueParamsSchema.safeParse({
        issueKey: "PROJ-1",
        transitionId: "11",
        statusName: "In Progress",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          "Provide exactly one of transitionId or statusName.",
        );
      }
    });
  });
});
