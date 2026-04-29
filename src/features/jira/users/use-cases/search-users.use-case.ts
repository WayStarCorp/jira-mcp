/**
 * Search Users Use Case
 *
 * Searches Jira users by query.
 */

import { JiraApiError } from "@features/jira/client/errors";
import type { User } from "../models";
import type { UserProfileRepository } from "../repositories/user-profile.repository";

export interface SearchUsersUseCaseRequest {
  query: string;
  maxResults?: number;
}

export interface SearchUsersUseCase {
  execute(request: SearchUsersUseCaseRequest): Promise<User[]>;
}

export class SearchUsersUseCaseImpl implements SearchUsersUseCase {
  constructor(private readonly userProfileRepository: UserProfileRepository) {}

  async execute(request: SearchUsersUseCaseRequest): Promise<User[]> {
    try {
      return await this.userProfileRepository.searchUsers(
        request.query,
        request.maxResults,
      );
    } catch (error) {
      if (error instanceof JiraApiError) {
        throw error;
      }

      if (error instanceof Error) {
        throw JiraApiError.withStatusCode(
          `Failed to search users: ${error.message}`,
          400,
          { query: request.query, maxResults: request.maxResults },
        );
      }

      throw error;
    }
  }
}
