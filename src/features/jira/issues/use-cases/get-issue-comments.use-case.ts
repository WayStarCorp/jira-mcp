/**
 * Get Issue Comments Use Case
 */

import {
  type AttachmentMetadata,
  mapIssueAttachments,
} from "@features/jira/attachments/models";
import type { Comment, GetCommentsOptions } from "../models/comment.models";
import type { IssueCommentRepository, IssueRepository } from "../repositories";
import type {
  GetIssueCommentsParams,
  IssueCommentValidator,
} from "../validators";

export interface CommentsWithAttachments {
  comments: Comment[];
  /** Total comments on the issue (Jira API `total`, not page length) */
  totalComments: number;
  attachments: AttachmentMetadata[];
}

export interface GetIssueCommentsUseCase {
  execute(params: GetIssueCommentsParams): Promise<CommentsWithAttachments>;
}

export class GetIssueCommentsUseCaseImpl implements GetIssueCommentsUseCase {
  constructor(
    private readonly commentRepository: IssueCommentRepository,
    private readonly issueRepository: IssueRepository,
    private readonly validator: IssueCommentValidator,
  ) {}

  async execute(params: GetIssueCommentsParams): Promise<CommentsWithAttachments> {
    const validatedParams = this.validator.validateGetCommentsParams(params);
    const options = {
      issueKey: validatedParams.issueKey,
      maxResults: validatedParams.maxComments,
      startAt: 0,
      orderBy: validatedParams.orderBy,
    } as GetCommentsOptions;

    const [commentsPage, issue] = await Promise.all([
      this.commentRepository.getIssueComments(
        validatedParams.issueKey,
        options,
      ),
      this.issueRepository.getIssue(validatedParams.issueKey),
    ]);

    return {
      comments: commentsPage.comments,
      totalComments: commentsPage.total,
      attachments: mapIssueAttachments(issue.fields?.attachment),
    };
  }
}
