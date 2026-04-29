/**
 * Add Issues To Sprint Use Case
 *
 * Adds existing issues to a sprint via Agile REST (POST sprint/{id}/issue),
 * optionally resolving the active sprint for a board.
 */

import { JiraApiError } from "@features/jira/client/errors";
import { SprintState } from "../models/sprint.models";
import type { SprintRepository } from "../repositories/sprint.repository";

/**
 * Request for adding issues to a sprint.
 * Provide exactly one of `sprintId` or `boardId`.
 */
export interface AddIssuesToSprintUseCaseRequest {
  issueKeys: string[];
  sprintId?: number;
  boardId?: number;
}

export interface AddIssuesToSprintUseCaseResult {
  sprintId: number;
  sprintName: string;
  issueKeys: string[];
}

/**
 * Interface for add issues to sprint use case
 */
export interface AddIssuesToSprintUseCase {
  execute(
    request: AddIssuesToSprintUseCaseRequest,
  ): Promise<AddIssuesToSprintUseCaseResult>;
}

/**
 * Implementation of add issues to sprint use case
 */
export class AddIssuesToSprintUseCaseImpl implements AddIssuesToSprintUseCase {
  constructor(private readonly sprintRepository: SprintRepository) {}

  /**
   * Resolve sprint from explicit id or active sprint on board, then POST issues.
   */
  public async execute(
    request: AddIssuesToSprintUseCaseRequest,
  ): Promise<AddIssuesToSprintUseCaseResult> {
    const sprintId = await this.resolveSprintId(request);

    await this.sprintRepository.addIssuesToSprint(sprintId, request.issueKeys);

    const sprint = await this.sprintRepository.getSprint(sprintId);

    return {
      sprintId,
      sprintName: sprint.name,
      issueKeys: request.issueKeys,
    };
  }

  private async resolveSprintId(
    request: AddIssuesToSprintUseCaseRequest,
  ): Promise<number> {
    if (request.sprintId !== undefined) {
      return request.sprintId;
    }

    if (request.boardId === undefined) {
      throw JiraApiError.withStatusCode(
        "Provide either sprintId or boardId to resolve the target sprint.",
        400,
        { issueKeys: request.issueKeys },
      );
    }

    const { boardId } = request;

    const active = await this.sprintRepository.getSprints(boardId, {
      state: SprintState.ACTIVE,
      maxResults: 50,
      startAt: 0,
    });

    if (active.length === 0) {
      throw JiraApiError.withStatusCode(
        `No active sprint on board ${boardId}. Check board ID (see jira_get_boards), or pick a sprint id from jira_get_sprints with state filters.`,
        404,
      );
    }

    if (active.length > 1) {
      const sprintList = active
        .slice(0, 10)
        .map((sprint) => `${sprint.id}: ${sprint.name}`)
        .join(", ");

      throw JiraApiError.withStatusCode(
        `Multiple active sprints found on board ${boardId}: ${sprintList}. Provide sprintId explicitly.`,
        400,
        { boardId, activeSprintCount: active.length },
      );
    }

    return active[0].id;
  }
}
