/**
 * Get Issue Attachments Use Case
 *
 * Retrieves attachment metadata from issue fields.attachment
 */

import type { IssueRepository } from "@features/jira/issues/repositories";
import type { AttachmentMetadata } from "../models";
import { mapIssueAttachments } from "../models";

export interface GetIssueAttachmentsRequest {
  issueKey: string;
}

export interface GetIssueAttachmentsResult {
  issueKey: string;
  attachments: AttachmentMetadata[];
}

export interface GetIssueAttachmentsUseCase {
  execute(request: GetIssueAttachmentsRequest): Promise<GetIssueAttachmentsResult>;
}

export class GetIssueAttachmentsUseCaseImpl implements GetIssueAttachmentsUseCase {
  constructor(private readonly issueRepository: IssueRepository) {}

  public async execute(
    request: GetIssueAttachmentsRequest,
  ): Promise<GetIssueAttachmentsResult> {
    const issue = await this.issueRepository.getIssue(request.issueKey);
    const attachments = mapIssueAttachments(issue.fields?.attachment);

    return {
      issueKey: request.issueKey,
      attachments,
    };
  }
}
