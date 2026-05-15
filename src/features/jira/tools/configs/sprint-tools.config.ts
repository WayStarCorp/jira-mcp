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
        "List Jira sprints (Scrum boards / Agile API). Optional boardId scopes to one board; omit boardId to merge sprints from accessible Scrum boards. Use state:active for the current (in-progress) sprint on each queried board. Pair with jira_get_boards to find boardId.",
      params: getSprintsParamsSchema.shape,
      handler: tools.jira_get_sprints.handle.bind(tools.jira_get_sprints),
    },
    {
      name: "jira_add_issues_to_sprint",
      description:
        "Add existing issues to a sprint. Exactly one of sprintId (from jira_get_sprints) or boardId. boardId only works when the board has exactly one active sprint; otherwise use sprintId. Company-managed Scrum boards via Agile REST.",
      params: addIssuesToSprintFieldsSchema.shape,
      handler: tools.jira_add_issues_to_sprint.handle.bind(
        tools.jira_add_issues_to_sprint,
      ),
    },
  ];
} 