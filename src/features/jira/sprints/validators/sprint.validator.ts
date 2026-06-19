/**
 * Sprint Validator
 *
 * Validator for sprint-related operations and parameters
 */

import { formatZodError } from "@core/utils/validation";
import { issueKeySchema } from "@features/jira/issues/validators/issue-params.validator";
import { z } from "zod";
import { SprintState } from "../models";
import {
  SprintIdValidationError,
  SprintParamsValidationError,
} from "./errors/sprint.error";

/**
 * Schema for getting sprints parameters
 */
export const getSprintsParamsSchema = z.object({
  boardId: z
    .number()
    .int()
    .min(1, "Board ID must be a positive integer")
    .optional(),

  // Pagination
  startAt: z.number().int().min(0).optional().default(0),
  maxResults: z.number().int().min(1).max(50).optional().default(50),

  // Filtering options
  state: z.nativeEnum(SprintState).optional(),
});

/**
 * Type for get sprints parameters input
 */
export type GetSprintsParamsInput = z.input<typeof getSprintsParamsSchema>;

/**
 * Type for get sprints parameters after validation
 */
export type GetSprintsParams = z.output<typeof getSprintsParamsSchema>;

/**
 * Schema for getting single sprint parameters
 */
export const getSprintParamsSchema = z.object({
  sprintId: z.number().int().min(1, "Sprint ID must be a positive integer"),
});

/**
 * Type for get sprint parameters
 */
export type GetSprintParams = z.infer<typeof getSprintParamsSchema>;

/**
 * Raw fields for add-to-sprint (MCP tool shape uses this; XOR validated separately).
 */
export const addIssuesToSprintFieldsSchema = z.object({
  issueKeys: z.array(issueKeySchema).min(1),
  sprintId: z.number().int().min(1).optional(),
  boardId: z.number().int().min(1).optional(),
});

/**
 * Add existing issues to a sprint: either explicit sprintId **or** boardId (active sprint).
 */
export const addIssuesToSprintParamsSchema =
  addIssuesToSprintFieldsSchema.superRefine((data, ctx) => {
    const hasSprint = data.sprintId !== undefined;
    const hasBoard = data.boardId !== undefined;
    if (hasSprint === hasBoard) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide exactly one of sprintId (explicit sprint) or boardId (use active sprint on that board).",
      });
    }
  });

export type AddIssuesToSprintParams = z.infer<
  typeof addIssuesToSprintParamsSchema
>;

/**
 * Interface for sprint validator
 */
export interface SprintValidator {
  /**
   * Validate get sprints parameters
   *
   * @param params - Parameters to validate
   * @returns Validated parameters
   */
  validateGetSprintsParams(params: GetSprintsParamsInput): GetSprintsParams;

  /**
   * Validate get sprint parameters
   *
   * @param params - Parameters to validate
   * @returns Validated parameters
   */
  validateGetSprintParams(params: GetSprintParams): GetSprintParams;

  /**
   * Validate add issues to sprint parameters
   */
  validateAddIssuesToSprintParams(
    params: AddIssuesToSprintParams,
  ): AddIssuesToSprintParams;
}

/**
 * Implementation of SprintValidator
 */
export class SprintValidatorImpl implements SprintValidator {
  /**
   * Validate parameters for getting sprints
   *
   * @param params - Parameters to validate
   * @returns Validated parameters
   * @throws SprintParamsValidationError - If validation fails
   */
  public validateGetSprintsParams(
    params: GetSprintsParamsInput,
  ): GetSprintsParams {
    const result = getSprintsParamsSchema.safeParse(params);

    if (!result.success) {
      const errorMessage = `Invalid sprint retrieval parameters: ${formatZodError(
        result.error,
      )}`;
      throw new SprintParamsValidationError(errorMessage, { params });
    }

    return result.data;
  }

  /**
   * Validate parameters for getting a single sprint
   *
   * @param params - Parameters to validate
   * @returns Validated parameters
   * @throws SprintIdValidationError - If validation fails
   */
  public validateGetSprintParams(params: GetSprintParams): GetSprintParams {
    const result = getSprintParamsSchema.safeParse(params);

    if (!result.success) {
      const errorMessage = `Invalid sprint ID: ${formatZodError(result.error)}`;
      throw new SprintIdValidationError(errorMessage, { params });
    }

    return result.data;
  }

  /**
   * Validate parameters for adding issues to a sprint
   */
  public validateAddIssuesToSprintParams(
    params: AddIssuesToSprintParams,
  ): AddIssuesToSprintParams {
    const result = addIssuesToSprintParamsSchema.safeParse(params);

    if (!result.success) {
      const errorMessage = `Invalid add-to-sprint parameters: ${formatZodError(
        result.error,
      )}`;
      throw new SprintParamsValidationError(errorMessage, { params });
    }

    return result.data;
  }
}
