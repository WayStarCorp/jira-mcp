/**
 * Get Issue Transitions Use Case
 *
 * Fetches available transitions for a Jira issue.
 */

import { JiraApiError } from "@features/jira/client/errors";
import type { Transition } from "../models";
import type { IssueTransitionRepository } from "../repositories/issue-transition.repository";

export interface GetIssueTransitionsUseCase {
  execute(issueKey: string): Promise<Transition[]>;
}

export class GetIssueTransitionsUseCaseImpl
  implements GetIssueTransitionsUseCase
{
  constructor(
    private readonly transitionRepository: IssueTransitionRepository,
  ) {}

  async execute(issueKey: string): Promise<Transition[]> {
    try {
      return await this.transitionRepository.getIssueTransitions(issueKey);
    } catch (error) {
      if (error instanceof JiraApiError) {
        throw error;
      }

      if (error instanceof Error) {
        throw JiraApiError.withStatusCode(
          `Failed to get transitions for issue '${issueKey}': ${error.message}`,
          400,
          { issueKey },
        );
      }

      throw error;
    }
  }
}
