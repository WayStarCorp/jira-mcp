import { z } from "zod";
import { issueKeySchema } from "./issue-params.validator";

export const epicRelationModeSchema = z.enum(["auto", "parent", "epicLink"]);
export const epicFieldIdSchema = z
  .string()
  .regex(/^customfield_\d+$/, "Epic field id must be in the format customfield_12345");

export const getEpicInfoParamsSchema = z.object({
  issueKey: issueKeySchema,
  relationMode: epicRelationModeSchema.optional().default("auto"),
  epicFieldId: epicFieldIdSchema.optional(),
  /** Match this issuetype name (case-insensitive) when deciding Epic-style behavior; omit for English "Epic". */
  epicIssuetypeName: z.string().min(1).max(120).optional(),
  includeChildren: z.boolean().optional().default(false),
  maxChildren: z.number().int().min(1).max(50).optional().default(25),
});

export type GetEpicInfoParams = z.infer<typeof getEpicInfoParamsSchema>;

export const setIssueEpicParamsSchema = z.object({
  issueKey: issueKeySchema,
  epicIssueKey: issueKeySchema,
  relationMode: epicRelationModeSchema.optional().default("auto"),
  epicFieldId: epicFieldIdSchema.optional(),
  validateEpicType: z.boolean().optional().default(true),
  /** When validateEpicType is true, target issue must have this issuetype name (case-insensitive). Omit for English "Epic". */
  epicIssuetypeName: z.string().min(1).max(120).optional(),
  notifyUsers: z.boolean().optional().default(true),
});

export type SetIssueEpicParams = z.infer<typeof setIssueEpicParamsSchema>;

export const removeIssueEpicParamsSchema = z.object({
  issueKey: issueKeySchema,
  relationMode: epicRelationModeSchema.optional().default("auto"),
  epicFieldId: epicFieldIdSchema.optional(),
  notifyUsers: z.boolean().optional().default(true),
});

export type RemoveIssueEpicParams = z.infer<typeof removeIssueEpicParamsSchema>;

/**
 * Flat field map for MCP registration (issue-tools.config passes `.shape` here).
 * The MCP SDK wraps shapes in `z.object()` only, so cross-field rules do not appear in the tool JSON Schema;
 * {@link changeIssueTypeParamsSchema} and {@link ChangeIssueTypeHandler} enforce XOR before updates.
 */
export const changeIssueTypeParamsObjectSchema = z.object({
  issueKey: issueKeySchema,
  issueTypeName: z.string().min(1).max(80).optional(),
  issueTypeId: z.string().min(1).max(40).optional(),
  /** Transition-screen fields already keyed by Jira REST id/name. Must not duplicate keys resolved from `customFields`. */
  requiredFields: z.record(z.string(), z.unknown()).optional(),
  /** Resolved and merged separately; the same REST field key must not also appear in `requiredFields`. */
  customFields: z.record(z.string(), z.unknown()).optional(),
  notifyUsers: z.boolean().optional().default(true),
  validateOnly: z.boolean().optional().default(false),
});

export const changeIssueTypeParamsSchema =
  changeIssueTypeParamsObjectSchema.superRefine((data, ctx) => {
    if (data.validateOnly) {
      return;
    }
    const hasName = !!data.issueTypeName;
    const hasId = !!data.issueTypeId;
    if (hasName === hasId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide exactly one of issueTypeName or issueTypeId (not both, not neither), unless validateOnly is true.",
        path: hasName && hasId ? ["issueTypeId"] : ["issueTypeName"],
      });
    }
  });

export type ChangeIssueTypeParams = z.infer<typeof changeIssueTypeParamsSchema>;
