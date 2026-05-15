export interface EpicRelationActionResult {
  issueKey: string;
  epicIssueKey?: string;
  mode: "parent" | "epicLink";
  epicLinkFieldId?: string;
  action: "set" | "remove";
}
