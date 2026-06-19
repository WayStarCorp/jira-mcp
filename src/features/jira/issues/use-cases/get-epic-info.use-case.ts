import { logger } from "@core/logging";
import type { Issue } from "../models/issue.models";
import type { IssueRepository } from "../repositories/issue.repository";
import { escapeJqlQuotedLiteral } from "../utils/jql-escape";
import type { GetEpicInfoParams } from "../validators/epic.validator";
import type {
  EpicRelationMode,
  EpicRelationResolver,
  ResolvedEpicRelation,
} from "./epic-relation-resolver";
import type { SearchIssuesUseCase } from "./search-issues.use-case";

const EPIC_INFO_FIELDS = [
  "summary",
  "issuetype",
  "parent",
  "issuelinks",
  "status",
  "priority",
  "assignee",
  "project",
  "labels",
  "created",
  "updated",
] as const;

/** Shown when child issues were not queried via Epic Link JQL due to missing customfield_* id. */
export const EPIC_CHILDREN_SKIPPED_MISSING_EPIC_FIELD_ID =
  "Child issues via Epic Link were not listed: no single customfield_* Epic Link field id (pass epicFieldId or use jira_get_issue_custom_field_metadata).";

export interface EpicInfoResult {
  issue: Issue;
  resolvedRelation: ResolvedEpicRelation | null;
  resolveError: string | null;
  epicLinkValue: string | null;
  children: Issue[];
  /** Set when children were omitted or Epic Link search was skipped because Epic Link cf id could not be determined. */
  childrenNote: string | null;
  /**
   * True when epic children came only from `parent = epic` JQL (no Classic Epic Link query was merged into the list).
   */
  childrenListedFromParentOnly: boolean;
  /** Compared case-insensitively to `fields.issuetype.name` using param epicIssuetypeName (default Epic). */
  treatsAsEpic: boolean;
  epicIssuetypeNameCompared: string;
}

export interface GetEpicInfoUseCase {
  execute(params: GetEpicInfoParams): Promise<EpicInfoResult>;
}

export class GetEpicInfoUseCaseImpl implements GetEpicInfoUseCase {
  private readonly logger = logger;

  constructor(
    private readonly issueRepository: IssueRepository,
    private readonly searchIssuesUseCase: SearchIssuesUseCase,
    private readonly epicResolver: EpicRelationResolver,
  ) {}

  async execute(params: GetEpicInfoParams): Promise<EpicInfoResult> {
    this.logger.debug("Getting epic info", {
      prefix: "JIRA:GetEpicInfoUseCase",
      issueKey: params.issueKey,
    });

    let resolvedRelation: ResolvedEpicRelation | null = null;
    let resolveError: string | null = null;
    try {
      resolvedRelation = await this.epicResolver.resolve({
        childIssueKey: params.issueKey,
        mode: params.relationMode,
        epicFieldId: params.epicFieldId,
      });
    } catch (error) {
      resolveError = error instanceof Error ? error.message : String(error);
    }

    const fieldNames = this.buildIssueFieldNames(
      resolvedRelation,
      params.epicFieldId,
    );
    const issue = await this.issueRepository.getIssue(
      params.issueKey,
      fieldNames,
    );

    const epicLabel = params.epicIssuetypeName ?? "Epic";
    const treatsAsEpic = this.issueMatchesEpicLabel(
      issue.fields?.issuetype?.name,
      epicLabel,
    );

    const epicLinkValue = this.readEpicLinkValueFromIssue(
      issue.fields,
      params.epicFieldId,
      resolvedRelation,
    );

    const isEpic = treatsAsEpic;

    let effectiveEpicLinkFieldId =
      params.epicFieldId?.trim() || resolvedRelation?.epicLinkFieldId;

    if (
      params.includeChildren &&
      isEpic &&
      params.relationMode === "auto" &&
      effectiveEpicLinkFieldId === undefined
    ) {
      effectiveEpicLinkFieldId =
        await this.epicResolver.tryOptionalSingleEpicLinkFieldFromEditMeta(
          params.issueKey,
        );
    }

    let children: Issue[] = [];
    let childrenNote: string | null = null;
    let childrenListedFromParentOnly = false;
    if (params.includeChildren && isEpic) {
      const { issues, missingEpicFieldIdForChildren, listedFromParentOnly } =
        await this.fetchEpicChildren(
          params.issueKey,
          params.relationMode,
          params.maxChildren,
          effectiveEpicLinkFieldId,
        );
      children = issues;
      childrenListedFromParentOnly = listedFromParentOnly;
      if (missingEpicFieldIdForChildren) {
        childrenNote = EPIC_CHILDREN_SKIPPED_MISSING_EPIC_FIELD_ID;
      }
    }

    return {
      issue,
      resolvedRelation,
      resolveError,
      epicLinkValue,
      children,
      childrenNote,
      childrenListedFromParentOnly,
      treatsAsEpic,
      epicIssuetypeNameCompared: epicLabel,
    };
  }

