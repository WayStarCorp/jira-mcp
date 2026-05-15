import type { EpicRelationActionResult } from "../models/epic-relation-action.models";
import type { IssueRepository } from "../repositories/issue.repository";
import type { SetIssueEpicParams } from "../validators/epic.validator";
import type { EpicRelationResolver } from "./epic-relation-resolver";
import type { UpdateIssueUseCase } from "./update-issue.use-case";

export interface SetIssueEpicUseCase {
  execute(params: SetIssueEpicParams): Promise<EpicRelationActionResult>;
}

export class SetIssueEpicUseCaseImpl implements SetIssueEpicUseCase {
  constructor(
    private readonly updateIssueUseCase: UpdateIssueUseCase,
    private readonly issueRepository: IssueRepository,
    private readonly epicResolver: EpicRelationResolver,
  ) {}

  async execute(params: SetIssueEpicParams): Promise<EpicRelationActionResult> {
    if (params.validateEpicType) {
      const epic = await this.issueRepository.getIssue(params.epicIssueKey, [
        "issuetype",
      ]);
      const epicName = epic.fields?.issuetype?.name ?? "";
      const expected = params.epicIssuetypeName ?? "Epic";
      if (epicName.toLowerCase() !== expected.toLowerCase()) {
        throw new Error(
          `Issue '${params.epicIssueKey}' does not match issuetype '${expected}' (got '${epicName || "unknown"}'). Set validateEpicType=false or set epicIssuetypeName to your Jira Epic type label.`,
        );
      }
    }

    const resolved = await this.epicResolver.resolve({
      childIssueKey: params.issueKey,
      mode: params.relationMode,
      epicFieldId: params.epicFieldId,
    });

    const fields = this.epicResolvedToUpdateFields(resolved, params.epicIssueKey);

    await this.updateIssueUseCase.execute({
      issueKey: params.issueKey,
      fields,
      notifyUsers: params.notifyUsers,
    });

    return {
      issueKey: params.issueKey,
      epicIssueKey: params.epicIssueKey,
      mode: resolved.mode,
      epicLinkFieldId: resolved.epicLinkFieldId,
      action: "set",
    };
  }

  private epicResolvedToUpdateFields(
    resolved:
      | { mode: "parent" }
      | { mode: "epicLink"; epicLinkFieldId?: string },
    epicIssueKey: string,
  ): Record<string, unknown> {
    switch (resolved.mode) {
      case "parent":
        return { parent: { key: epicIssueKey } };
      case "epicLink": {
        const fieldId = resolved.epicLinkFieldId;
        if (!fieldId) {
          throw new Error(
            "Epic relation resolved as epicLink but epicLinkFieldId is missing.",
          );
        }
        return { [fieldId]: epicIssueKey };
      }
      default: {
        const _exhaustive: never = resolved;
        throw new Error(`Unhandled epic relation mode: ${_exhaustive}`);
      }
    }
  }
}
