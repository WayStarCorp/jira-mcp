import { ValidationError } from "@core/errors";

/**
 * Thrown when custom field metadata tool input is invalid.
 */
export class CustomFieldMetadataParamsValidationError extends ValidationError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = "CustomFieldMetadataParamsValidationError";
  }
}
