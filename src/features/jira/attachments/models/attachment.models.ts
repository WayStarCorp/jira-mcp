/**
 * Jira issue attachment models
 */

/** Raw attachment object from Jira REST API */
export interface JiraAttachmentDto {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  created: string;
  author?: { displayName?: string } | null;
  content: string;
}

/** Normalized attachment metadata for tools and formatters */
export interface AttachmentMetadata {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  created: string;
  author: string;
  /** Internal download URL — do not expose in markdown or logs */
  contentUrl: string;
  isImage: boolean;
}

export function mapJiraAttachment(raw: JiraAttachmentDto): AttachmentMetadata {
  return {
    id: String(raw.id),
    filename: raw.filename,
    mimeType: raw.mimeType,
    size: raw.size,
    created: raw.created,
    author: raw.author?.displayName ?? "Unknown",
    contentUrl: raw.content,
    isImage: raw.mimeType.startsWith("image/"),
  };
}

/** Extract attachments from issue fields.attachment */
export function mapIssueAttachments(
  attachments: unknown,
): AttachmentMetadata[] {
  if (!Array.isArray(attachments)) {
    return [];
  }
  return attachments
    .filter(isJiraAttachmentDto)
    .map((item) => mapJiraAttachment(item));
}

function isJiraAttachmentDto(value: unknown): value is JiraAttachmentDto {
  if (!value || typeof value !== "object") {
    return false;
  }
  const a = value as Record<string, unknown>;
  return (
    typeof a.id === "string" &&
    typeof a.filename === "string" &&
    typeof a.mimeType === "string" &&
    typeof a.size === "number" &&
    typeof a.created === "string" &&
    typeof a.content === "string"
  );
}
