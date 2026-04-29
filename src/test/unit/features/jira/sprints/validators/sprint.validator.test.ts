import { describe, expect, it } from "bun:test";
import { SprintState } from "@features/jira/sprints/models";
import { SprintValidatorImpl } from "@features/jira/sprints/validators/sprint.validator";

describe("SprintValidatorImpl", () => {
  const validator = new SprintValidatorImpl();

  describe("validateGetSprintsParams", () => {
    it("accepts get sprints params without boardId", () => {
      const result = validator.validateGetSprintsParams({
        state: SprintState.ACTIVE,
      });

      expect(result).toEqual({
        state: SprintState.ACTIVE,
        startAt: 0,
        maxResults: 50,
      });
    });
  });
});
