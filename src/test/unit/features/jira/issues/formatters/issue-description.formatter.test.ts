/**
 * Issue Description Formatter Unit Tests
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { IssueDescriptionFormatter } from "@features/jira/issues/formatters/issue-description.formatter";
import type { Issue } from "@features/jira/issues/models/issue.models";
import type { ADFDocument } from "@features/jira/shared/parsers/adf.parser";
import { testDataBuilder } from "@test/utils/mock-helpers";
import { setupTests } from "@test/utils/test-setup";

setupTests();

const spikeMediaId = "aad76a6d-d7ee-4db2-af06-dad8645d037b";

const spikeAttachmentDto = {
  id: "15894",
  filename: "image-20260515-133022.png",
  mimeType: "image/png",
  size: 120161,
  created: "2026-05-15T13:30:22.000+0000",
  author: { displayName: "Alisia" },
  content: "https://example.atlassian.net/secure/attachment/15894/file.png",
};

function supp79DescriptionAdf(): ADFDocument {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Screenshot in description:" }],
      },
      {
        type: "mediaSingle",
        attrs: { layout: "center" },
        content: [
          {
            type: "media",
            attrs: {
              type: "file",
              id: spikeMediaId,
              collection: "contentId-123",
              alt: "image-20260515-133022.png",
            },
          },
        ],
      },
    ],
  };
}

describe("IssueDescriptionFormatter", () => {
  let formatter: IssueDescriptionFormatter;

  beforeEach(() => {
    formatter = new IssueDescriptionFormatter();
  });

  test("string description has no inline media block", () => {
    const issue = testDataBuilder.issueWithStatus("To Do", "blue");
    issue.fields = {
      ...issue.fields,
      description: "Plain text only",
    };

    const result = formatter.formatDescription(issue);

    expect(result).toContain("## Description");
    expect(result).toContain("Plain text only");
    expect(result).not.toContain("Inline media:");
  });

  test("ADF with media appends unresolved inline block (SUPP-79 spike)", () => {
    const issue = testDataBuilder.issueWithStatus("To Do", "blue");
    issue.fields = {
      ...issue.fields,
      description: supp79DescriptionAdf(),
      attachment: [spikeAttachmentDto],
    };

    const result = formatter.formatDescription(issue);

    expect(result).toContain("Screenshot in description:");
    expect(result).toContain(`[media: ${spikeMediaId}]`);
    expect(result).toContain("Inline media:");
    expect(result).toContain(
      `  📷 media id: ${spikeMediaId} → [unresolved: no matching attachment found]`,
    );
    expect(result).not.toContain("attachment id: 15894");
  });

  test("ADF without media nodes has no inline media block", () => {
    const issue = testDataBuilder.issueWithStatus("To Do", "blue");
    const adf: ADFDocument = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Text only" }],
        },
      ],
    };
    issue.fields = {
      ...issue.fields,
      description: adf,
      attachment: [spikeAttachmentDto],
    };

    const result = formatter.formatDescription(issue as Issue);

    expect(result).toContain("Text only");
    expect(result).not.toContain("Inline media:");
  });
});
