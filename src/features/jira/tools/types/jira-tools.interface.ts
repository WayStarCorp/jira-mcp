/**
 * JIRA Tools Interface
 *
 * Defines the complete interface for all available JIRA MCP tools
 */

import type { ToolHandler } from "@core/tools";

/**
 * Interface for JIRA tool handlers
 *
 * Defines all available JIRA tools with their respective handlers
 */
export interface JiraTools {
  // Issue management tools
  jira_get_issue: ToolHandler;
  jira_get_issue_comments: ToolHandler;
  jira_add_issue_comment: ToolHandler;
  jira_get_assigned_issues: ToolHandler;
  jira_get_issue_transitions: ToolHandler;
  jira_get_issue_custom_field_metadata: ToolHandler;
  jira_create_issue: ToolHandler;
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

  // Project management tools
  jira_get_projects: ToolHandler;

  // Board management tools
  jira_get_boards: ToolHandler;

  // Sprint management tools
  jira_get_sprints: ToolHandler;
  jira_add_issues_to_sprint: ToolHandler;

  // Worklog management tools
  jira_add_worklog: ToolHandler;
  jira_get_worklogs: ToolHandler;
  jira_update_worklog: ToolHandler;
  jira_delete_worklog: ToolHandler;

  // User management tools
  jira_get_current_user: ToolHandler;
  jira_search_users: ToolHandler;
  jira_get_assignable_users: ToolHandler;
  jira_assign_issue: ToolHandler;

  // Attachment tools
  jira_get_issue_attachments: ToolHandler;
  jira_download_attachment: ToolHandler;
}

/**
 * JIRA tool categories
 *
 * Categorizes tools by their functional domain
 */
export interface JiraToolCategories {
  /** Issue-related tools */
  issues: Pick<
    JiraTools,
    | "jira_get_issue"
    | "jira_get_issue_comments"
    | "jira_add_issue_comment"
    | "jira_get_assigned_issues"
    | "jira_get_issue_transitions"
    | "jira_get_issue_custom_field_metadata"
    | "jira_create_issue"
    | "jira_transition_issue"
    | "jira_update_issue"
    | "jira_get_issue_link_types"
    | "jira_link_issues"
    | "jira_get_epic_info"
    | "jira_set_issue_epic"
    | "jira_remove_issue_epic"
    | "jira_change_issue_type"
    | "jira_unlink_issue"
    | "jira_search_issues"
  >;

  /** Project-related tools */
  projects: Pick<JiraTools, "jira_get_projects">;

  /** Board-related tools */
  boards: Pick<JiraTools, "jira_get_boards">;

  /** Sprint-related tools */
  sprints: Pick<JiraTools, "jira_get_sprints" | "jira_add_issues_to_sprint">;

  /** Worklog-related tools */
  worklogs: Pick<
    JiraTools,
    | "jira_add_worklog"
    | "jira_get_worklogs"
    | "jira_update_worklog"
    | "jira_delete_worklog"
  >;

  /** User-related tools */
  users: Pick<
    JiraTools,
    | "jira_get_current_user"
    | "jira_search_users"
    | "jira_get_assignable_users"
    | "jira_assign_issue"
  >;
}

/**
 * Tool names by category
 *
 * Provides string literal types for tool names organized by category
 */
export const JIRA_TOOL_NAMES = {
  ISSUES: [
    "jira_get_issue",
    "jira_get_issue_comments",
    "jira_add_issue_comment",
    "jira_get_assigned_issues",
    "jira_get_issue_transitions",
    "jira_get_issue_custom_field_metadata",
    "jira_create_issue",
    "jira_transition_issue",
    "jira_update_issue",
    "jira_get_issue_link_types",
    "jira_link_issues",
    "jira_get_epic_info",
    "jira_set_issue_epic",
    "jira_remove_issue_epic",
    "jira_change_issue_type",
    "jira_unlink_issue",
    "jira_search_issues",
  ] as const,

  PROJECTS: ["jira_get_projects"] as const,

  BOARDS: ["jira_get_boards"] as const,

  SPRINTS: ["jira_get_sprints", "jira_add_issues_to_sprint"] as const,

  WORKLOGS: [
    "jira_add_worklog",
    "jira_get_worklogs",
    "jira_update_worklog",
    "jira_delete_worklog",
  ] as const,

  USERS: [
    "jira_get_current_user",
    "jira_search_users",
    "jira_get_assignable_users",
    "jira_assign_issue",
  ] as const,
} as const;

/**
 * All JIRA tool names as a union type
 */
export type JiraToolName = keyof JiraTools;
