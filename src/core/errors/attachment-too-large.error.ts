import { McpError } from "./mcp.error";

/**
 * Thrown when attachment download exceeds the configured maxBytes limit.
 */
export class AttachmentTooLargeError extends McpError {
  constructor(public readonly maxBytes: number) {
    super(
      `File exceeds maxBytes limit (${maxBytes} bytes). Pass a larger maxBytes up to the hard maximum.`,
      "ATTACHMENT_TOO_LARGE",
      { maxBytes },
    );
  }
}
