import { logger } from "@core/logging";
import type { HttpClient } from "@features/jira/client/http/jira.http.types";
import type { User } from "../models";

/**
 * Repository interface for user profile operations
 * Clear responsibility: managing user information and authentication context
 */
export interface UserProfileRepository {
  getCurrentUser(): Promise<User>;
  searchUsers(query: string, maxResults?: number): Promise<User[]>;
  getAssignableUsers(
    issueKey: string,
    query?: string,
    maxResults?: number,
  ): Promise<User[]>;
}

/**
 * Implementation of UserProfileRepository
 * Extracted from JiraClient god object - user profile operations only
 */
export class UserProfileRepositoryImpl implements UserProfileRepository {
  private readonly logger = logger;

  constructor(private readonly httpClient: HttpClient) {}

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<User> {
    this.logger.debug("Getting current user", {
      prefix: "JIRA:UserProfileRepository",
    });

    return this.httpClient.sendRequest<User>({
      endpoint: "myself",
      method: "GET",
    });
  }

  /**
   * Search users by query string
   */
  async searchUsers(query: string, maxResults = 20): Promise<User[]> {
    this.logger.debug(`Searching users for query: ${query}`, {
      prefix: "JIRA:UserProfileRepository",
    });

    return this.httpClient.sendRequest<User[]>({
      endpoint: "user/search",
      method: "GET",
      queryParams: {
        query,
        maxResults,
      },
    });
  }

  /**
   * Get users assignable to a specific issue
   */
  async getAssignableUsers(
    issueKey: string,
    query?: string,
    maxResults = 20,
  ): Promise<User[]> {
    this.logger.debug(`Getting assignable users for issue: ${issueKey}`, {
      prefix: "JIRA:UserProfileRepository",
    });

    const queryParams: Record<string, string | number | undefined> = {
      issueKey,
      maxResults,
    };

    if (query) {
      queryParams.query = query;
    }

    return this.httpClient.sendRequest<User[]>({
      endpoint: "user/assignable/search",
      method: "GET",
      queryParams,
    });
  }
}
