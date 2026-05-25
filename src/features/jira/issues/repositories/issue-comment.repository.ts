import { logger } from "@core/logging";
import type { HttpClient } from "@features/jira/client/http/jira.http.types";
import { ensureADFFormat } from "@features/jira/shared/parsers/adf.parser";
import type {
  Comment,
  GetCommentsOptions,
  IssueCommentsPage,
} from "../models";

/**
 * Comments API response interface
 */
interface CommentsResult {
  comments: Comment[];
  maxResults: number;
  startAt: number;
  total: number;
}

/**
 * Repository interface for issue comment operations
 * Clear responsibility: managing issue comment data and operations
 */
export interface IssueCommentRepository {
  getIssueComments(
    issueKey: string,
    options?: GetCommentsOptions,
  ): Promise<IssueCommentsPage>;
  addIssueComment(issueKey: string, comment: string): Promise<Comment>;
}

/**
 * Implementation of IssueCommentRepository
 * Extracted from JiraClient god object - specialized for comment operations
 */
export class IssueCommentRepositoryImpl implements IssueCommentRepository {
  private readonly logger = logger;

  constructor(private readonly httpClient: HttpClient) {}

  /**
   * Get comments for a specific issue
   */
  async getIssueComments(
    issueKey: string,
    options?: GetCommentsOptions,
  ): Promise<IssueCommentsPage> {
    this.logger.debug(`Getting comments for issue: ${issueKey}`, {
      prefix: "JIRA:IssueCommentRepository",
    });

    const queryParams: Record<string, string | number | undefined> = {};

    if (options?.maxResults) {
      queryParams.maxResults = options.maxResults;
    }

    if (options?.startAt) {
      queryParams.startAt = options.startAt;
    }

    if (options?.orderBy) {
      queryParams.orderBy = options.orderBy;
    }

    if (options?.expand && options.expand.length > 0) {
      queryParams.expand = options.expand.join(",");
    }

    const response = await this.httpClient.sendRequest<CommentsResult>({
      endpoint: `issue/${issueKey}/comment`,
      method: "GET",
      queryParams,
    });

    return {
      comments: response.comments ?? [],
      total: response.total ?? response.comments?.length ?? 0,
    };
  }

  /**
   * Add a comment to a specific issue
   */
  async addIssueComment(issueKey: string, comment: string): Promise<Comment> {
    this.logger.debug(`Adding comment to issue: ${issueKey}`, {
      prefix: "JIRA:IssueCommentRepository",
    });

    const body = ensureADFFormat(comment);

    return this.httpClient.sendRequest<Comment>({
      endpoint: `issue/${issueKey}/comment`,
      method: "POST",
      body: { body },
    });
  }
}
