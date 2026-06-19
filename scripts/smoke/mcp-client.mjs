/**
 * Shared MCP stdio client for local smoke scripts (dist/index.js).
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * @param {{ cwd?: string; name?: string }} [options]
 */
export async function connectLocalMcp(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const distEntry = resolve(cwd, "dist/index.js");
  if (!existsSync(distEntry)) {
    throw new Error(`Missing ${distEntry}. Run: bun run build`);
  }

  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    cwd,
    env: { ...process.env },
  });

  const client = new Client({
    name: options.name ?? "jira-mcp-smoke",
    version: "1.0.0",
  });
  await client.connect(transport);

  return {
    client,
    async close() {
      await client.close();
    },
  };
}

/**
 * @param {import("@modelcontextprotocol/sdk/client/index.js").Client} client
 * @param {string} toolName
 * @param {Record<string, unknown>} args
 */
export async function callTool(client, toolName, args) {
  const response = await client.callTool({
    name: toolName,
    arguments: args,
  });

  if (response.isError) {
    const text = summarizeContent(response.content).text;
    throw new Error(text || `Tool ${toolName} returned an error response`);
  }

  return summarizeContent(response.content);
}

/**
 * @param {import("@modelcontextprotocol/sdk/types.js").CallToolResult["content"]} content
 */
export function summarizeContent(content) {
  /** @type {string[]} */
  const textParts = [];
  /** @type {{ mimeType: string; dataLength: number }[]} */
  const images = [];

  for (const part of content ?? []) {
    if (part.type === "text" && typeof part.text === "string") {
      textParts.push(part.text);
    }
    if (part.type === "image") {
      images.push({
        mimeType: part.mimeType ?? "unknown",
        dataLength: typeof part.data === "string" ? part.data.length : 0,
      });
    }
  }

  return {
    text: textParts.join("\n").trim(),
    images,
  };
}
