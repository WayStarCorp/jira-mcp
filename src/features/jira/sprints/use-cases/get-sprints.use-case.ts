/**
 * Get Sprints Use Case
 *
 * Business logic for retrieving JIRA sprints with filtering capabilities
 */

import { JiraApiError } from "@features/jira/client/errors";
import { BoardType } from "../../boards/models";
import type { BoardRepository } from "../../boards/repositories";
import type { Sprint, SprintState } from "../models";
import type { SprintRepository } from "../repositories/sprint.repository";

/**
 * Request parameters for get sprints use case
 */
export interface GetSprintsUseCaseRequest {
  boardId?: number;
  state?: SprintState;
  startAt?: number;
  maxResults?: number;
}

/**
 * Interface for get sprints use case
 */
export interface GetSprintsUseCase {
  /**
   * Execute the get sprints use case
   *
   * @param request - Sprints retrieval parameters
   * @returns List of JIRA sprints matching the criteria
   */
  execute(request: GetSprintsUseCaseRequest): Promise<Sprint[]>;
}

/**
 * Implementation of the get sprints use case
 */
export class GetSprintsUseCaseImpl implements GetSprintsUseCase {
  /**
   * Create a new GetSprintsUseCase implementation
   *
   * @param sprintRepository - Repository for sprint operations
   */
  constructor(
    private readonly sprintRepository: SprintRepository,
    private readonly boardRepository: BoardRepository,
  ) {}

  /**
   * Execute the get sprints use case
   *
   * @param request - Sprints retrieval parameters
   * @returns List of JIRA sprints matching the criteria
   */
  public async execute(request: GetSprintsUseCaseRequest): Promise<Sprint[]> {
    try {
      if (request.boardId === undefined) {
        return await this.getSprintsFromAllScrumBoards(request);
      }

      // Get sprints using repository with provided parameters
      return await this.sprintRepository.getSprints(request.boardId, {
        state: request.state,
        startAt: request.startAt,
        maxResults: request.maxResults,
        boardId: request.boardId,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw JiraApiError.withStatusCode(
          `Failed to get sprints: ${error.message}`,
          400,
        );
      }
      throw error;
    }
  }

  private async getSprintsFromAllScrumBoards(
    request: GetSprintsUseCaseRequest,
  ): Promise<Sprint[]> {
    const boards = await this.boardRepository.getBoards({
      type: BoardType.SCRUM,
      maxResults: 50,
    });
    const sprintGroups = await Promise.all(
      boards.map((board) =>
        this.sprintRepository.getSprints(Number(board.id), {
          state: request.state,
          startAt: request.startAt,
          maxResults: request.maxResults,
        }),
      ),
    );

    return sprintGroups.flat();
  }
}
