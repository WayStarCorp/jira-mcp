/**
 * User search and assignment validators
 *
 * Zod schemas for user search, assignable users, and assignee updates.
 */

import { issueKeySchema } from "@features/jira/issues/validators/issue-params.validator";
import { z } from "zod";

export const searchUsersParamsSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().min(1).max(50).optional().default(20),
});

export type SearchUsersParams = z.infer<typeof searchUsersParamsSchema>;

export const getAssignableUsersParamsSchema = z.object({
  issueKey: issueKeySchema,
  query: z.string().min(1).optional(),
  maxResults: z.number().int().min(1).max(50).optional().default(20),
});

export type GetAssignableUsersParams = z.infer<
  typeof getAssignableUsersParamsSchema
>;

export const assignIssueFieldsSchema = z.object({
  issueKey: issueKeySchema,
  accountId: z.string().min(1).optional(),
  query: z.string().min(1).optional(),
});

export const assignIssueParamsSchema = assignIssueFieldsSchema.superRefine(
  (data, ctx) => {
    const hasAccountId = data.accountId !== undefined;
    const hasQuery = data.query !== undefined;

    if (hasAccountId === hasQuery) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide exactly one of accountId or query.",
      });
    }
  },
);

export type AssignIssueParams = z.infer<typeof assignIssueParamsSchema>;
