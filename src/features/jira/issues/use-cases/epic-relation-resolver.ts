import type { IssueEditMetaField } from "../models/custom-field.models";
import type { IssueCustomFieldRepository } from "../repositories/issue-custom-field.repository";

export type EpicRelationMode = "auto" | "parent" | "epicLink";

export interface ResolvedEpicRelation {
  mode: "parent" | "epicLink";
  /** Jira custom field id when mode is epicLink */
  epicLinkFieldId?: string;
  reason: string;
}

/**
 * Resolves how to link a child issue to an epic: REST `fields.parent` vs Classic Epic Link custom field.
 * Uses edit metadata only (no hardcoded customfield ids).
 */
export class EpicRelationResolver {
  constructor(
    private readonly customFieldRepository: Pick<
      IssueCustomFieldRepository,
      "getIssueEditMetaFields"
    >,
  ) {}

  /**
   * Best-effort: if editmeta has exactly one Epic Link-like field, return its id.
   * Used when listing classic epic children from the epic issue key (resolve() may pick parent-only).
   */
  async tryOptionalSingleEpicLinkFieldFromEditMeta(
    issueKey: string,
  ): Promise<string | undefined> {
    const meta =
      await this.customFieldRepository.getIssueEditMetaFields(issueKey);
    const candidates = this.findEpicLinkCandidates(meta);
    if (candidates.length === 1) {
      return candidates[0].fieldId;
    }
    return undefined;
  }

  async resolve(params: {
    childIssueKey: string;
    mode: EpicRelationMode;
    epicFieldId?: string;
  }): Promise<ResolvedEpicRelation> {
    const { childIssueKey, mode, epicFieldId } = params;
    const meta =
      await this.customFieldRepository.getIssueEditMetaFields(childIssueKey);

    if (mode === "parent") {
      if (!this.isParentEditable(meta)) {
        throw new Error(
          `Field 'parent' is not editable for issue '${childIssueKey}'. Use relationMode 'epicLink' or pass epicFieldId (customfield_*). This resolver reads issue edit metadata only—if Classic Epic Link is missing from editmeta, add it to the issue type edit screen or pass epicFieldId.`,
        );
      }
      return {
        mode: "parent",
        reason: "editmeta allows parent",
      };
    }

    if (mode === "epicLink") {
      const fieldId = this.resolveEpicLinkFieldId(
        meta,
        epicFieldId,
        childIssueKey,
      );
      return {
        mode: "epicLink",
        epicLinkFieldId: fieldId,
        reason: epicFieldId
          ? "explicit epicFieldId"
          : "inferred single Epic Link field from editmeta",
      };
    }

    // auto
    if (epicFieldId) {
      const fieldId = this.resolveEpicLinkFieldId(
        meta,
        epicFieldId,
        childIssueKey,
      );
      return {
        mode: "epicLink",
        epicLinkFieldId: fieldId,
        reason: "auto: epicFieldId provided",
      };
    }

    if (this.isParentEditable(meta)) {
      return {
        mode: "parent",
        reason: "auto: parent editable in editmeta",
      };
    }

    const fieldId = this.epicLinkFieldIdFromCandidatesOrThrow(
      meta,
      childIssueKey,
      `Could not auto-detect epic relation for '${childIssueKey}': parent not editable and no Epic Link-like field in issue edit metadata. Pass epicFieldId (customfield_*) or add Epic Link to the edit screen so editmeta includes it.`,
      "Pass epicFieldId to disambiguate.",
    );
    return {
      mode: "epicLink",
      epicLinkFieldId: fieldId,
      reason: "auto: single Epic Link-like custom field in editmeta",
    };
  }

  /**
   * Picks the single Epic Link custom field when exactly one candidate exists; otherwise throws
   * with caller-provided empty / ambiguous messages (wording differs for auto vs explicit epicLink).
   */
  private epicLinkFieldIdFromCandidatesOrThrow(
    meta: Record<string, IssueEditMetaField>,
    childIssueKey: string,
    emptyError: string,
    multiErrorSuffix: string,
  ): string {
    const candidates = this.findEpicLinkCandidates(meta);
    if (candidates.length === 1) {
      return candidates[0].fieldId;
    }
    if (candidates.length === 0) {
      throw new Error(emptyError);
    }
    const names = candidates.map((c) => `${c.name} (${c.fieldId})`).join(", ");
    throw new Error(
      `Multiple Epic Link candidates for '${childIssueKey}': ${names}. ${multiErrorSuffix}`,
    );
  }

