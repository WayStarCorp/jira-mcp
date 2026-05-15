import type { Issue } from "../models/issue.models";
import type { IssueCustomFieldRepository } from "../repositories/issue-custom-field.repository";
import { ChangeIssueTypeParamsValidationError } from "../validators/errors";
import type { ChangeIssueTypeParams } from "../validators/epic.validator";
import type { ResolveCustomFieldsUseCase } from "./custom-field-metadata.use-case";
import type { UpdateIssueUseCase } from "./update-issue.use-case";

export type ChangeIssueTypeResult =
  | {
      kind: "validated";
      issueKey: string;
      issuetypeEditable: boolean;
      operations: string[];
    }
  | { kind: "updated"; issue: Issue };

export interface ChangeIssueTypeUseCase {
  execute(params: ChangeIssueTypeParams): Promise<ChangeIssueTypeResult>;
}

export class ChangeIssueTypeUseCaseImpl implements ChangeIssueTypeUseCase {
  constructor(
    private readonly updateIssueUseCase: UpdateIssueUseCase,
    private readonly issueCustomFieldRepository: IssueCustomFieldRepository,
    private readonly resolveCustomFieldsUseCase: ResolveCustomFieldsUseCase,
  ) {}

  async execute(params: ChangeIssueTypeParams): Promise<ChangeIssueTypeResult> {
    if (params.validateOnly) {
      const meta = await this.issueCustomFieldRepository.getIssueEditMetaFields(
        params.issueKey,
      );
      const it = meta.issuetype;
      const operations = it?.operations ?? [];
      const issuetypeEditable = operations.some(
        (o) => o === "set" || o === "edit",
      );
      return {
        kind: "validated",
        issueKey: params.issueKey,
        issuetypeEditable,
        operations,
      };
    }

    const hasName = Boolean(params.issueTypeName);
    const hasId = Boolean(params.issueTypeId);
    if (hasName === hasId) {
      throw new ChangeIssueTypeParamsValidationError(
        "Provide exactly one of issueTypeName or issueTypeId (not both, not neither), unless validateOnly is true.",
        { issueTypeNamePresent: hasName, issueTypeIdPresent: hasId },
      );
    }

    let resolvedCustom: Record<string, unknown> = {};
    if (params.customFields && Object.keys(params.customFields).length > 0) {
      resolvedCustom = await this.resolveCustomFieldsUseCase.execute({
        issueKey: params.issueKey,
        customFields: params.customFields,
      });
    }

    if (params.requiredFields && Object.keys(params.requiredFields).length > 0) {
      const overlappingKeys = Object.keys(resolvedCustom).filter((key) =>
        Object.prototype.hasOwnProperty.call(params.requiredFields, key),
      );

      if (overlappingKeys.length > 0) {
        throw new ChangeIssueTypeParamsValidationError(
          `Conflicting field definitions for keys: ${overlappingKeys.join(", ")}. Specify each field in either requiredFields or customFields, not both.`,
          { overlappingKeys },
        );
      }
    }

    const issuetype = params.issueTypeName
      ? { name: params.issueTypeName }
      : { id: params.issueTypeId };
    const fields: Record<string, unknown> = params.requiredFields
      ? { ...params.requiredFields, ...resolvedCustom, issuetype }
      : { ...resolvedCustom, issuetype };

    const issue = await this.updateIssueUseCase.execute({
      issueKey: params.issueKey,
      fields,
      notifyUsers: params.notifyUsers,
    });

    return { kind: "updated", issue };
  }
}
