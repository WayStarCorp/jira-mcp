/**
 * Issue transition validators
 *
 * Zod schemas for transition-related MCP tools.
 */

import { z } from "zod";
import { issueKeySchema } from "./issue-params.validator";

/**
 * Parameters for listing issue transitions.
 */
export const getIssueTransitionsParamsSchema = z.object({
  issueKey: issueKeySchema,
});

export type GetIssueTransitionsParams = z.infer<
  typeof getIssueTransitionsParamsSchema
>;

/**
 * Parameters for applying an issue transition.
 */
export const workflowTransitionIssueFieldsSchema = z.object({
  issueKey: issueKeySchema,
  transitionId: z.string().min(1).optional(),
  statusName: z.string().min(1).optional(),
  fields: z.record(z.string(), z.unknown()).optional(),
});

export const workflowTransitionIssueParamsSchema =
  workflowTransitionIssueFieldsSchema.superRefine((data, ctx) => {
    const hasTransitionId = data.transitionId !== undefined;
    const hasStatusName = data.statusName !== undefined;

    if (hasTransitionId === hasStatusName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide exactly one of transitionId or statusName.",
      });
    }
  });

export type WorkflowTransitionIssueParams = z.infer<
  typeof workflowTransitionIssueParamsSchema
>;
