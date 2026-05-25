import { describe, expect, test } from "bun:test";
import { AttachmentTooLargeError } from "@core/errors/attachment-too-large.error";

describe("AttachmentTooLargeError", () => {
  test("message includes byte limit", () => {
    const maxBytes = 50 * 1024 * 1024;
    const err = new AttachmentTooLargeError(maxBytes);
    expect(err.message).toContain(String(maxBytes));
    expect(err.code).toBe("ATTACHMENT_TOO_LARGE");
    expect(err.maxBytes).toBe(maxBytes);
  });
});
