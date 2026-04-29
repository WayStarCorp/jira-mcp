/**
 * JIRA HTTP Client Interfaces
 *
 * Contains interfaces for HTTP operations in the JIRA API
 */

/**
 * Which JIRA REST API prefix to use (same host, different paths).
 * - `platform` → `/rest/api/3` (issues, search, projects, …)
 * - `agile` → `/rest/agile/1.0` (boards, sprints, backlog operations)
 */
export type JiraRestApiFamily = "platform" | "agile";

/**
 * Scalar values allowed in JIRA URL query maps (`undefined` entries are omitted when serializing).
 */
export type JiraQueryParamValue = string | number | boolean | undefined;

/**
 * Options for HTTP requests to the JIRA API
 */
export interface HttpRequestOptions {
  /**
   * API endpoint path (relative to base URL)
   */
  endpoint: string;

  /**
   * HTTP method
   */
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

  /**
   * Optional query parameters
   */
  queryParams?: Record<string, JiraQueryParamValue>;

  /**
   * Optional request body
   */
  body?: unknown;

  /**
   * Optional request headers
   */
  headers?: Record<string, string>;

  /**
   * REST API family (defaults to JIRA platform `/rest/api/3`).
   */
  jiraApi?: JiraRestApiFamily;
}

/**
 * Generic HTTP client interface
 */
export interface HttpClient {
  /**
   * Send an HTTP request to the JIRA API
   * @param options - Request configuration
   * @returns Promise resolving to the response data
   */
  sendRequest<T>(options: HttpRequestOptions): Promise<T>;

  /**
   * Check if the client is configured properly
   * @returns true if the client is configured
   */
  isConfigured?(): boolean;
}
