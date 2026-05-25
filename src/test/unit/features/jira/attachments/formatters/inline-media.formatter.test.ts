import { describe, expect, test } from "bun:test";
import type { AttachmentMetadata } from "@features/jira/attachments/models";
import { InlineMediaFormatter } from "@features/jira/attachments/formatters/inline-media.formatter";
import type { ParsedMedia } from "@features/jira/shared/parsers/adf.parser";

const spikeAttachment: AttachmentMetadata = {
  id: "15894",
  filename: "image-20260515-133022.png",
  mimeType: "image/png",
  size: 120161,
  created: "2026-05-15T13:30:22.000+0000",
  author: "Alisia",
  contentUrl: "https://example.atlassian.net/secure/attachment/15894/file.png",
  isImage: true,
};

const spikeMedia: ParsedMedia = {
  mediaId: "aad76a6d-d7ee-4db2-af06-dad8645d037b",
  type: "file",
  alt: "image-20260515-133022.png",
};

describe("InlineMediaFormatter", () => {
  const formatter = new InlineMediaFormatter();

  test("returns empty string when no media", () => {
    expect(
      formatter.format({ media: [], attachments: [spikeAttachment] }),
    ).toBe("");
  });

  test("unresolved when media UUID does not match attachment id (spike)", () => {
    const output = formatter.format({
      media: [spikeMedia],
      attachments: [spikeAttachment],
    });

    expect(output).toBe(
      [
        "Inline media:",
        "  📷 media id: aad76a6d-d7ee-4db2-af06-dad8645d037b → [unresolved: no matching attachment found]",
      ].join("\n"),
    );
  });

  test("resolved when mediaId equals attachment id (string match)", () => {
    const output = formatter.format({
      media: [{ mediaId: "15894", type: "file" }],
      attachments: [spikeAttachment],
    });

    expect(output).toBe(
      [
        "Inline media:",
        "  📷 attachment id: 15894 → image-20260515-133022.png (image/png)",
      ].join("\n"),
    );
  });

  test("formats multiple media with mixed resolution", () => {
    const output = formatter.format({
      media: [
        { mediaId: "15894" },
        { mediaId: "unknown-uuid" },
      ],
      attachments: [spikeAttachment],
    });

    expect(output).toContain(
      "  📷 attachment id: 15894 → image-20260515-133022.png (image/png)",
    );
    expect(output).toContain(
      "  📷 media id: unknown-uuid → [unresolved: no matching attachment found]",
    );
  });

  test("accepts optional commentId without emitting it", () => {
    const output = formatter.format({
      media: [spikeMedia],
      attachments: [spikeAttachment],
      commentId: "10001",
    });

    expect(output).not.toContain("10001");
    expect(output).toContain("[unresolved: no matching attachment found]");
  });
});
