/**
 * User Tools Configuration
 *
 * Defines configuration for all user-related JIRA tools
 */

import type { ToolConfig, ToolHandler } from "../types";
import {
  assignIssueFieldsSchema,
  getAssignableUsersParamsSchema,
  searchUsersParamsSchema,
} from "../../users";

/**
 * User tools configuration factory
 * 
 * Creates tool configurations for all user-related tools
 */
export function createUserToolsConfig(tools: {
  jira_get_current_user: ToolHandler;
  jira_search_users: ToolHandler;
  jira_get_assignable_users: ToolHandler;
  jira_assign_issue: ToolHandler;
}): ToolConfig[] {
  return [
    {
      name: "jira_get_current_user",
      description: "Get current user profile information and permissions",
      params: {},
      handler: tools.jira_get_current_user.handle.bind(tools.jira_get_current_user),
    },
    {
      name: "jira_search_users",
      description: "Search Jira users by name or email",
      params: searchUsersParamsSchema.shape,
      handler: tools.jira_search_users.handle.bind(tools.jira_search_users),
    },
    {
      name: "jira_get_assignable_users",
      description:
        "List users that can be assigned to a specific issue. Use this before jira_assign_issue when accountId is unknown.",
      params: getAssignableUsersParamsSchema.shape,
      handler: tools.jira_get_assignable_users.handle.bind(
        tools.jira_get_assignable_users,
      ),
    },
    {
      name: "jira_assign_issue",
      description:
        "Assign an issue. Provide exactly one of accountId or query; query must resolve to exactly one assignable user.",
      params: assignIssueFieldsSchema.shape,
      handler: tools.jira_assign_issue.handle.bind(tools.jira_assign_issue),
    },
  ];
} 