/**
 * Add Issue Comment Use Case
 *
 * Adds a comment to a Jira issue.
 */

import { JiraApiError } from "@features/jira/client/errors";
import type { Comment } from "../models/comment.models";
import type { IssueCommentRepository } from "../repositories/issue-comment.repository";
import type { AddIssueCommentParams } from "../validators/issue-comment.validator";

export interface AddIssueCommentUseCase {
  execute(params: AddIssueCommentParams): Promise<Comment>;
}

export class AddIssueCommentUseCaseImpl implements AddIssueCommentUseCase {
  constructor(private readonly commentRepository: IssueCommentRepository) {}

  async execute(params: AddIssueCommentParams): Promise<Comment> {
    try {
      return await this.commentRepository.addIssueComment(
        params.issueKey,
        params.comment,
      );
    } catch (error) {
      if (error instanceof JiraApiError) {
        throw error;
      }

      if (error instanceof Error) {
        throw JiraApiError.withStatusCode(
          `Failed to add comment to issue '${params.issueKey}': ${error.message}`,
          400,
          { issueKey: params.issueKey },
        );
      }

      throw error;
    }
  }
}
