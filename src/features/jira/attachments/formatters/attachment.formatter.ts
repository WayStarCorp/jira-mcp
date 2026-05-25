/**
 * Attachment list and issue-section formatters (markdown)
 */

import type { Formatter } from "@features/jira/shared/formatters/formatter.interface";
import type { AttachmentMetadata } from "../models";

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * 1024;

/** Human-readable size for attachment markdown (KB or MB) */
export function formatAttachmentSize(bytes: number): string {
  if (bytes >= BYTES_PER_MB) {
    const mb = bytes / BYTES_PER_MB;
    const rounded =
      mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10;
    return `${rounded} MB`;
  }
  const kb = Math.round(bytes / BYTES_PER_KB);
  return `${kb} KB`;
}

function formatAttachmentDate(created: string): string {
  const date = new Date(created);
  if (Number.isNaN(date.getTime())) {
    return created.slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function formatListEntry(attachment: AttachmentMetadata): string {
  const size = formatAttachmentSize(attachment.size);
  const date = formatAttachmentDate(attachment.created);
  const header = `📎 ${attachment.filename} (${attachment.mimeType}, ${size}) — uploaded by ${attachment.author} on ${date}`;
  const meta = `   id: ${attachment.id}  isImage: ${attachment.isImage}`;
  return `${header}\n${meta}`;
}

function formatCompactLine(attachment: AttachmentMetadata): string {
  const size = formatAttachmentSize(attachment.size);
  let line = `📎 ${attachment.filename} (${attachment.mimeType}, ${size}) · id: ${attachment.id}`;
  if (attachment.isImage) {
    line += " · use jira_download_attachment to view";
  }
  return line;
}

export interface AttachmentListInput {
  issueKey: string;
  attachments: AttachmentMetadata[];
}

export class AttachmentFormatter
  implements Formatter<AttachmentListInput, string>
{
  format(input: AttachmentListInput): string {
    return this.formatAttachmentList(input.issueKey, input.attachments);
  }

  formatAttachmentList(
    issueKey: string,
    attachments: AttachmentMetadata[],
  ): string {
    if (attachments.length === 0) {
      return `No attachments found for ${issueKey}`;
    }

    const count = attachments.length;
    const fileWord = count === 1 ? "file" : "files";
    const header = `Attachments for ${issueKey} (${count} ${fileWord}):`;
    const entries = attachments.map(formatListEntry);
    return [header, "", ...entries].join("\n");
  }

  formatIssueAttachmentsSection(attachments: AttachmentMetadata[]): string {
    const count = attachments.length;
    const header = `## Attachments (${count})`;
    const lines = attachments.map(formatCompactLine);
    return [header, ...lines].join("\n");
  }
}
