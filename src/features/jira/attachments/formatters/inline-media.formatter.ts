/**
 * Inline ADF media block formatter (resolved / unresolved)
 */

import type { Formatter } from "@features/jira/shared/formatters/formatter.interface";
import type { ParsedMedia } from "@features/jira/shared/parsers/adf.parser";
import type { AttachmentMetadata } from "../models";

export interface InlineMediaFormatterInput {
  media: ParsedMedia[];
  attachments: AttachmentMetadata[];
}

function findAttachmentByMediaId(
  mediaId: string,
  attachments: AttachmentMetadata[],
): AttachmentMetadata | undefined {
  return attachments.find((a) => a.id === mediaId);
}

function formatMediaLine(
  media: ParsedMedia,
  attachments: AttachmentMetadata[],
): string {
  const match = findAttachmentByMediaId(media.mediaId, attachments);
  if (match) {
    return `  📷 attachment id: ${match.id} → ${match.filename} (${match.mimeType})`;
  }
  return `  📷 media id: ${media.mediaId} → [unresolved: no matching attachment found]`;
}

export class InlineMediaFormatter
  implements Formatter<InlineMediaFormatterInput, string>
{
  format(input: InlineMediaFormatterInput): string {
    const { media, attachments } = input;

    if (media.length === 0) {
      return "";
    }

    const lines = media.map((item) => formatMediaLine(item, attachments));
    return ["Inline media:", ...lines].join("\n");
  }
}

const defaultInlineMediaFormatter = new InlineMediaFormatter();

/** Format inline ADF media block for issue description or comments */
export function formatInlineMediaBlock(
  media: ParsedMedia[],
  attachments: AttachmentMetadata[],
): string {
  return defaultInlineMediaFormatter.format({ media, attachments });
}
