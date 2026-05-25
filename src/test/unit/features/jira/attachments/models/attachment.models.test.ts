import { describe, expect, test } from "bun:test";
import {
  mapJiraAttachment,
  type JiraAttachmentDto,
} from "@features/jira/attachments/models/attachment.models";

describe("mapJiraAttachment", () => {
  test("maps Jira attachment fields to AttachmentMetadata", () => {
    const raw: JiraAttachmentDto = {
      id: "15894",
      filename: "image-20260515-133022.png",
      mimeType: "image/png",
      size: 120161,
      created: "2026-05-15T13:30:22.000+0000",
      author: { displayName: "Alisia" },
      content: "https://example.atlassian.net/secure/attachment/15894/file.png",
    };
    const meta = mapJiraAttachment(raw);
    expect(meta).toEqual({
      id: "15894",
      filename: "image-20260515-133022.png",
      mimeType: "image/png",
      size: 120161,
      created: "2026-05-15T13:30:22.000+0000",
      author: "Alisia",
      contentUrl:
        "https://example.atlassian.net/secure/attachment/15894/file.png",
      isImage: true,
    });
  });

  test("isImage false for non-image mimeType", () => {
    const meta = mapJiraAttachment({
      id: "1",
      filename: "report.pdf",
      mimeType: "application/pdf",
      size: 100,
      created: "2026-01-01T00:00:00.000Z",
      content: "https://example.atlassian.net/x",
    });
    expect(meta.isImage).toBe(false);
    expect(meta.author).toBe("Unknown");
  });
});
