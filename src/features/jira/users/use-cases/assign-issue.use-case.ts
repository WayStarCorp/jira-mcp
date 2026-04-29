/**
 * Assign Issue Use Case
 *
 * Assigns a Jira issue to a user by accountId or search query.
 */

import { JiraApiError } from "@features/jira/client/errors";
import type { Issue } from "@features/jira/issues/models";
import type { IssueRepository } from "@features/jira/issues/repositories/issue.repository";
import type { UserProfileRepository } from "../repositories/user-profile.repository";

export interface AssignIssueUseCaseRequest {
  issueKey: string;
  accountId?: string;
  query?: string;
}

export interface AssignIssueUseCase {
  execute(request: AssignIssueUseCaseRequest): Promise<Issue>;
}

export class AssignIssueUseCaseImpl implements AssignIssueUseCase {
  constructor(
    private readonly userProfileRepository: UserProfileRepository,
    private readonly issueRepository: IssueRepository,
  ) {}

  async execute(request: AssignIssueUseCaseRequest): Promise<Issue> {
    let { accountId, issueKey } = request;

    try {
      accountId = accountId ?? (await this.resolveAccountId(request));
      return await this.issueRepository.assignIssue(issueKey, accountId);
    } catch (error) {
      if (error instanceof JiraApiError) {
        throw error;
      }

      if (error instanceof Error) {
        throw JiraApiError.withStatusCode(
          `Failed to assign issue '${issueKey}': ${error.message}`,
          400,
          { issueKey, accountId },
        );
      }

      throw error;
    }
  }

  private async resolveAccountId(
    request: AssignIssueUseCaseRequest,
  ): Promise<string> {
    if (!request.query) {
      throw JiraApiError.withStatusCode(
        "Provide either accountId or query to assign an issue.",
        400,
        { issueKey: request.issueKey },
      );
    }

    const candidates = await this.userProfileRepository.getAssignableUsers(
      request.issueKey,
      request.query,
      20,
    );

    if (candidates.length === 0) {
      throw JiraApiError.withStatusCode(
        this.buildNoMatchMessage(request.issueKey, request.query),
        400,
        { issueKey: request.issueKey, query: request.query },
      );
    }

    if (candidates.length > 1) {
      throw JiraApiError.withStatusCode(
        this.buildAmbiguousMessage(request.issueKey, request.query, candidates),
        400,
        {
          issueKey: request.issueKey,
          query: request.query,
          candidateCount: candidates.length,
        },
      );
    }

    return candidates[0].accountId;
  }

  private buildNoMatchMessage(issueKey: string, query: string): string {
    return [
      `No assignable users matched "${query}" for issue ${issueKey}.`,
      "",
      "Try a broader query or use the exact accountId if you already know it.",
    ].join("\n");
  }

  private buildAmbiguousMessage(
    issueKey: string,
    query: string,
    candidates: Array<{
      accountId: string;
      displayName: string | null;
      emailAddress?: string;
    }>,
  ): string {
    const lines = candidates
      .map((candidate) => {
        const name = candidate.displayName || candidate.accountId;
        const email = candidate.emailAddress
          ? ` | ${candidate.emailAddress}`
          : "";
        return `- **${name}** | \`${candidate.accountId}\`${email}`;
      })
      .join("\n");

    return [
      `Multiple assignable users matched "${query}" for issue ${issueKey}.`,
      "",
      lines,
      "",
      "Use the exact accountId to disambiguate.",
    ].join("\n");
  }
}
