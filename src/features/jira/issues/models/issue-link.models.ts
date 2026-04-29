/**
 * Issue link domain models
 */

/**
 * Issue Link Type — represents a Jira issue link type.
 */
export interface IssueLinkType {
  id: string;
  name: string;
  inward: string;
  outward: string;
  self?: string;
}

/**
 * Response from GET /rest/api/3/issueLinkType
 */
export interface IssueLinkTypesResponse {
  issueLinkTypes: IssueLinkType[];
}

/**
 * DTO for creating an issue link.
 */
export interface LinkIssuesRequest {
  inwardIssueKey: string;
  outwardIssueKey: string;
  linkTypeName: string;
  comment?: string;
}
