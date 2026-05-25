/**
 * Comments Formatter Unit Tests
 * Co-located unit tests for JIRA comments formatter
 */

import { beforeEach, describe, expect, test } from "bun:test";
import type { AttachmentMetadata } from "@features/jira/attachments/models";
import {
  type CommentsContext,
  CommentsFormatter,
} from "@features/jira/issues/formatters/comments.formatter";
import type { Comment } from "@features/jira/issues/models/comment.models";
import type { ADFDocument } from "@features/jira/shared/parsers/adf.parser";
import { setupTests } from "@test/utils/test-setup";

// Setup test environment
setupTests();

describe("CommentsFormatter", () => {
  let formatter: CommentsFormatter;

  beforeEach(() => {
    formatter = new CommentsFormatter();
  });

  describe("format method", () => {
    test("should format empty comments array", () => {
      const context: CommentsContext = {
        issueKey: "TEST-123",
        totalComments: 0,
      };

      const result = formatter.format({ comments: [], context });

      expect(result).toContain("# 💬 Comments for TEST-123");
      expect(result).toContain("**No comments found**");
      expect(result).toContain("This issue doesn't have any comments yet.");
    });

    test("should format single comment correctly", () => {
      const comment: Comment = {
        id: "1",
        self: "https://test.atlassian.net/rest/api/3/issue/123/comment/1",
        author: {
          displayName: "John Doe",
          accountId: "user-123",
        },
        body: "This is a test comment",
        created: "2024-01-15T10:30:00.000Z",
        updated: "2024-01-15T10:30:00.000Z",
      };

      const context: CommentsContext = {
        issueKey: "TEST-123",
        totalComments: 1,
      };

      const result = formatter.format({ comments: [comment], context });

      expect(result).toContain("# 💬 Comments for TEST-123");
      expect(result).toContain("**Total:** 1 comment");
      expect(result).toContain(
        "## Comment #1 • John Doe • Jan 15, 2024, 10:30 AM",
      );
      expect(result).toContain("This is a test comment");
      expect(result).not.toContain("Navigation:");
    });

    test("should format multiple comments correctly", () => {
      const comments: Comment[] = [
        {
          id: "1",
          self: "https://test.atlassian.net/rest/api/3/issue/123/comment/1",
          author: {
            displayName: "John Doe",
            accountId: "user-123",
          },
          body: "First comment",
          created: "2024-01-15T10:30:00.000Z",
          updated: "2024-01-15T10:30:00.000Z",
        },
        {
          id: "2",
          self: "https://test.atlassian.net/rest/api/3/issue/123/comment/2",
          author: {
            displayName: "Jane Smith",
            accountId: "user-456",
          },
          body: "Second comment",
          created: "2024-01-16T14:45:00.000Z",
          updated: "2024-01-16T14:45:00.000Z",
        },
      ];

      const context: CommentsContext = {
        issueKey: "TEST-123",
        totalComments: 2,
      };

      const result = formatter.format({ comments, context });

      expect(result).toContain("**Total:** 2 comments");
      expect(result).toContain("## Comment #1 • John Doe •");
      expect(result).toContain("First comment");
      expect(result).toContain("## Comment #2 • Jane Smith •");
      expect(result).toContain("Second comment");
      expect(result).toContain("---"); // Separator between comments
    });

    test("should handle ADF body content", () => {
      const adfBody: ADFDocument = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "This is a " },
              { type: "text", text: "formatted", marks: [{ type: "strong" }] },
              { type: "text", text: " comment." },
            ],
          },
        ],
      };

      const comment: Comment = {
        id: "1",
        self: "https://test.atlassian.net/rest/api/3/issue/123/comment/1",
        author: {
          displayName: "John Doe",
          accountId: "user-123",
        },
        body: adfBody,
        created: "2024-01-15T10:30:00.000Z",
        updated: "2024-01-15T10:30:00.000Z",
      };

      const context: CommentsContext = {
        issueKey: "TEST-123",
        totalComments: 1,
      };

      const result = formatter.format({ comments: [comment], context });

      expect(result).toContain("This is a **formatted** comment.");
    });

    test("should handle empty or null comment body", () => {
      const comment: Comment = {
        id: "1",
        self: "https://test.atlassian.net/rest/api/3/issue/123/comment/1",
        author: {
          displayName: "John Doe",
          accountId: "user-123",
        },
        body: null,
        created: "2024-01-15T10:30:00.000Z",
        updated: "2024-01-15T10:30:00.000Z",
      };

      const context: CommentsContext = {
        issueKey: "TEST-123",
        totalComments: 1,
      };

      const result = formatter.format({ comments: [comment], context });

      expect(result).toContain("_No content_");
    });

    test("should display edit information for updated comments", () => {
      const comment: Comment = {
        id: "1",
        self: "https://test.atlassian.net/rest/api/3/issue/123/comment/1",
        author: {
          displayName: "John Doe",
          accountId: "user-123",
        },
        updateAuthor: {
          displayName: "Jane Smith",
          accountId: "user-456",
        },
        body: "This comment was edited",
        created: "2024-01-15T10:30:00.000Z",
        updated: "2024-01-16T14:45:00.000Z",
      };

      const context: CommentsContext = {
        issueKey: "TEST-123",
        totalComments: 1,
      };

      const result = formatter.format({ comments: [comment], context });

      expect(result).toContain("_Last edited:");
      expect(result).toContain("by Jane Smith");
    });

    test("should handle self-edited comments", () => {
      const comment: Comment = {
        id: "1",
        self: "https://test.atlassian.net/rest/api/3/issue/123/comment/1",
        author: {
          displayName: "John Doe",
          accountId: "user-123",
        },
        body: "This comment was self-edited",
        created: "2024-01-15T10:30:00.000Z",
        updated: "2024-01-16T14:45:00.000Z",
      };

      const context: CommentsContext = {
        issueKey: "TEST-123",
        totalComments: 1,
      };

      const result = formatter.format({ comments: [comment], context });

      expect(result).toContain("_Last edited:");
      expect(result).not.toContain(" by "); // Should not show "by" when same author
    });

    test("should mark internal comments with visibility restrictions", () => {
      const comment: Comment = {
        id: "1",
        self: "https://test.atlassian.net/rest/api/3/issue/123/comment/1",
        author: {
          displayName: "John Doe",
          accountId: "user-123",
        },
        body: "This is an internal comment",
        created: "2024-01-15T10:30:00.000Z",
        updated: "2024-01-15T10:30:00.000Z",
        visibility: {
          type: "role",
          value: "Developers",
        },
      };

      const context: CommentsContext = {
        issueKey: "TEST-123",
        totalComments: 1,
      };

      const result = formatter.format({ comments: [comment], context });

      expect(result).toContain("🔒 Comment #1");
      expect(result).toContain("_Internal comment - restricted visibility_");
    });

    test("should mark internal comments with jsdPublic false", () => {
      const comment: Comment = {
        id: "1",
        self: "https://test.atlassian.net/rest/api/3/issue/123/comment/1",
        author: {
          displayName: "John Doe",
          accountId: "user-123",
        },
        body: "This is a JSD internal comment",
        created: "2024-01-15T10:30:00.000Z",
        updated: "2024-01-15T10:30:00.000Z",
        jsdPublic: false,
      };

      const context: CommentsContext = {
        issueKey: "TEST-123",
        totalComments: 1,
      };

      const result = formatter.format({ comments: [comment], context });

      expect(result).toContain("🔒 Comment #1");
      expect(result).toContain("_Internal comment - restricted visibility_");
    });

    test("should show navigation help for truncated comments", () => {
      const comments: Comment[] = [
        {
          id: "1",
          self: "https://test.atlassian.net/rest/api/3/issue/123/comment/1",
          author: {
            displayName: "John Doe",
            accountId: "user-123",
          },
          body: "Comment 1",
          created: "2024-01-15T10:30:00.000Z",
          updated: "2024-01-15T10:30:00.000Z",
        },
      ];

      const context: CommentsContext = {
        issueKey: "TEST-123",
        totalComments: 5,
        maxDisplayed: 1,
      };

      const result = formatter.format({ comments, context });

      expect(result).toContain("**Showing:** 1");
      expect(result).toContain(
        "**Navigation:** Use `get_issue_comments TEST-123 maxComments:11` to see 4 more comments.",
      );
    });

    test("should handle unknown user gracefully", () => {
      const comment: Comment = {
        id: "1",
        self: "https://test.atlassian.net/rest/api/3/issue/123/comment/1",
        author: {
          displayName: null,
          accountId: "unknown-user",
        },
        body: "Comment from unknown user",
        created: "2024-01-15T10:30:00.000Z",
        updated: "2024-01-15T10:30:00.000Z",
      };

      const context: CommentsContext = {
        issueKey: "TEST-123",
        totalComments: 1,
      };

      const result = formatter.format({ comments: [comment], context });

      expect(result).toContain("Unknown User");
    });

    test("should handle malformed dates gracefully", () => {
      const comment: Comment = {
        id: "1",
        self: "https://test.atlassian.net/rest/api/3/issue/123/comment/1",
        author: {
          displayName: "John Doe",
          accountId: "user-123",
        },
        body: "Comment with bad date",
        created: "invalid-date-format",
        updated: "invalid-date-format",
      };

      const context: CommentsContext = {
        issueKey: "TEST-123",
        totalComments: 1,
      };

      const result = formatter.format({ comments: [comment], context });

      expect(result).toContain("Invalid Date"); // Should show "Invalid Date" for malformed dates
    });

    test("should show latest comment date in summary", () => {
      const comments: Comment[] = [
        {
          id: "1",
          self: "https://test.atlassian.net/rest/api/3/issue/123/comment/1",
          author: {
            displayName: "John Doe",
            accountId: "user-123",
          },
          body: "First comment",
          created: "2024-01-15T10:30:00.000Z",
          updated: "2024-01-15T10:30:00.000Z",
        },
        {
          id: "2",
          self: "https://test.atlassian.net/rest/api/3/issue/123/comment/2",
          author: {
            displayName: "Jane Smith",
            accountId: "user-456",
          },
          body: "Latest comment",
          created: "2024-01-16T14:45:00.000Z",
          updated: "2024-01-16T14:45:00.000Z",
        },
      ];

      const context: CommentsContext = {
        issueKey: "TEST-123",
        totalComments: 2,
      };

      const result = formatter.format({ comments, context });

      expect(result).toContain("**Latest:** Jan 16, 2024, 02:45 PM");
    });

    test("should append inline media block when ADF has media and id matches attachment", () => {
      const mediaId = "10042";
      const adfBody: ADFDocument = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "mediaSingle",
            content: [
              {
                type: "media",
                attrs: { id: mediaId, type: "file", alt: "screenshot.png" },
              },
            ],
          },
        ],
      };

      const comment: Comment = {
        id: "comment-99",
        self: "https://test.atlassian.net/rest/api/3/issue/123/comment/99",
        author: { displayName: "John Doe", accountId: "user-123" },
        body: adfBody,
        created: "2024-01-15T10:30:00.000Z",
        updated: "2024-01-15T10:30:00.000Z",
      };

      const attachments: AttachmentMetadata[] = [
        {
          id: mediaId,
          filename: "screenshot.png",
          mimeType: "image/png",
          size: 1024,
          created: "2024-01-15T10:00:00.000Z",
          author: "John Doe",
          contentUrl: "https://example.atlassian.net/secure/attachment/10042/file.png",
          isImage: true,
        },
      ];

      const context: CommentsContext = {
        issueKey: "TEST-123",
        totalComments: 1,
      };

      const result = formatter.format({
        comments: [comment],
        context,
        attachments,
      });

      expect(result).toContain("[media: 10042]");
      expect(result).toContain("Inline media:");
      expect(result).toContain(
        "  📷 attachment id: 10042 → screenshot.png (image/png)",
      );
      expect(result).not.toContain("comment-99");
    });

    test("should show unresolved inline media when media id does not match attachments", () => {
      const adfBody: ADFDocument = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "mediaSingle",
            content: [
              {
                type: "media",
                attrs: {
                  id: "aad76a6d-uuid",
                  type: "file",
                  alt: "shot.png",
                },
              },
            ],
          },
        ],
      };

      const comment: Comment = {
        id: "10001",
        self: "https://test.atlassian.net/rest/api/3/issue/123/comment/1",
        author: { displayName: "John Doe", accountId: "user-123" },
        body: adfBody,
        created: "2024-01-15T10:30:00.000Z",
        updated: "2024-01-15T10:30:00.000Z",
      };

      const attachments: AttachmentMetadata[] = [
        {
          id: "15894",
          filename: "shot.png",
          mimeType: "image/png",
          size: 1024,
          created: "2024-01-15T10:00:00.000Z",
          author: "John Doe",
          contentUrl: "https://example.atlassian.net/secure/attachment/15894/file.png",
          isImage: true,
        },
      ];

      const context: CommentsContext = {
        issueKey: "TEST-123",
        totalComments: 1,
      };

      const result = formatter.format({
        comments: [comment],
        context,
        attachments,
      });

      expect(result).toContain(
        "  📷 media id: aad76a6d-uuid → [unresolved: no matching attachment found]",
      );
    });

    test("should not add inline media block for plain text comment body", () => {
      const comment: Comment = {
        id: "1",
        self: "https://test.atlassian.net/rest/api/3/issue/123/comment/1",
        author: { displayName: "John Doe", accountId: "user-123" },
        body: "Plain text only",
        created: "2024-01-15T10:30:00.000Z",
        updated: "2024-01-15T10:30:00.000Z",
      };

      const context: CommentsContext = {
        issueKey: "TEST-123",
        totalComments: 1,
      };

      const result = formatter.format({
        comments: [comment],
        context,
        attachments: [
          {
            id: "10042",
            filename: "screenshot.png",
            mimeType: "image/png",
            size: 1024,
            created: "2024-01-15T10:00:00.000Z",
            author: "John Doe",
            contentUrl: "https://example.atlassian.net/secure/attachment/10042/file.png",
            isImage: true,
          },
        ],
      });

      expect(result).not.toContain("Inline media:");
      expect(result).toContain("Plain text only");
    });

    test("should use singular form for single comment in navigation", () => {
      const comments: Comment[] = [
        {
          id: "1",
          self: "https://test.atlassian.net/rest/api/3/issue/123/comment/1",
          author: {
            displayName: "John Doe",
            accountId: "user-123",
          },
          body: "First comment",
          created: "2024-01-15T10:30:00.000Z",
          updated: "2024-01-15T10:30:00.000Z",
        },
      ];

      const context: CommentsContext = {
        issueKey: "TEST-123",
        totalComments: 2,
        maxDisplayed: 1,
      };

      const result = formatter.format({ comments, context });

      expect(result).toContain("to see 1 more comment."); // Singular form
    });
  });
});