  private buildIssueFieldNames(
    resolvedRelation: ResolvedEpicRelation | null,
    explicitEpicFieldId?: string,
  ): string[] {
    const names: string[] = [...EPIC_INFO_FIELDS];
    const fromResolved = resolvedRelation?.epicLinkFieldId;
    if (fromResolved && !names.includes(fromResolved)) {
      names.push(fromResolved);
    }
    const explicit = explicitEpicFieldId?.trim();
    if (explicit && !names.includes(explicit)) {
      names.push(explicit);
    }
    return names;
  }

  /** Prefer explicit epicFieldId, then Epic Link field from a successful epicLink resolve. */
  private readEpicLinkValueFromIssue(
    fields: Issue["fields"],
    explicitEpicFieldId: string | undefined,
    resolvedRelation: ResolvedEpicRelation | null,
  ): string | null {
    if (!fields) return null;
    const explicit = explicitEpicFieldId?.trim();
    const fieldId = explicit || resolvedRelation?.epicLinkFieldId;
    if (!fieldId) return null;
    const raw = fields[fieldId];
    return this.stringifyEpicLinkRaw(raw);
  }

  private issueMatchesEpicLabel(
    issuetypeName: string | null | undefined,
    expectedLabel: string,
  ): boolean {
    const a = (issuetypeName ?? "").trim().toLowerCase();
    const b = expectedLabel.trim().toLowerCase();
    return a.length > 0 && a === b;
  }

  private epicKeyForJql(epicKey: string): string {
    return escapeJqlQuotedLiteral(epicKey);
  }

  private searchChildrenByParent(
    epicKey: string,
    maxChildren: number,
    fields: string[],
  ): Promise<Issue[]> {
    const key = this.epicKeyForJql(epicKey);
    return this.searchIssuesUseCase.execute({
      jql: `parent = "${key}" ORDER BY updated DESC`,
      maxResults: maxChildren,
      fields,
    });
  }

  private stringifyEpicLinkRaw(raw: unknown): string | null {
    if (raw == null) return null;
    if (typeof raw === "string") return raw;
    if (typeof raw === "object" && raw !== null && "key" in raw) {
      const maybeKey = (raw as Record<string, unknown>).key;
      if (typeof maybeKey === "string") {
        return maybeKey;
      }
    }
    return JSON.stringify(raw);
  }