  private isParentEditable(meta: Record<string, IssueEditMetaField>): boolean {
    const { parent } = meta;
    if (!parent) return false;
    const { operations } = parent;
    const ops = operations ?? [];
    return ops.some((o) => o === "set" || o === "edit");
  }

  private resolveEpicLinkFieldId(
    meta: Record<string, IssueEditMetaField>,
    epicFieldId: string | undefined,
    childIssueKey: string,
  ): string {
    if (!epicFieldId) {
      return this.epicLinkFieldIdFromCandidatesOrThrow(
        meta,
        childIssueKey,
        `No Epic Link field found in issue edit metadata for '${childIssueKey}'. Pass epicFieldId (customfield_*) or add Epic Link to the issue type edit screen so editmeta exposes it.`,
        "Pass epicFieldId.",
      );
    }

    if (
      epicFieldId === "__proto__" ||
      epicFieldId === "constructor" ||
      epicFieldId === "prototype"
    ) {
      throw new Error("Invalid epicFieldId");
    }
    if (!epicFieldId.startsWith("customfield_")) {
      throw new Error(
        `epicFieldId must be a Jira custom field id (customfield_*). Got: ${epicFieldId}`,
      );
    }
    const field = meta[epicFieldId];
    if (!field) {
      throw new Error(
        `Field '${epicFieldId}' is not present in issue '${childIssueKey}' edit metadata (not on the edit screen for this issue or wrong id).`,
      );
    }
    const ops = field.operations ?? [];
    if (!ops.some((o) => o === "set" || o === "edit")) {
      throw new Error(
        `Field '${epicFieldId}' is not editable for '${childIssueKey}'.`,
      );
    }
    return epicFieldId;
  }

  private findEpicLinkCandidates(
    meta: Record<string, IssueEditMetaField>,
  ): Array<{ fieldId: string; name: string }> {
    const candidates: Array<{ fieldId: string; name: string }> = [];
    const seen = new Set<string>();

    for (const [fieldId, field] of Object.entries(meta)) {
      const candidate = this.toEpicLinkCandidate(fieldId, field);
      if (!candidate || seen.has(candidate.fieldId)) {
        continue;
      }
      seen.add(candidate.fieldId);
      candidates.push(candidate);
    }
    return candidates;
  }

  private toEpicLinkCandidate(
    fieldId: string,
    field: IssueEditMetaField,
  ): { fieldId: string; name: string } | null {
    if (!this.isCustomFieldEntry(fieldId, field)) {
      return null;
    }
    if (!this.isFieldEditable(field)) {
      return null;
    }
    if (!this.isEpicLinkMarker(field)) {
      return null;
    }

    return {
      fieldId,
      name: field.name ?? fieldId,
    };
  }

  private isEpicLinkMarker(field: IssueEditMetaField): boolean {
    const schemaCustom = (field.schema?.custom ?? "").toLowerCase();
    const isGreenhopperEpic =
      schemaCustom.includes("gh-epic-link") ||
      (schemaCustom.includes("greenhopper") && schemaCustom.includes("epic"));
    const nameLower = (field.name ?? "").toLowerCase();
    const keyLower = (field.key ?? "").toLowerCase();
    const isEpicLinkName =
      nameLower.includes("epic link") ||
      keyLower.includes("epiclink") ||
      keyLower === "epic-link";

    return isGreenhopperEpic || isEpicLinkName;
  }

  private isCustomFieldEntry(
    fieldId: string,
    field: IssueEditMetaField,
  ): boolean {
    return fieldId.startsWith("customfield_") || field.custom === true;
  }

  private isFieldEditable(field: IssueEditMetaField): boolean {
    const ops = field.operations ?? [];
    return ops.some((o) => o === "set" || o === "edit");
  }
}
