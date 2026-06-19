import { AttachmentTooLargeError, McpError } from "@core/errors";
import { logger } from "@core/logging";
import {
  JiraApiError,
  JiraAuthenticationError,
  JiraErrorCode,
  JiraPermissionError,
} from "@features/jira/client/errors";
import type { HttpClient } from "@features/jira/client/http/jira.http.types";
import {
  type AttachmentMetadata,
  type JiraAttachmentDto,
  mapJiraAttachment,
} from "../models";

const AUTH_MESSAGE = "Check JIRA_USERNAME and JIRA_API_TOKEN";
const PERMISSION_MESSAGE =
  "Insufficient permissions. Verify Jira scopes include read:attachment";
const FORBIDDEN_URL_MESSAGE = "Attachment content URL is not allowed";

/**
 * Repository for Jira attachment metadata and binary download.
 */
export interface AttachmentRepository {
  getMetadata(attachmentId: string): Promise<AttachmentMetadata>;
  downloadContent(
    metadata: AttachmentMetadata,
    maxBytes: number,
  ): Promise<ArrayBuffer>;
}

/**
 * Fetches attachment metadata via REST and downloads content from contentUrl.
 */
export class AttachmentRepositoryImpl implements AttachmentRepository {
  private readonly logger = logger;

  constructor(private readonly httpClient: HttpClient) {}

  async getMetadata(attachmentId: string): Promise<AttachmentMetadata> {
    this.logger.debug(`Getting attachment metadata: ${attachmentId}`, {
      prefix: "JIRA:AttachmentRepository",
    });

    try {
      const raw = await this.httpClient.sendRequest<JiraAttachmentDto>({
        endpoint: `attachment/${encodeURIComponent(attachmentId)}`,
        method: "GET",
      });
      return mapJiraAttachment(raw);
    } catch (error) {
      this.rethrowMappedError(error, attachmentId);
    }
  }

  async downloadContent(
    metadata: AttachmentMetadata,
    maxBytes: number,
  ): Promise<ArrayBuffer> {
    this.logger.debug(`Downloading attachment content: ${metadata.id}`, {
      prefix: "JIRA:AttachmentRepository",
    });

    try {
      return await this.httpClient.downloadBinary(
        metadata.contentUrl,
        maxBytes,
      );
    } catch (error) {
      this.rethrowMappedError(error);
    }
  }

  private rethrowMappedError(error: unknown, attachmentId?: string): never {
    if (error instanceof AttachmentTooLargeError) {
      throw error;
    }

    if (
      error instanceof JiraAuthenticationError ||
      (error instanceof JiraApiError && error.statusCode === 401)
    ) {
      throw new JiraAuthenticationError(AUTH_MESSAGE, 401);
    }

    if (
      error instanceof JiraPermissionError ||
      (error instanceof JiraApiError &&
        (error.statusCode === 403 ||
          error.code === JiraErrorCode.PERMISSION_ERROR))
    ) {
      throw new JiraPermissionError(PERMISSION_MESSAGE);
    }

    if (
      attachmentId &&
      error instanceof JiraApiError &&
      (error.statusCode === 404 || error.code === JiraErrorCode.NOT_FOUND_ERROR)
    ) {
      throw new McpError(`Attachment ${attachmentId} not found`);
    }

    if (
      error instanceof JiraApiError &&
      (error.message.includes("host is not allowed") ||
        error.message.includes("URL host is not allowed"))
    ) {
      throw new McpError(FORBIDDEN_URL_MESSAGE);
    }

    throw error;
  }
}
