/**
 * Get Assignable Users Use Case
 *
 * Retrieves users that can be assigned to a Jira issue.
 */

import { JiraApiError } from "@features/jira/client/errors";
import type { User } from "../models";
import type { UserProfileRepository } from "../repositories/user-profile.repository";

export interface GetAssignableUsersUseCaseRequest {
  issueKey: string;
  query?: string;
  maxResults?: number;
}

export interface GetAssignableUsersUseCase {
  execute(request: GetAssignableUsersUseCaseRequest): Promise<User[]>;
}

export class GetAssignableUsersUseCaseImpl
  implements GetAssignableUsersUseCase
{
  constructor(private readonly userProfileRepository: UserProfileRepository) {}

  async execute(request: GetAssignableUsersUseCaseRequest): Promise<User[]> {
    try {
      return await this.userProfileRepository.getAssignableUsers(
        request.issueKey,
        request.query,
        request.maxResults,
      );
    } catch (error) {
      if (error instanceof JiraApiError) {
        throw error;
      }

      if (error instanceof Error) {
        throw JiraApiError.withStatusCode(
          `Failed to get assignable users: ${error.message}`,
          400,
          {
            issueKey: request.issueKey,
            query: request.query,
            maxResults: request.maxResults,
          },
        );
      }

      throw error;
    }
  }
}
