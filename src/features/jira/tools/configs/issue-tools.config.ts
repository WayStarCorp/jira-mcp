/**
 * Issue Tools Configuration
 *
 * Defines configuration for all issue-related JIRA tools
 */

import type { ToolConfig, ToolHandler } from "@core/tools";
import {
  addIssueCommentSchema,
  changeIssueTypeParamsObjectSchema,
  createIssueParamsSchema,
  getEpicInfoParamsSchema,
  getIssueCommentsSchema,
  getIssueCustomFieldMetadataParamsSchema,
  getIssueLinkTypesParamsSchema,
  getIssueTransitionsParamsSchema,
  issueKeySchema,
  linkIssuesFieldsSchema,
  removeIssueEpicParamsSchema,
  searchJiraIssuesBaseSchema,
  setIssueEpicParamsSchema,
  unlinkIssueParamsSchema,
  updateIssueParamsSchema,
  workflowTransitionIssueFieldsSchema,
} from "../../issues";

/**
 * Issue tools configuration factory
 * 
 * Creates tool configurations for all issue-related tools
 */
export function createIssueToolsConfig(tools: {
  jira_get_issue: ToolHandler;
  jira_get_issue_comments: ToolHandler;
  jira_add_issue_comment: ToolHandler;
  jira_get_assigned_issues: ToolHandler;
  jira_create_issue: ToolHandler;
  jira_get_issue_transitions: ToolHandler;
  jira_get_issue_custom_field_metadata: ToolHandler;
  jira_transition_issue: ToolHandler;
  jira_update_issue: ToolHandler;
  jira_get_issue_link_types: ToolHandler;
  jira_link_issues: ToolHandler;
  jira_get_epic_info: ToolHandler;
  jira_set_issue_epic: ToolHandler;
  jira_remove_issue_epic: ToolHandler;
  jira_change_issue_type: ToolHandler;
  jira_unlink_issue: ToolHandler;
  jira_search_issues: ToolHandler;
}): ToolConfig[] {
  return [
    {
      name: "jira_get_issue",
      description: "Retrieves detailed information about a specific JIRA issue",
      params: { issueKey: issueKeySchema },
      handler: tools.jira_get_issue.handle.bind(tools.jira_get_issue),
    },
    {
      name: "jira_get_issue_comments",
      description: "Retrieves comments for a specific JIRA issue with configurable quantity and filtering options",
      params: getIssueCommentsSchema.shape,
      handler: tools.jira_get_issue_comments.handle.bind(tools.jira_get_issue_comments),
    },
    {
      name: "jira_add_issue_comment",
      description:
        "Adds a public comment to a specific JIRA issue. Public comments only; internal/JSM restricted comments are not supported. Max comment length is 32767 characters.",
      params: addIssueCommentSchema.shape,
      handler: tools.jira_add_issue_comment.handle.bind(
        tools.jira_add_issue_comment,
      ),
    },
    {
      name: "jira_get_assigned_issues",
      description: "Retrieves all JIRA issues assigned to the current user",
      params: {},
      handler: tools.jira_get_assigned_issues.handle.bind(tools.jira_get_assigned_issues),
    },
    {
      name: "jira_get_issue_transitions",
      description: "Lists available workflow transitions for a specific JIRA issue",
      params: getIssueTransitionsParamsSchema.shape,
      handler: tools.jira_get_issue_transitions.handle.bind(
        tools.jira_get_issue_transitions,
      ),
    },
    {
      name: "jira_get_issue_custom_field_metadata",
      description:
        "Lists custom field metadata for a specific Jira issue, including field ids, names, types, operations, and allowed values. Use this to discover field ids for jira_update_issue and jira_create_issue customFields (e.g. Epic Link vs parentIssueKey).",
      params: getIssueCustomFieldMetadataParamsSchema.shape,
      handler: tools.jira_get_issue_custom_field_metadata.handle.bind(
        tools.jira_get_issue_custom_field_metadata,
      ),
    },
    {
      name: "jira_get_epic_info",
      description:
        "Shows issue type (whether issuetype name matches the configured Epic label, default English Epic), current parent hierarchy, Epic Link value when discoverable, generic issue links, and optional children (JQL). Optional epicIssuetypeName aligns Epic detection with localized Jira type names. Use relationMode: auto|parent|epicLink; pass epicFieldId (customfield_*) when Jira has multiple epic link-like fields or Classic Epic Link is off the default edit screen. With includeChildren and relationMode:auto on an Epic-shaped issue: if no Classic Epic Link customfield_* id is resolved (and probing editmeta does not yield a single candidate), children are loaded via parent JQL only — issues linked only through Epic Link may be missing until epicFieldId or metadata resolves the field; when the list is parent-only, the markdown report includes an explicit footnote.",
      params: getEpicInfoParamsSchema.shape,
      handler: tools.jira_get_epic_info.handle.bind(tools.jira_get_epic_info),
    },
    {
      name: "jira_transition_issue",
      description:
        "Transitions an issue using the issue's available workflow transitions. Provide exactly one of transitionId or statusName; use jira_get_issue_transitions first if unsure.",
      params: workflowTransitionIssueFieldsSchema.shape,
      handler: tools.jira_transition_issue.handle.bind(tools.jira_transition_issue),
    },
    {
      name: "jira_create_issue",
      description:
        "Creates a new JIRA issue. parentIssueKey maps to REST fields.parent (sub-task / hierarchy); on company-managed Jira, link issues to an epic via customFields using the Epic Link customfield id and epic key string — use jira_get_issue_custom_field_metadata if unsure.",
      params: createIssueParamsSchema.shape,
      handler: tools.jira_create_issue.handle.bind(tools.jira_create_issue),
    },
    {
      name: "jira_update_issue",
      description:
        "Updates an existing JIRA issue with field changes, status transitions, worklog entries, and custom fields. " +
        "You can pass customFields by field id or field name. Option fields can use a human-readable option label, and the tool will resolve it when possible. " +
        "For user-picker custom fields or ambiguous fields, use jira_get_issue_custom_field_metadata first to inspect the exact schema.",
      params: updateIssueParamsSchema.shape,
      handler: tools.jira_update_issue.handle.bind(tools.jira_update_issue),
    },
    {
      name: "jira_change_issue_type",
      description:
        "Change an issue's issuetype via fields.issuetype (name or id). Unless validateOnly:true, provide exactly one of issueTypeName or issueTypeId (not both, not neither). Use validateOnly:true to check editmeta without updating. If Jira requires extra transition-screen fields, pass requiredFields and/or customFields (same resolution as jira_update_issue). Do not use the same REST field key in both requiredFields and customFields — the server rejects overlaps with a validation error. Jira may still require a UI Move on some instances — the error text will surface that. Important for MCP clients: the published tool JSON Schema lists issueTypeName and issueTypeId as separate optional properties with no oneOf/XOR — code generators or UIs that build requests from that schema alone must still send exactly one of them; the server validates this at call time and returns a clear error if both or neither are set.",
      params: changeIssueTypeParamsObjectSchema.shape,
      handler: tools.jira_change_issue_type.handle.bind(
        tools.jira_change_issue_type,
      ),
    },
    {
      name: "jira_get_issue_link_types",
      description:
        "Lists available Jira issue link types with inward/outward directions. Call this first to find valid linkTypeName values before using jira_link_issues.",
      params: getIssueLinkTypesParamsSchema.shape,
      handler: tools.jira_get_issue_link_types.handle.bind(
        tools.jira_get_issue_link_types,
      ),
    },
    {
      name: "jira_link_issues",
      description:
        "Creates a directional link between two Jira issues. linkTypeName must match a name from jira_get_issue_link_types. inwardIssueKey is the issue on the receiving end; outwardIssueKey initiates the link.",
      params: linkIssuesFieldsSchema.shape,
      handler: tools.jira_link_issues.handle.bind(tools.jira_link_issues),
    },
    {
      name: "jira_set_issue_epic",
      description:
        "Attach a child issue to an epic using fields.parent (hierarchy / team-managed) or Classic Epic Link (customfield_*). relationMode auto inspects editmeta (parent preferred unless epicFieldId forces Epic Link). validateEpicType checks the target issue's issuetype.name matches epicIssuetypeName (default English Epic, case-insensitive); set validateEpicType:false to skip, or set epicIssuetypeName to your localized Epic type label. For epic / parent removal, use jira_remove_issue_epic instead of generic links.",
      params: setIssueEpicParamsSchema.shape,
      handler: tools.jira_set_issue_epic.handle.bind(tools.jira_set_issue_epic),
    },
    {
      name: "jira_remove_issue_epic",
      description:
        "Clear epic association via parent (set null) or Epic Link custom field (set null). Does not delete generic issue links — use jira_unlink_issue with linkId from issuelinks for directional link types.",
      params: removeIssueEpicParamsSchema.shape,
      handler: tools.jira_remove_issue_epic.handle.bind(
        tools.jira_remove_issue_epic,
      ),
    },
    {
      name: "jira_unlink_issue",
      description:
        "Deletes a generic issue link by REST link id (from fields.issuelinks). Not for hierarchy parent or Classic Epic Link — use jira_remove_issue_epic for epic membership.",
      params: unlinkIssueParamsSchema.shape,
      handler: tools.jira_unlink_issue.handle.bind(tools.jira_unlink_issue),
    },
    {
      name: "search_jira_issues",
      description: "Search JIRA issues using JQL queries or helper parameters. Supports both expert JQL and beginner-friendly filters.",
      params: searchJiraIssuesBaseSchema.shape,
      handler: tools.jira_search_issues.handle.bind(tools.jira_search_issues),
    },
  ];
} 