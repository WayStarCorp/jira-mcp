import { ValidationError } from "@core/errors";

/**
 * Error thrown when issue link validation fails
 */
export class IssueLinkValidationError extends ValidationError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = "IssueLinkValidationError";
  }
}
