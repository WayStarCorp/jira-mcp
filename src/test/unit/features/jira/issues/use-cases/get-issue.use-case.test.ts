import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { IssueRepository } from "@features/jira/issues/repositories/issue.repository";
import { GetIssueUseCaseImpl } from "@features/jira/issues/use-cases/get-issue.use-case";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("GetIssueUseCaseImpl", () => {
  let getIssueMock: ReturnType<typeof mock>;
  let useCase: GetIssueUseCaseImpl;

  beforeEach(() => {
    getIssueMock = mock(() =>
      Promise.resolve({
        id: "1",
        key: "PROJ-1",
        self: null,
        fields: {},
      }),
    );
    useCase = new GetIssueUseCaseImpl({
      getIssue: getIssueMock,
    } as unknown as IssueRepository);
  });

  test("passes undefined fields when fields omitted", async () => {
    await useCase.execute({ issueKey: "PROJ-1" });

    expect(getIssueMock).toHaveBeenCalledWith("PROJ-1", undefined);
  });

  test("passes explicit fields when provided", async () => {
    const fields = ["summary", "status"];
    await useCase.execute({ issueKey: "PROJ-1", fields });

    expect(getIssueMock).toHaveBeenCalledWith("PROJ-1", fields);
  });
});
