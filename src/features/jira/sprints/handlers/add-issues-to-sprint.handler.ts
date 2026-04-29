/**
 * Add Issues To Sprint Handler
 *
 * MCP tool: assign existing issues to a sprint by sprint id or active sprint on board.
 */

import { BaseToolHandler } from "@core/tools/tool-handler.class";
import {
  JiraApiError,
  JiraNotFoundError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import type { AddIssuesToSprintUseCase } from "../use-cases/add-issues-to-sprint.use-case";
import type {
  AddIssuesToSprintParams,
  SprintValidator,
} from "../validators/sprint.validator";

/**
 * Handler for jira_add_issues_to_sprint
 */
export class AddIssuesToSprintHandler extends BaseToolHandler<
  AddIssuesToSprintParams,
  string
> {
  constructor(
    private readonly useCase: AddIssuesToSprintUseCase,
    private readonly sprintValidator: SprintValidator,
  ) {
    super("JIRA", "Add Issues To Sprint");
  }

  protected async execute(params: AddIssuesToSprintParams): Promise<string> {
    try {
      const validated =
        this.sprintValidator.validateAddIssuesToSprintParams(params);
      this.logger.info(
        `Adding ${validated.issueKeys.length} issue(s) to sprint target`,
      );

      const result = await this.useCase.execute(validated);

      const keys = result.issueKeys.join(", ");
      return [
        "# Issues added to sprint",
        "",
        `**Sprint:** ${result.sprintName} (id: ${result.sprintId})`,
        `**Issues:** ${keys}`,
        "",
        "Use **jira_get_issue** to verify fields on your instance.",
      ].join("\n");
    } catch (error) {
      this.logger.error(`Failed to add issues to sprint: ${error}`);
      throw this.enhanceError(error, params);
    }
  }

  private enhanceError(
    error: unknown,
    params?: AddIssuesToSprintParams,
  ): Error {
    let hintBoard: string;
    if (params?.boardId === undefined) {
      if (params?.sprintId === undefined) {
        hintBoard = "target";
      } else {
        hintBoard = `sprint ${params.sprintId}`;
      }
    } else {
      hintBoard = `board ${params.boardId}`;
    }

    if (error instanceof JiraNotFoundError) {
      return new Error(
        `❌ **Not found (${hintBoard})**\n\nThe board or sprint does not exist, or the URL is wrong.\n\n**What to try:**\n- Confirm **boardId** with \`jira_get_boards\` (404 often means wrong board id).\n- Confirm **sprintId** via \`jira_get_sprints\`.\n`,
      );
    }

    if (error instanceof JiraPermissionError) {
      return new Error(
        `❌ **Permission denied**\n\nYour account cannot manage sprint membership for ${hintBoard}.\n\n**Needed:** browse project + sprint permissions typical for Scrum boards.\n`,
      );
    }

    if (error instanceof JiraApiError) {
      const status =
        error.statusCode === undefined ? "API" : `HTTP ${error.statusCode}`;
      const msg = error.message || "Unknown Jira API error";

      if (error.statusCode === 404) {
        return new Error(
          `❌ **Not found (${status})**\n\n${msg}\n\n**Notes:**\n- With **boardId**, there may be **no active sprint** — use **sprintId** from \`jira_get_sprints\` or start/plan a sprint in Jira.\n- With **sprintId**, check the id matches your Scrum board’s sprints.\n`,
        );
      }

      return new Error(`❌ **JIRA API (${status})**\n\n${msg}\n`);
    }

    if (error instanceof Error) {
      return new Error(`❌ **Add to sprint failed**\n\n${error.message}\n`);
    }

    return new Error("❌ **Unknown error** while adding issues to sprint.");
  }
}
