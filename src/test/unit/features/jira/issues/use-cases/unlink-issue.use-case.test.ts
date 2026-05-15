import { beforeEach, describe, expect, mock, test } from "bun:test";
import { UnlinkIssueUseCaseImpl } from "@features/jira/issues/use-cases/unlink-issue.use-case";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("UnlinkIssueUseCase", () => {
  let deleteIssueLink: ReturnType<typeof mock>;
  let useCase: UnlinkIssueUseCaseImpl;

  beforeEach(() => {
    deleteIssueLink = mock(() => Promise.resolve());
    useCase = new UnlinkIssueUseCaseImpl({
      deleteIssueLink,
    } as never);
  });

  test("calls repository deleteIssueLink with linkId", async () => {
    await useCase.execute({ linkId: "12345" });
    expect(deleteIssueLink).toHaveBeenCalledWith("12345");
  });
});
