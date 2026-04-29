import { logger } from "@core/logging";
import { JiraApiError } from "@features/jira/client/errors";
import type { IssueLinkType, LinkIssuesRequest } from "../models";
import type { IssueLinkRepository } from "../repositories/issue-link.repository";
import type { LinkIssuesParams } from "../validators/issue-link.validator";

/**
 * Use case for retrieving Jira issue link types.
 */
export interface GetIssueLinkTypesUseCase {
  execute(): Promise<IssueLinkType[]>;
}

/**
 * Use case for creating a Jira issue link.
 */
export interface LinkIssuesUseCase {
  execute(params: LinkIssuesParams): Promise<void>;
}

/**
 * Implementation of GetIssueLinkTypesUseCase
 */
export class GetIssueLinkTypesUseCaseImpl implements GetIssueLinkTypesUseCase {
  private readonly logger = logger;

  constructor(private readonly issueLinkRepository: IssueLinkRepository) {}

  async execute(): Promise<IssueLinkType[]> {
    this.logger.debug("Executing get issue link types use case", {
      prefix: "JIRA:GetIssueLinkTypesUseCase",
    });

    return this.issueLinkRepository.getIssueLinkTypes();
  }
}

/**
 * Implementation of LinkIssuesUseCase
 */
export class LinkIssuesUseCaseImpl implements LinkIssuesUseCase {
  private readonly logger = logger;

  constructor(private readonly issueLinkRepository: IssueLinkRepository) {}

  async execute(params: LinkIssuesParams): Promise<void> {
    this.logger.debug("Executing link issues use case", {
      prefix: "JIRA:LinkIssuesUseCase",
      inwardIssueKey: params.inwardIssueKey,
      outwardIssueKey: params.outwardIssueKey,
      linkTypeName: params.linkTypeName,
    });

    const types = await this.issueLinkRepository.getIssueLinkTypes();

    if (types.length === 0) {
      throw JiraApiError.withStatusCode(
        "No issue link types found in this Jira instance. Ask a Jira administrator to configure link types first.",
        400,
      );
    }

    const normalizedInput = params.linkTypeName.trim().toLowerCase();
    const matches = types.filter(
      (type) => type.name.toLowerCase() === normalizedInput,
    );

    if (matches.length === 0) {
      const available = types.map((type) => `"${type.name}"`).join(", ");
      throw JiraApiError.withStatusCode(
        `Link type '${params.linkTypeName}' not found. Available types: ${available}. Use jira_get_issue_link_types to see directions (inward/outward).`,
        400,
      );
    }

    if (matches.length > 1) {
      const names = matches.map((type) => `"${type.name}"`).join(", ");
      throw JiraApiError.withStatusCode(
        `Ambiguous link type '${params.linkTypeName}'. Multiple matches found: ${names}. Use the exact name from jira_get_issue_link_types.`,
        400,
      );
    }

    const canonicalName = matches[0].name;
    const request: LinkIssuesRequest = {
      inwardIssueKey: params.inwardIssueKey,
      outwardIssueKey: params.outwardIssueKey,
      linkTypeName: canonicalName,
      comment: params.comment,
    };

    await this.issueLinkRepository.linkIssues(request);

    this.logger.debug("Link created successfully", {
      prefix: "JIRA:LinkIssuesUseCase",
      linkTypeName: canonicalName,
    });
  }
}
