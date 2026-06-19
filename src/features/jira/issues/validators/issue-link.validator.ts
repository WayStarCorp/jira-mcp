import { JIRA_MAX_COMMENT_LENGTH } from "@features/jira/shared/constants/jira-limits";
import { z } from "zod";
import { issueKeySchema } from "./issue-params.validator";

/**
 * Schema for jira_get_issue_link_types
 */
export const getIssueLinkTypesParamsSchema = z.object({});

export type GetIssueLinkTypesParams = z.infer<
  typeof getIssueLinkTypesParamsSchema
>;

/**
 * Schema for link issue fields.
 * Keep this schema unrefined so issue-tools.config.ts can use .shape.
 */
export const linkIssuesFieldsSchema = z.object({
  inwardIssueKey: issueKeySchema,
  outwardIssueKey: issueKeySchema,
  linkTypeName: z.string().min(1, "linkTypeName is required").max(255),
  comment: z.string().max(JIRA_MAX_COMMENT_LENGTH).optional(),
});

/**
 * Schema for link issue params.
 * Adds the self-link guard used by the handler.
 */
export const linkIssuesParamsSchema = linkIssuesFieldsSchema.superRefine(
  (params, ctx) => {
    if (params.inwardIssueKey === params.outwardIssueKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["outwardIssueKey"],
        message: "Cannot link an issue to itself",
      });
    }
  },
);

export type LinkIssuesParams = z.infer<typeof linkIssuesParamsSchema>;

/**
 * Params for `jira_unlink_issue` — deletes a generic link by REST `issueLink/{id}`.
 * Jira link id length varies by instance / link type — keep a generous cap only.
 */
export const unlinkIssueParamsSchema = z.object({
  linkId: z.string().min(1).max(256),
});

export type UnlinkIssueParams = z.infer<typeof unlinkIssueParamsSchema>;
