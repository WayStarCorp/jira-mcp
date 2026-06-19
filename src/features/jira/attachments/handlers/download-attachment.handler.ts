/**
 * Download Attachment Handler
 *
 * MCP tool handler for downloading Jira attachment content
 */

import { AttachmentTooLargeError, McpError } from "@core/errors";
import { type McpResponse, createSuccessResponse } from "@core/responses";
import { BaseToolHandler } from "@core/tools/tool-handler.class";
import {
  JiraApiError,
  JiraAuthenticationError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { formatDownloadMetadataMessage } from "../formatters/attachment.formatter";
import type { DownloadAttachmentUseCase } from "../use-cases/download-attachment.use-case";
import type {
  AttachmentValidator,
  DownloadAttachmentParams,
} from "../validators/attachment.validator";

type DownloadAttachmentExecuteResult =
  | { responseKind: "image"; mimeType: string; base64Data: string }
  | { responseKind: "text"; text: string };

function isTextMimeType(mimeType: string): boolean {
  return mimeType.startsWith("text/") || mimeType === "application/json";
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

function arrayBufferToUtf8Text(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(buffer);
}

export class DownloadAttachmentHandler extends BaseToolHandler<
  DownloadAttachmentParams,
  DownloadAttachmentExecuteResult
> {
  constructor(
    private readonly downloadAttachmentUseCase: DownloadAttachmentUseCase,
    private readonly attachmentValidator: AttachmentValidator,
  ) {
    super("JIRA", "Download Attachment");
  }

  protected async execute(
    params: DownloadAttachmentParams,
  ): Promise<DownloadAttachmentExecuteResult> {
    try {
      const validatedParams =
        this.attachmentValidator.validateDownloadAttachmentParams(params);
      this.logger.info(
        `Downloading attachment: ${validatedParams.attachmentId}`,
      );

      const { metadata, content } =
        await this.downloadAttachmentUseCase.execute({
          attachmentId: validatedParams.attachmentId,
          maxBytes: validatedParams.maxBytes,
        });

      if (metadata.mimeType.startsWith("image/")) {
        return {
          responseKind: "image",
          mimeType: metadata.mimeType,
          base64Data: arrayBufferToBase64(content),
        };
      }

      if (isTextMimeType(metadata.mimeType)) {
        return {
          responseKind: "text",
          text: arrayBufferToUtf8Text(content),
        };
      }

      return {
        responseKind: "text",
        text: formatDownloadMetadataMessage(metadata),
      };
    } catch (error) {
      this.logger.error(`Failed to download attachment: ${error}`);
      throw this.enhanceError(error, params);
    }
  }

  protected formatResult(result: DownloadAttachmentExecuteResult): McpResponse {
    if (result.responseKind === "image") {
      return createSuccessResponse("", {
        content: [
          {
            type: "image",
            data: result.base64Data,
            mimeType: result.mimeType,
          },
        ],
      });
    }

    return createSuccessResponse(result.text);
  }

  private enhanceError(
    error: unknown,
    params?: DownloadAttachmentParams,
  ): Error {
    const idContext = params?.attachmentId
      ? ` for attachment ${params.attachmentId}`
      : "";

    if (error instanceof AttachmentTooLargeError) {
      return error;
    }

    if (error instanceof McpError && error.message.includes("not found")) {
      return new Error(
        `❌ **Attachment Not Found**\n\n${error.message}\n\n**Solutions:**\n- Verify the attachment id from jira_get_issue or jira_get_issue_attachments\n- Check the attachment still exists on the issue\n\n**Example:** \`jira_download_attachment attachmentId="10042"\``,
      );
    }

    if (error instanceof JiraAuthenticationError) {
      return new Error(
        `❌ **Authentication Failed**\n\n${error.message}\n\n**Solutions:**\n- Verify JIRA_USERNAME and JIRA_API_TOKEN\n- Regenerate API token if expired`,
      );
    }

    if (error instanceof JiraPermissionError) {
      return new Error(
        `❌ **Permission Denied**\n\nYou don't have permission to download attachments${idContext}.\n\n**Solutions:**\n- Check your JIRA permissions\n- Verify Jira scopes include read:attachment\n\n**Required Permissions:** Browse Projects`,
      );
    }

    if (error instanceof JiraApiError) {
      return new Error(
        `❌ **JIRA API Error**\n\n${error.message}\n\n**Solutions:**\n- Check the attachment id is valid\n- Verify your JIRA connection\n\n**Example:** \`jira_download_attachment attachmentId="10042"\``,
      );
    }

    if (error instanceof Error) {
      return new Error(
        `❌ **Attachment Download Failed**\n\n${error.message}${idContext}\n\n**Solutions:**\n- Check attachment id and maxBytes\n- Try a larger maxBytes up to the hard maximum\n\n**Example:** \`jira_download_attachment attachmentId="10042"\``,
      );
    }

    return new Error(
      `❌ **Unknown Error**\n\nAn unknown error occurred during attachment download${idContext}.`,
    );
  }
}
