/**
 * Download Attachment Use Case
 *
 * Fetches attachment metadata and binary content within maxBytes
 */

import { JiraApiError } from "@features/jira/client/errors";
import type { AttachmentMetadata } from "../models";
import type { AttachmentRepository } from "../repositories";

export interface DownloadAttachmentRequest {
  attachmentId: string;
  maxBytes: number;
}

export interface DownloadAttachmentResult {
  metadata: AttachmentMetadata;
  content: ArrayBuffer;
}

export interface DownloadAttachmentUseCase {
  execute(
    request: DownloadAttachmentRequest,
  ): Promise<DownloadAttachmentResult>;
}

export class DownloadAttachmentUseCaseImpl
  implements DownloadAttachmentUseCase
{
  constructor(private readonly attachmentRepository: AttachmentRepository) {}

  public async execute(
    request: DownloadAttachmentRequest,
  ): Promise<DownloadAttachmentResult> {
    try {
      const metadata = await this.attachmentRepository.getMetadata(
        request.attachmentId,
      );
      const content = await this.attachmentRepository.downloadContent(
        metadata,
        request.maxBytes,
      );

      return { metadata, content };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw JiraApiError.withStatusCode(
        `Failed to download attachment: ${String(error)}`,
        400,
      );
    }
  }
}