  private async fetchEpicChildren(
    epicKey: string,
    relationMode: EpicRelationMode,
    maxChildren: number,
    effectiveEpicLinkFieldId: string | undefined,
  ): Promise<{
    issues: Issue[];
    missingEpicFieldIdForChildren: boolean;
    listedFromParentOnly: boolean;
  }> {
    const searchFields = [
      "summary",
      "issuetype",
      "status",
      "priority",
      "updated",
    ];

    if (relationMode === "parent") {
      return {
        issues: await this.searchChildrenByParent(
          epicKey,
          maxChildren,
          searchFields,
        ),
        missingEpicFieldIdForChildren: false,
        listedFromParentOnly: true,
      };
    }

    if (relationMode === "epicLink") {
      if (!effectiveEpicLinkFieldId?.startsWith("customfield_")) {
        return {
          issues: [],
          missingEpicFieldIdForChildren: true,
          listedFromParentOnly: false,
        };
      }
      const cf = this.epicFieldIdToCfNumber(effectiveEpicLinkFieldId);
      const key = this.epicKeyForJql(epicKey);
      const issues = await this.searchIssuesUseCase.execute({
        jql: `cf[${cf}] = "${key}" ORDER BY updated DESC`,
        maxResults: maxChildren,
        fields: searchFields,
      });
      return {
        issues,
        missingEpicFieldIdForChildren: false,
        listedFromParentOnly: false,
      };
    }

    const byParent = await this.searchChildrenByParent(
      epicKey,
      maxChildren,
      searchFields,
    );

    if (effectiveEpicLinkFieldId?.startsWith("customfield_")) {
      const cf = this.epicFieldIdToCfNumber(effectiveEpicLinkFieldId);
      const key = this.epicKeyForJql(epicKey);
      const byEpicLink = await this.searchIssuesUseCase.execute({
        jql: `cf[${cf}] = "${key}" ORDER BY updated DESC`,
        maxResults: maxChildren,
        fields: searchFields,
      });
      const merged = this.dedupeChildIssuesByKeyPreferNewer([
        ...byParent,
        ...byEpicLink,
      ]);
      const sorted = [...merged];
      sorted.sort((x, y) => this.compareChildIssuesByUpdatedDesc(x, y));
      return {
        issues: sorted.slice(0, maxChildren),
        missingEpicFieldIdForChildren: false,
        listedFromParentOnly: false,
      };
    }

    return {
      issues: byParent,
      missingEpicFieldIdForChildren: true,
      listedFromParentOnly: true,
    };
  }

  /** Deduplicate by issue key; if the same key appears from parent + Epic Link queries, keep the row with a newer `fields.updated` when comparable. */
  private dedupeChildIssuesByKeyPreferNewer(issues: Issue[]): Issue[] {
    const map = new Map<string, Issue>();
    for (const issue of issues) {
      const k = issue.key;
      if (!k) continue;
      const prev = map.get(k);
      if (!prev) {
        map.set(k, issue);
        continue;
      }
      map.set(k, this.preferChildIssueByUpdated(prev, issue));
    }
    return [...map.values()];
  }

  private preferChildIssueByUpdated(a: Issue, b: Issue): Issue {
    const ua = a.fields?.updated;
    const ub = b.fields?.updated;
    if (typeof ua === "string" && typeof ub === "string") {
      if (ua > ub) return a;
      if (ub > ua) return b;
      return a;
    }
    if (typeof ua === "string") return a;
    if (typeof ub === "string") return b;
    return a;
  }

  /** Sort key: newer `updated` first; issues without `updated` sink after keyed ones; then key. */
  private compareChildIssuesByUpdatedDesc(a: Issue, b: Issue): number {
    const ua = a.fields?.updated;
    const ub = b.fields?.updated;
    if (typeof ua === "string" && typeof ub === "string") {
      return ub.localeCompare(ua);
    }
    if (typeof ua === "string") return -1;
    if (typeof ub === "string") return 1;
    return (a.key ?? "").localeCompare(b.key ?? "");
  }

  private epicFieldIdToCfNumber(epicFieldId: string | undefined): string {
    if (!epicFieldId?.startsWith("customfield_")) {
      throw new Error(
        "epicFieldId must be customfield_* to list children via Epic Link (cf[JQL]).",
      );
    }
    const num = epicFieldId.replace("customfield_", "");
    if (!/^\d+$/.test(num)) {
      throw new Error(`Invalid epicFieldId: ${epicFieldId}`);
    }
    return num;
  }
}
