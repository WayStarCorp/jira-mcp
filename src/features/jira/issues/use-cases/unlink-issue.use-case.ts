import type { IssueLinkRepository } from "../repositories/issue-link.repository";

export interface UnlinkIssueUseCase {
  execute(params: { linkId: string }): Promise<void>;
}

export class UnlinkIssueUseCaseImpl implements UnlinkIssueUseCase {
  constructor(private readonly issueLinkRepository: IssueLinkRepository) {}

  async execute(params: { linkId: string }): Promise<void> {
    await this.issueLinkRepository.deleteIssueLink(params.linkId);
  }
}
