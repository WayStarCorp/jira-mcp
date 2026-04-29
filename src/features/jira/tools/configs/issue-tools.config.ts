/**
 * Issue Tools Configuration
 *
 * Defines configuration for all issue-related JIRA tools
 */

import type { ToolConfig, ToolHandler } from "@core/tools";
import {
  addIssueCommentSchema,
  getIssueCustomFieldMetadataParamsSchema,
  createIssueParamsSchema,
  getIssueCommentsSchema,
  getIssueLinkTypesParamsSchema,
  getIssueTransitionsParamsSchema,
  issueKeySchema,
  linkIssuesFieldsSchema,
  searchJiraIssuesBaseSchema,
  workflowTransitionIssueFieldsSchema,
  updateIssueParamsSchema,
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
        "Lists custom field metadata for a specific Jira issue, including field ids, names, types, operations, and allowed values. Use this to discover what jira_update_issue expects for customFields.",
      params: getIssueCustomFieldMetadataParamsSchema.shape,
      handler: tools.jira_get_issue_custom_field_metadata.handle.bind(
        tools.jira_get_issue_custom_field_metadata,
      ),
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
      description: "Creates a new JIRA issue with specified parameters",
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
      name: "search_jira_issues",
      description: "Search JIRA issues using JQL queries or helper parameters. Supports both expert JQL and beginner-friendly filters.",
      params: searchJiraIssuesBaseSchema.shape,
      handler: tools.jira_search_issues.handle.bind(tools.jira_search_issues),
    },
  ];
} 