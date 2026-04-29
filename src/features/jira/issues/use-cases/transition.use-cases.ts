/**
 * Issue transition use cases
 *
 * Types and interfaces for transitioning issue statuses in the workflow
 */

import { JiraApiError } from "@features/jira/client/errors";
import type { Transition } from "../models";
import type { IssueTransitionRepository } from "../repositories/issue-transition.repository";

/**
 * Request for transitioning an issue to a different status
 */
export interface TransitionIssueRequest {
  /**
   * ID of the transition to apply
   */
  transitionId: string;

  /**
   * Optional fields to update during transition
   */
  fields?: Record<string, unknown>;
}

/**
 * Request for transitioning a specific issue.
 */
export interface TransitionIssueUseCaseRequest {
  issueKey: string;
  transitionId?: string;
  statusName?: string;
  fields?: Record<string, unknown>;
}

/**
 * Result of a successful transition.
 */
export interface TransitionIssueUseCaseResult {
  issueKey: string;
  transition: Transition;
}

/**
 * Use case contract for transitioning issues.
 */
export interface TransitionIssueUseCase {
  execute(
    request: TransitionIssueUseCaseRequest,
  ): Promise<TransitionIssueUseCaseResult>;
}

/**
 * Implementation of issue transition matching and execution.
 */
export class TransitionIssueUseCaseImpl implements TransitionIssueUseCase {
  constructor(
    private readonly transitionRepository: IssueTransitionRepository,
  ) {}

  async execute(
    request: TransitionIssueUseCaseRequest,
  ): Promise<TransitionIssueUseCaseResult> {
    const transitions = await this.transitionRepository.getIssueTransitions(
      request.issueKey,
    );
    const transition = this.resolveTransition(request, transitions);

    try {
      await this.transitionRepository.transitionIssue(
        request.issueKey,
        transition.id,
        request.fields,
      );

      return {
        issueKey: request.issueKey,
        transition,
      };
    } catch (error) {
      if (error instanceof JiraApiError) {
        throw error;
      }

      if (error instanceof Error) {
        throw JiraApiError.withStatusCode(
          `Failed to transition issue '${request.issueKey}': ${error.message}`,
          400,
          { issueKey: request.issueKey, transitionId: transition.id },
        );
      }

      throw error;
    }
  }

  private resolveTransition(
    request: TransitionIssueUseCaseRequest,
    transitions: Transition[],
  ): Transition {
    if (request.transitionId) {
      const transitionId = request.transitionId;
      const transition = transitions.find(
        (candidate) =>
          this.normalize(candidate.id) === this.normalize(transitionId),
      );

      if (!transition) {
        throw JiraApiError.withStatusCode(
          this.buildNotFoundMessage(
            request.issueKey,
            request.transitionId,
            transitions,
          ),
          400,
          { issueKey: request.issueKey, transitionId: request.transitionId },
        );
      }

      return transition;
    }

    const query = this.normalize(request.statusName || "");
    const exactMatches = transitions.filter((candidate) =>
      this.matchesExact(candidate, query),
    );

    if (exactMatches.length === 1) {
      return exactMatches[0];
    }

    if (exactMatches.length > 1) {
      throw JiraApiError.withStatusCode(
        this.buildAmbiguousMessage(
          request.issueKey,
          request.statusName || "",
          exactMatches,
          transitions,
        ),
        400,
        { issueKey: request.issueKey, statusName: request.statusName },
      );
    }

    const partialMatches = transitions.filter((candidate) =>
      this.matchesPartial(candidate, query),
    );

    if (partialMatches.length === 1) {
      return partialMatches[0];
    }

    if (partialMatches.length > 1) {
      throw JiraApiError.withStatusCode(
        this.buildAmbiguousMessage(
          request.issueKey,
          request.statusName || "",
          partialMatches,
          transitions,
        ),
        400,
        { issueKey: request.issueKey, statusName: request.statusName },
      );
    }

    throw JiraApiError.withStatusCode(
      this.buildNotFoundMessage(
        request.issueKey,
        request.statusName || "",
        transitions,
      ),
      400,
      { issueKey: request.issueKey, statusName: request.statusName },
    );
  }

  private matchesExact(candidate: Transition, query: string): boolean {
    if (!query) {
      return false;
    }

    return (
      this.normalize(candidate.name) === query ||
      this.normalize(candidate.to.name) === query
    );
  }

  private matchesPartial(candidate: Transition, query: string): boolean {
    if (!query) {
      return false;
    }

    return (
      this.normalize(candidate.name).includes(query) ||
      this.normalize(candidate.to.name).includes(query)
    );
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
  }

  private buildTransitionSummary(transitions: Transition[]): string {
    return transitions
      .map(
        (candidate) =>
          `- \`${candidate.id}\`: ${candidate.name} -> ${candidate.to.name}`,
      )
      .join("\n");
  }

  private buildNotFoundMessage(
    issueKey: string,
    query: string,
    transitions: Transition[],
  ): string {
    return [
      `No transition matched "${query}" for issue ${issueKey}.`,
      "",
      "Available transitions:",
      this.buildTransitionSummary(transitions),
      "",
      `Use \`jira_get_issue_transitions issueKey=${issueKey}\` to inspect the exact transition names and ids.`,
    ].join("\n");
  }

  private buildAmbiguousMessage(
    issueKey: string,
    query: string,
    matches: Transition[],
    transitions: Transition[],
  ): string {
    return [
      `Multiple transitions matched "${query}" for issue ${issueKey}.`,
      "",
      "Matched transitions:",
      this.buildTransitionSummary(matches),
      "",
      "All available transitions:",
      this.buildTransitionSummary(transitions),
      "",
      "Use `transitionId` for an exact match.",
    ].join("\n");
  }
}
