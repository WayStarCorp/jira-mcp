import { logger } from "@core/logging";
import type { HttpClient } from "@features/jira/client/http/jira.http.types";
import { ensureADFFormat } from "@features/jira/shared/parsers/adf.parser";
import type { IssueLinkType, LinkIssuesRequest } from "../models";

/**
 * Repository interface for Jira issue link operations
 */
export interface IssueLinkRepository {
  getIssueLinkTypes(): Promise<IssueLinkType[]>;
  linkIssues(request: LinkIssuesRequest): Promise<void>;
}

/**
 * Implementation of IssueLinkRepository
 */
export class IssueLinkRepositoryImpl implements IssueLinkRepository {
  private readonly logger = logger;

  constructor(private readonly httpClient: HttpClient) {}

  async getIssueLinkTypes(): Promise<IssueLinkType[]> {
    this.logger.debug("Getting issue link types", {
      prefix: "JIRA:IssueLinkRepository",
    });

    const response = await this.httpClient.sendRequest<{
      issueLinkTypes: IssueLinkType[];
    }>({
      endpoint: "issueLinkType",
      method: "GET",
    });

    return response.issueLinkTypes;
  }

  async linkIssues(request: LinkIssuesRequest): Promise<void> {
    this.logger.debug(
      `Linking ${request.outwardIssueKey} to ${request.inwardIssueKey} via ${request.linkTypeName}`,
      {
        prefix: "JIRA:IssueLinkRepository",
      },
    );

    const body: Record<string, unknown> = {
      type: { name: request.linkTypeName },
      inwardIssue: { key: request.inwardIssueKey },
      outwardIssue: { key: request.outwardIssueKey },
    };

    if (request.comment) {
      body.comment = { body: ensureADFFormat(request.comment) };
    }

    await this.httpClient.sendRequest<void>({
      endpoint: "issueLink",
      method: "POST",
      body,
    });
  }
}
