/**
 * URL Builder Utility for JIRA API
 *
 * Handles URL construction with proper slash handling and query parameters
 */

import type {
  JiraQueryParamValue,
  JiraRestApiFamily,
} from "../jira.http.types";

/**
 * Utility class for building JIRA API URLs
 */
export class JiraUrlBuilder {
  private readonly baseUrl: string;
  private readonly agileBaseUrl: string;

  /**
   * Create a new URL builder with the base URL
   *
   * @param hostUrl - The JIRA host URL
   */
  constructor(hostUrl: string) {
    const normalizedHostUrl = this.normalizeHostUrl(hostUrl);
    this.baseUrl = `${normalizedHostUrl}rest/api/3`;
    this.agileBaseUrl = `${normalizedHostUrl}rest/agile/1.0`;
  }

  /**
   * Build a complete URL for an API endpoint
   *
   * @param endpoint - The API endpoint path
   * @param queryParams - Optional query parameters
   * @param jiraApi - REST API family (`platform` or `agile`)
   * @returns The complete URL
   */
  public buildUrl(
    endpoint: string,
    queryParams?: Record<string, JiraQueryParamValue>,
    jiraApi: JiraRestApiFamily = "platform",
  ): string {
    const url = this.buildEndpointUrl(endpoint, jiraApi);
    return this.appendQueryParams(url, queryParams);
  }

  /**
   * Get the base URL
   *
   * @returns The base URL
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get the Agile REST API base URL (`/rest/agile/1.0`), without trailing slash.
   */
  public getAgileBaseUrl(): string {
    return this.agileBaseUrl;
  }

  /**
   * Normalize host URL to ensure proper trailing slash
   *
   * @param hostUrl - The host URL to normalize
   * @returns Normalized host URL with trailing slash
   */
  private normalizeHostUrl(hostUrl: string): string {
    return hostUrl.endsWith("/") ? hostUrl : `${hostUrl}/`;
  }

  /**
   * Build URL for a specific endpoint
   *
   * @param endpoint - The API endpoint
   * @param jiraApi - REST API family
   * @returns URL with endpoint appended
   */
  private buildEndpointUrl(
    endpoint: string,
    jiraApi: JiraRestApiFamily,
  ): string {
    const cleanEndpoint = this.normalizeEndpoint(endpoint);
    const rawBase = jiraApi === "agile" ? this.agileBaseUrl : this.baseUrl;
    const cleanBaseUrl = this.stripTrailingSlash(rawBase);
    return `${cleanBaseUrl}/${cleanEndpoint}`;
  }

  /**
   * Normalize endpoint to remove leading slashes
   *
   * @param endpoint - The endpoint to normalize
   * @returns Normalized endpoint without leading slashes
   */
  private normalizeEndpoint(endpoint: string): string {
    return endpoint.replace(/^\/+/, "");
  }

  /**
   * Normalize base URL to remove trailing slash
   *
   * @returns Base URL without trailing slash
   */
  private stripTrailingSlash(url: string): string {
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }

  /**
   * Append query parameters to URL
   *
   * @param url - The base URL
   * @param queryParams - Query parameters to append
   * @returns URL with query parameters
   */
  private appendQueryParams(
    url: string,
    queryParams?: Record<string, JiraQueryParamValue>,
  ): string {
    if (!queryParams || Object.keys(queryParams).length === 0) {
      return url;
    }

    const params = this.buildQueryParams(queryParams);
    const paramString = params.toString();

    return paramString ? `${url}?${paramString}` : url;
  }

  /**
   * Build URLSearchParams from query parameters object
   *
   * @param queryParams - Query parameters object
   * @returns URLSearchParams instance
   */
  private buildQueryParams(
    queryParams: Record<string, JiraQueryParamValue>,
  ): URLSearchParams {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    }

    return params;
  }
}
