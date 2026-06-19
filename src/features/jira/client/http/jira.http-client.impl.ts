import { AttachmentTooLargeError, NetworkErrorClassifier } from "@core/errors";
/**
 * JIRA HTTP Client Implementation
 *
 * Low-level HTTP client for JIRA API requests
 */
import { logger } from "@core/logging";
import type { JiraConfigService } from "../config/jira-config.service";
import {
  JiraApiError,
  JiraAuthenticationError,
  JiraNetworkError,
} from "../errors";
import { AttachmentUrlValidator } from "./attachment-url.validator";
import { JiraHttpErrorHandler } from "./jira-http-error.handler";
import type { HttpClient, HttpRequestOptions } from "./jira.http.types";
import {
  JiraRequestBuilder,
  JiraResponseHandler,
  JiraUrlBuilder,
} from "./utils";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * HTTP client implementation for JIRA API
 */
export class JiraHttpClient implements HttpClient {
  private readonly config: ReturnType<JiraConfigService["get"]>;
  private readonly urlBuilder: JiraUrlBuilder;
  private readonly requestBuilder: JiraRequestBuilder;
  private readonly responseHandler: JiraResponseHandler;
  private readonly errorHandler: JiraHttpErrorHandler;
  private readonly networkClassifier: NetworkErrorClassifier;
  private readonly attachmentUrlValidator: AttachmentUrlValidator;

  /**
   * Create a new JIRA HTTP client with validated configuration
   *
   * @param jiraConfig - Validated JIRA configuration object
   */
  constructor(jiraConfig: JiraConfigService) {
    // Get the validated configuration
    this.config = jiraConfig.get();

    // Initialize utility classes
    this.urlBuilder = new JiraUrlBuilder(this.config.hostUrl);
    this.requestBuilder = new JiraRequestBuilder({
      username: this.config.username,
      apiToken: this.config.apiToken,
    });
    this.responseHandler = new JiraResponseHandler();

    // Initialize error handling dependencies
    this.errorHandler = new JiraHttpErrorHandler();
    this.networkClassifier = new NetworkErrorClassifier("JIRA:HTTP");
    this.attachmentUrlValidator = new AttachmentUrlValidator(
      this.config.hostUrl,
    );
  }

  /**
   * Send a request to the JIRA API
   *
   * @param options - Request options
   * @returns Promise resolving to the response data
   * @throws ApiError if the request fails
   */
  public async sendRequest<T>(options: HttpRequestOptions): Promise<T> {
    const {
      endpoint,
      method,
      queryParams,
      body,
      headers = {},
      jiraApi = "platform",
    } = options;
    const url = this.urlBuilder.buildUrl(endpoint, queryParams, jiraApi);

    try {
      // Set up request parameters
      const requestParams = this.requestBuilder.createRequestParams(
        method,
        headers,
        body,
      );

      // Make the request
      logger.debug(`${method} ${url}`, { prefix: "JIRA:HTTP" });
      const response = await fetch(url, requestParams);

      // Handle HTTP errors
      if (!response.ok) {
        await this.errorHandler.handleErrorResponse(response);
      }

      // Parse and return the response
      return await this.responseHandler.processResponse<T>(response);
    } catch (error) {
      // Re-throw API errors
      if (
        error instanceof JiraApiError ||
        error instanceof JiraAuthenticationError
      ) {
        throw error;
      }

      // Handle network errors with JIRA-specific error type
      this.networkClassifier.classifyAndThrowNetworkError(
        error,
        JiraNetworkError,
      );
    }
  }

  /**
   * Download binary attachment content from an absolute HTTPS URL on JIRA_HOST.
   */
  public async downloadBinary(
    url: string,
    maxBytes: number,
  ): Promise<ArrayBuffer> {
    const { maxRedirects } = this.attachmentUrlValidator;
    let currentUrl = this.attachmentUrlValidator.assertAllowedUrl(url);
    const requestInit = {
      ...this.requestBuilder.createRequestParams("GET"),
      redirect: "manual" as RequestRedirect,
    };

    try {
      let redirectsFollowed = 0;

      // Initial request plus up to maxRedirects hops (maxRedirects + 1 fetches total).
      for (let attempt = 0; attempt < maxRedirects + 1; attempt++) {
        logger.debug(`GET ${currentUrl.pathname}`, { prefix: "JIRA:HTTP" });
        const response = await fetch(currentUrl.href, requestInit);

        if (REDIRECT_STATUSES.has(response.status)) {
          const location = response.headers.get("Location");
          if (!location) {
            throw new JiraApiError(
              `Redirect response missing Location header (HTTP ${response.status})`,
            );
          }
          if (redirectsFollowed >= maxRedirects) {
            throw new JiraApiError(
              "Too many redirects while downloading attachment",
            );
          }
          redirectsFollowed++;
          currentUrl = this.attachmentUrlValidator.assertRedirectTarget(
            currentUrl,
            location,
          );
          continue;
        }

        if (!response.ok) {
          await this.errorHandler.handleErrorResponse(response);
        }

        this.assertContentLengthWithinLimit(response, maxBytes);
        return await this.readBodyWithinLimit(response, maxBytes);
      }

      throw new JiraApiError("Too many redirects while downloading attachment");
    } catch (error) {
      if (
        error instanceof JiraApiError ||
        error instanceof JiraAuthenticationError ||
        error instanceof AttachmentTooLargeError
      ) {
        throw error;
      }

      this.networkClassifier.classifyAndThrowNetworkError(
        error,
        JiraNetworkError,
      );
    }
  }

  private assertContentLengthWithinLimit(
    response: Response,
    maxBytes: number,
  ): void {
    const contentLengthHeader = response.headers.get("Content-Length");
    if (contentLengthHeader === null) {
      return;
    }

    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (Number.isNaN(contentLength)) {
      return;
    }

    if (contentLength > maxBytes) {
      throw new AttachmentTooLargeError(maxBytes);
    }
  }

  private async readBodyWithinLimit(
    response: Response,
    maxBytes: number,
  ): Promise<ArrayBuffer> {
    const { body } = response;
    if (!body) {
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > maxBytes) {
        throw new AttachmentTooLargeError(maxBytes);
      }
      return buffer;
    }

    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          throw new AttachmentTooLargeError(maxBytes);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const result = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return result.buffer;
  }

  /**
   * Get the base URL for testing purposes
   *
   * @returns The base URL
   */
  public getBaseUrl(): string {
    return this.urlBuilder.getBaseUrl();
  }
}
