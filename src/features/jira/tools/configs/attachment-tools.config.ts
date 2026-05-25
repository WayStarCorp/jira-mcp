/**
 * Attachment Tools Configuration
 *
 * Defines configuration for attachment-related JIRA tools
 */

import type { ToolConfig, ToolHandler } from "../types";
import { getIssueAttachmentsParamsSchema } from "../../attachments";

/**
 * Attachment tools configuration factory
 */
export function createAttachmentToolsConfig(tools: {
  jira_get_issue_attachments: ToolHandler;
}): ToolConfig[] {
  return [
    {
      name: "jira_get_issue_attachments",
      description:
        "List file attachments on a Jira issue (metadata only: filename, mimeType, size, author, id). Does not download file content — use jira_download_attachment for that. Reuses GET /rest/api/3/issue/{issueKey} fields.attachment.",
      params: getIssueAttachmentsParamsSchema.shape,
      handler: tools.jira_get_issue_attachments.handle.bind(
        tools.jira_get_issue_attachments,
      ),
    },
  ];
}
