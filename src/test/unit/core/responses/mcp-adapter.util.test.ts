/**
 * MCP Adapter Utilities Tests
 */

import { describe, expect, test } from "bun:test";
import { adaptToMcpContent } from "@core/responses/mcp-adapter.util";
import type { ImageContent } from "@core/responses/mcp-content.types";
import { createSuccessResponse } from "@core/responses/mcp-response.util";

describe("adaptToMcpContent", () => {
  test("passthrough when response.content is set", () => {
    const image: ImageContent = {
      type: "image",
      data: "aGVsbG8=",
      mimeType: "image/png",
    };
    const response = createSuccessResponse("ignored", { content: [image] });
    const result = adaptToMcpContent(response);
    expect(result.content).toEqual([image]);
    expect(result.content[0]?.type).toBe("image");
    expect(result.isError).toBe(false);
  });

  test("legacy text path when content absent", () => {
    const result = adaptToMcpContent(createSuccessResponse("hello"));
    expect(result.content).toEqual([{ type: "text", text: "hello" }]);
  });

  test("error flag preserved on content passthrough", () => {
    const response = createSuccessResponse("", {
      content: [{ type: "text", text: "err" }],
    });
    response.success = false;
    response.error = "failed";
    response.errorCode = "ERR";
    const result = adaptToMcpContent(response);
    expect(result.isError).toBe(true);
    expect(result.errorCode).toBe("ERR");
  });
});
