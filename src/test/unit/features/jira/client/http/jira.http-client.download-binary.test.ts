import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { AttachmentTooLargeError } from "@core/errors";
import type { JiraConfigService } from "@features/jira/client/config/jira-config.service";
import { JiraApiError } from "@features/jira/client/errors";
import { AttachmentUrlValidator } from "@features/jira/client/http/attachment-url.validator";
import { JiraHttpClient } from "@features/jira/client/http/jira.http-client.impl";

const mockFetch = mock();
Object.defineProperty(globalThis, "fetch", {
  value: mockFetch,
  writable: true,
});

const JIRA_HOST = "https://example.atlassian.net/";
const MAX_REDIRECTS = new AttachmentUrlValidator(JIRA_HOST).maxRedirects;
const ALLOWED_CONTENT_URL =
  "https://example.atlassian.net/rest/api/3/attachment/content/10042";

function allowedRedirectUrl(pathSuffix: string): string {
  return `https://example.atlassian.net/rest/api/3/attachment/content/${pathSuffix}`;
}

function createBinaryResponse(
  data: Uint8Array,
  options?: { contentLength?: string; status?: number },
) {
  const status = options?.status ?? 200;
  const headers = new Headers();
  if (options?.contentLength !== undefined) {
    headers.set("Content-Length", options.contentLength);
  }

  return {
    ok: status >= 200 && status < 300,
    status,
    headers,
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      },
    }),
    arrayBuffer: mock(() =>
      Promise.resolve(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)),
    ),
  };
}

function createRedirectResponse(location: string, status = 302) {
  return {
    ok: false,
    status,
    headers: new Headers({ Location: location }),
    body: null,
    arrayBuffer: mock(() => Promise.resolve(new ArrayBuffer(0))),
  };
}

describe("JiraHttpClient.downloadBinary", () => {
  const mockConfig = {
    hostUrl: JIRA_HOST,
    username: "test@example.com",
    apiToken: "test-api-token",
    maxRetries: 3,
    timeout: 10000,
  };

  const mockConfigService = {
    get: () => mockConfig,
  } as JiraConfigService;

  let client: JiraHttpClient;

  beforeEach(() => {
    client = new JiraHttpClient(mockConfigService);
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  it("downloads binary content from allowed Jira host", async () => {
    const payload = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    mockFetch.mockResolvedValue(
      createBinaryResponse(payload, { contentLength: String(payload.byteLength) }),
    );

    const result = await client.downloadBinary(ALLOWED_CONTENT_URL, 1024);

    expect(result.byteLength).toBe(4);
    expect(new Uint8Array(result)).toEqual(payload);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      ALLOWED_CONTENT_URL,
      expect.objectContaining({
        method: "GET",
        redirect: "manual",
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
        }),
      }),
    );
  });

  it("throws AttachmentTooLargeError when Content-Length exceeds maxBytes", async () => {
    const payload = new Uint8Array([1, 2, 3]);
    const response = createBinaryResponse(payload, { contentLength: "999" });
    mockFetch.mockResolvedValue(response);

    await expect(client.downloadBinary(ALLOWED_CONTENT_URL, 10)).rejects.toThrow(
      AttachmentTooLargeError,
    );

    expect(response.arrayBuffer).not.toHaveBeenCalled();
  });

  it("rejects forbidden host before fetch", async () => {
    const forbiddenUrl =
      "https://evil.example.com/rest/api/3/attachment/content/10042";

    await expect(client.downloadBinary(forbiddenUrl, 1024)).rejects.toThrow(
      JiraApiError,
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects redirect to forbidden host without second fetch", async () => {
    mockFetch.mockResolvedValue(
      createRedirectResponse("https://evil.example.com/attachment/content/10042"),
    );

    await expect(client.downloadBinary(ALLOWED_CONTENT_URL, 1024)).rejects.toThrow(
      JiraApiError,
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("throws AttachmentTooLargeError when streaming body exceeds maxBytes without Content-Length", async () => {
    const largeChunk = new Uint8Array(20);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(largeChunk);
          controller.close();
        },
      }),
      arrayBuffer: mock(() => Promise.resolve(largeChunk.buffer)),
    });

    await expect(client.downloadBinary(ALLOWED_CONTENT_URL, 10)).rejects.toThrow(
      AttachmentTooLargeError,
    );
  });

  it("rejects private IP host before fetch", async () => {
    const privateUrl = "https://127.0.0.1/attachment/content/1";

    await expect(client.downloadBinary(privateUrl, 1024)).rejects.toThrow(
      JiraApiError,
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects non-HTTPS URLs before fetch", async () => {
    const httpUrl =
      "http://example.atlassian.net/rest/api/3/attachment/content/10042";

    await expect(client.downloadBinary(httpUrl, 1024)).rejects.toThrow(JiraApiError);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it(`follows exactly ${MAX_REDIRECTS} redirects then returns binary body`, async () => {
    const payload = new Uint8Array([0x01, 0x02]);
    const finalUrl = allowedRedirectUrl(`hop-${MAX_REDIRECTS}`);

    for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
      mockFetch.mockResolvedValueOnce(
        createRedirectResponse(allowedRedirectUrl(`hop-${hop + 1}`)),
      );
    }
    mockFetch.mockResolvedValueOnce(
      createBinaryResponse(payload, { contentLength: String(payload.byteLength) }),
    );

    const result = await client.downloadBinary(ALLOWED_CONTENT_URL, 1024);

    expect(result.byteLength).toBe(2);
    expect(mockFetch).toHaveBeenCalledTimes(MAX_REDIRECTS + 1);
    expect(mockFetch).toHaveBeenLastCalledWith(
      finalUrl,
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it(`throws when redirect chain exceeds ${MAX_REDIRECTS} hops`, async () => {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      mockFetch.mockResolvedValueOnce(
        createRedirectResponse(allowedRedirectUrl(`too-many-${hop + 1}`)),
      );
    }

    await expect(client.downloadBinary(ALLOWED_CONTENT_URL, 1024)).rejects.toThrow(
      /Too many redirects/,
    );

    expect(mockFetch).toHaveBeenCalledTimes(MAX_REDIRECTS + 1);
  });
});
