import { describe, expect, it } from "bun:test";
import { SprintState } from "@features/jira/sprints/models";
import type { GetSprintsParamsInput } from "@features/jira/sprints/validators";
import { SprintValidatorImpl } from "@features/jira/sprints/validators/sprint.validator";

describe("SprintValidatorImpl", () => {
  const validator = new SprintValidatorImpl();

  describe("validateGetSprintsParams", () => {
    it("accepts get sprints params without boardId", () => {
      const params: GetSprintsParamsInput = {
        state: SprintState.ACTIVE,
      };

      const result = validator.validateGetSprintsParams(params);

      expect(result).toEqual({
        state: SprintState.ACTIVE,
        startAt: 0,
        maxResults: 50,
      });
    });

    it("rejects non-positive boardId", () => {
      expect(() =>
        validator.validateGetSprintsParams({
          boardId: 0,
        }),
      ).toThrow("Invalid sprint retrieval parameters");
    });
  });
});
