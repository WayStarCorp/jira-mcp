/**
 * JIRA Client Error Exports
 *
 * Provides all error types for the JIRA client
 */

// Base error types
import { JiraApiError } from "./base.error";
export {
  JiraConfigError,
  JiraErrorCode,
  type JiraErrorResponse,
} from "./base.error";
export { JiraApiError };

// HTTP errors
export {
  JiraBadRequestError,
  JiraNetworkError,
  JiraNotFoundError,
  JiraPermissionError,
  JiraRateLimitError,
  JiraServerError,
} from "./http.error";

// Authentication errors
export { JiraAuthenticationError } from "./auth.error";

// For backward compatibility, we re-export all validator errors
export {
  ChangeIssueTypeParamsValidationError,
  CommentIdValidationError,
  CommentParamsValidationError,
  IssueCreateParamsValidationError,
  IssueCreationError,
  IssueTransitionValidationError,
  IssueTypeValidationError,
  IssueUpdateParamsValidationError,
  WorklogIdValidationError,
  WorklogParamsValidationError,
  WorklogTimeFormatValidationError,
} from "@features/jira/issues/validators/errors";

export {
  BoardIdValidationError,
  BoardParamsValidationError,
} from "@features/jira/boards/validators/errors";

export { ProjectValidationError } from "@features/jira/projects/validators/errors";

export {
  SprintIdValidationError,
  SprintParamsValidationError,
} from "@features/jira/sprints/validators/errors";

/**
 * Determines if an error is a JIRA error
 *
 * @param error - Error to check
 * @returns True if error is a JIRA error
 */
export function isJiraError(error: unknown): boolean {
  return error instanceof JiraApiError;
}

/**
 * Formats an error for display
 *
 * @param error - Error to format
 * @returns Formatted error message
 */
export function formatJiraError(error: unknown): string {
  // Handle HttpError-derived classes with statusCode
  if (
    error instanceof JiraApiError &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return `JIRA API Error (${error.statusCode}): ${error.message}`;
  }

  // Handle base JiraApiError
  if (error instanceof JiraApiError) {
    return `${error.name}: ${error.message}`;
  }

  // Handle generic errors
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  // Handle unknown values
  return `Unknown error: ${String(error)}`;
}
