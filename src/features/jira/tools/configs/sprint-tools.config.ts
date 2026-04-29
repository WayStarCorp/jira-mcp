/**
 * Sprint Tools Configuration
 *
 * Defines configuration for all sprint-related JIRA tools
 */

import type { ToolConfig, ToolHandler } from "../types";
import {
  addIssuesToSprintFieldsSchema,
  getSprintsParamsSchema,
} from "../../sprints";

/**
 * Sprint tools configuration factory
 *
 * Creates tool configurations for all sprint-related tools
 */
export function createSprintToolsConfig(tools: {
  jira_get_sprints: ToolHandler;
  jira_add_issues_to_sprint: ToolHandler;
}): ToolConfig[] {
  return [
    {
      name: "jira_get_sprints",
      description:
        "Get JIRA sprints for a specific board, or from accessible Scrum boards when boardId is omitted, with optional state filtering",
      params: getSprintsParamsSchema.shape,
      handler: tools.jira_get_sprints.handle.bind(tools.jira_get_sprints),
    },
    {
      name: "jira_add_issues_to_sprint",
      description:
        "Add existing issue(s) to a sprint. Provide exactly one of sprintId or boardId; boardId uses the board's active sprint (Agile REST). Company-managed boards only via this endpoint.",
      params: addIssuesToSprintFieldsSchema.shape,
      handler: tools.jira_add_issues_to_sprint.handle.bind(
        tools.jira_add_issues_to_sprint,
      ),
    },
  ];
} 