import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { IssueLinkRepository } from "@features/jira/issues/repositories/issue-link.repository";
import {
  GetIssueLinkTypesUseCaseImpl,
  LinkIssuesUseCaseImpl,
} from "@features/jira/issues/use-cases/issue-link.use-case";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("GetIssueLinkTypesUseCaseImpl", () => {
  let useCase: GetIssueLinkTypesUseCaseImpl;
  let mockRepo: {
    getIssueLinkTypes: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    mockRepo = {
      getIssueLinkTypes: mock(),
    };

    useCase = new GetIssueLinkTypesUseCaseImpl(
      mockRepo as unknown as IssueLinkRepository,
    );
  });

  afterEach(() => {
    mock.restore();
  });

  it("returns link types from repository", async () => {
    const linkTypes = [
      {
        id: "10000",
        name: "Blocks",
        inward: "is blocked by",
        outward: "blocks",
      },
    ];

    mockRepo.getIssueLinkTypes.mockResolvedValue(linkTypes);

    const result = await useCase.execute();

    expect(result).toEqual(linkTypes);
    expect(mockRepo.getIssueLinkTypes).toHaveBeenCalledTimes(1);
  });
});

describe("LinkIssuesUseCaseImpl", () => {
  let useCase: LinkIssuesUseCaseImpl;
  let mockRepo: {
    getIssueLinkTypes: ReturnType<typeof mock>;
    linkIssues: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    mockRepo = {
      getIssueLinkTypes: mock(),
      linkIssues: mock(),
    };

    useCase = new LinkIssuesUseCaseImpl(
      mockRepo as unknown as IssueLinkRepository,
    );
  });

  afterEach(() => {
    mock.restore();
  });

  it("resolves linkTypeName case-insensitively", async () => {
    mockRepo.getIssueLinkTypes.mockResolvedValue([
      {
        id: "10000",
        name: "Blocks",
        inward: "is blocked by",
        outward: "blocks",
      },
    ]);
    mockRepo.linkIssues.mockResolvedValue(undefined);

    await useCase.execute({
      inwardIssueKey: "PROJ-200",
      outwardIssueKey: "PROJ-100",
      linkTypeName: "blocks",
    });

    expect(mockRepo.linkIssues).toHaveBeenCalledWith(
      expect.objectContaining({
        linkTypeName: "Blocks",
      }),
    );
  });

  it("passes comment through to repository", async () => {
    mockRepo.getIssueLinkTypes.mockResolvedValue([
      {
        id: "10000",
        name: "Blocks",
        inward: "is blocked by",
        outward: "blocks",
      },
    ]);
    mockRepo.linkIssues.mockResolvedValue(undefined);

    await useCase.execute({
      inwardIssueKey: "PROJ-200",
      outwardIssueKey: "PROJ-100",
      linkTypeName: "Blocks",
      comment: "Link comment",
    });

    expect(mockRepo.linkIssues).toHaveBeenCalledWith(
      expect.objectContaining({
        comment: "Link comment",
      }),
    );
  });

  it("throws when link type is missing", async () => {
    mockRepo.getIssueLinkTypes.mockResolvedValue([
      {
        id: "10000",
        name: "Blocks",
        inward: "is blocked by",
        outward: "blocks",
      },
      {
        id: "10001",
        name: "Relates",
        inward: "relates to",
        outward: "relates to",
      },
    ]);

    await expect(
      useCase.execute({
        inwardIssueKey: "PROJ-200",
        outwardIssueKey: "PROJ-100",
        linkTypeName: "Unknown",
      }),
    ).rejects.toThrow("Available types");
  });
});
