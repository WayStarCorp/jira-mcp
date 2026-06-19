import { describe, expect, test } from "bun:test";
import { AttachmentFormatter } from "@features/jira/attachments/formatters/attachment.formatter";
import type { AttachmentMetadata } from "@features/jira/attachments/models";

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

const pdfAttachment: AttachmentMetadata = {
  id: "10043",
  filename: "report.pdf",
  mimeType: "application/pdf",
  size: 1_258_291,
  created: "2026-05-20T10:00:00.000Z",
  author: "user@example.com",
  contentUrl:
    "https://example.atlassian.net/secure/attachment/10043/report.pdf",
  isImage: false,
};

describe("AttachmentFormatter", () => {
  const formatter = new AttachmentFormatter();

  describe("formatAttachmentList", () => {
    test("returns empty message when no attachments", () => {
      expect(formatter.formatAttachmentList("SUPP-79", [])).toBe(
        "No attachments found for SUPP-79",
      );
    });

    test("formats list with header, metadata lines, and isImage", () => {
      const output = formatter.formatAttachmentList("SUPP-79", [
        spikeAttachment,
        pdfAttachment,
      ]);

      expect(output).toContain("Attachments for SUPP-79 (2 files):");
      expect(output).toContain(
        "📎 image-20260515-133022.png (image/png, 117 KB) — uploaded by Alisia on 2026-05-15",
      );
      expect(output).toContain("   id: 15894  isImage: true");
      expect(output).toContain(
        "📎 report.pdf (application/pdf, 1.2 MB) — uploaded by user@example.com on 2026-05-20",
      );
      expect(output).toContain("   id: 10043  isImage: false");
      expect(output).not.toContain("contentUrl");
      expect(output).not.toContain("example.atlassian.net");
    });
  });

  describe("formatIssueAttachmentsSection", () => {
    test("formats compact section with download hint for images only", () => {
      const output = formatter.formatIssueAttachmentsSection([
        spikeAttachment,
        pdfAttachment,
      ]);

      expect(output).toBe(
        [
          "## Attachments (2)",
          "📎 image-20260515-133022.png (image/png, 117 KB) · id: 15894 · use jira_download_attachment to view",
          "📎 report.pdf (application/pdf, 1.2 MB) · id: 10043",
        ].join("\n"),
      );
      expect(output).not.toContain("contentUrl");
    });
  });
});
