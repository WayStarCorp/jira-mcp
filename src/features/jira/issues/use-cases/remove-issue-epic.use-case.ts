import type { EpicRelationActionResult } from "../models/epic-relation-action.models";
import type { IssueRepository } from "../repositories/issue.repository";
import type { RemoveIssueEpicParams } from "../validators/epic.validator";
import type { EpicRelationResolver } from "./epic-relation-resolver";
import type { UpdateIssueUseCase } from "./update-issue.use-case";

export interface RemoveIssueEpicUseCase {
  execute(params: RemoveIssueEpicParams): Promise<EpicRelationActionResult>;
}

export class RemoveIssueEpicUseCaseImpl implements RemoveIssueEpicUseCase {
  constructor(
    private readonly updateIssueUseCase: UpdateIssueUseCase,
    private readonly issueRepository: IssueRepository,
    private readonly epicResolver: EpicRelationResolver,
  ) {}

  async execute(
    params: RemoveIssueEpicParams,
  ): Promise<EpicRelationActionResult> {
    const removal = await this.buildRemovalFields(params);

    await this.updateIssueUseCase.execute({
      issueKey: params.issueKey,
      fields: removal.fields,
      notifyUsers: params.notifyUsers,
    });

    const result: EpicRelationActionResult = {
      issueKey: params.issueKey,
      mode: removal.resolved.mode,
      action: "remove",
    };
    if (removal.resolved.mode === "epicLink") {
      result.epicLinkFieldId = removal.resolved.epicLinkFieldId;
    }
    return result;
  }

  private async buildRemovalFields(params: RemoveIssueEpicParams): Promise<{
    fields: Record<string, unknown>;
    resolved:
      | { mode: "parent" }
      | { mode: "epicLink"; epicLinkFieldId: string };
  }> {
    if (params.relationMode === "parent") {
      return this.buildParentRemovalFields(params.issueKey);
    }

    if (params.relationMode === "epicLink") {
      return this.buildEpicLinkRemovalFields(params);
    }

    const issue = await this.issueRepository.getIssue(params.issueKey, [
      "parent",
    ]);
    const parentKey = issue.fields?.parent?.key;

    if (parentKey) {
      const epicFieldId =
        params.epicFieldId ??
        (await this.epicResolver.tryOptionalSingleEpicLinkFieldFromEditMeta(
          params.issueKey,
        ));

      if (epicFieldId) {
        const issueWithEpicLink = await this.issueRepository.getIssue(
          params.issueKey,
          ["parent", epicFieldId],
        );
        const epicLinkValue = issueWithEpicLink.fields?.[epicFieldId];
        if (epicLinkValue != null && epicLinkValue !== "") {
          throw new Error(
            `Issue '${params.issueKey}' has both parent and Epic Link data available. Use relationMode 'parent' or 'epicLink' with epicFieldId to disambiguate.`,
          );
        }
      }

      return { fields: { parent: null }, resolved: { mode: "parent" } };
    }

    return this.buildEpicLinkRemovalFields(params);
  }

  private async buildParentRemovalFields(issueKey: string): Promise<{
    fields: Record<string, unknown>;
    resolved: { mode: "parent" };
  }> {
    const issue = await this.issueRepository.getIssue(issueKey, ["parent"]);
    const parentKey = issue.fields?.parent?.key;
    if (!parentKey) {
      throw new Error(
        `Issue '${issueKey}' has no parent relation to remove. Use relationMode 'epicLink' if this issue uses Classic Epic Link.`,
      );
    }

    return { fields: { parent: null }, resolved: { mode: "parent" } };
  }

  private async buildEpicLinkRemovalFields(
    params: RemoveIssueEpicParams,
  ): Promise<{
    fields: Record<string, unknown>;
    resolved: { mode: "epicLink"; epicLinkFieldId: string };
  }> {
    const resolved = await this.epicResolver.resolve({
      childIssueKey: params.issueKey,
      mode: "epicLink",
      epicFieldId: params.epicFieldId,
    });

    const fieldId = resolved.epicLinkFieldId;
    if (!fieldId) {
      throw new Error(
        "Epic relation resolved as epicLink but epicLinkFieldId is missing.",
      );
    }

    const issue = await this.issueRepository.getIssue(params.issueKey, [
      "parent",
      fieldId,
    ]);
    const epicLinkValue = issue.fields?.[fieldId];
    if (epicLinkValue == null || epicLinkValue === "") {
      throw new Error(
        `Issue '${params.issueKey}' does not currently have Epic Link set in '${fieldId}'.`,
      );
    }

    return {
      fields: { [fieldId]: null },
      resolved: { mode: "epicLink", epicLinkFieldId: fieldId },
    };
  }
}
