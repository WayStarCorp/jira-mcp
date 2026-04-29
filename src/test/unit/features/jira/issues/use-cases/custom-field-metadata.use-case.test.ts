import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { IssueCustomFieldRepository } from "@features/jira/issues/repositories/issue-custom-field.repository";
import {
  GetIssueCustomFieldMetadataUseCaseImpl,
  ResolveCustomFieldsUseCaseImpl,
} from "@features/jira/issues/use-cases/custom-field-metadata.use-case";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("GetIssueCustomFieldMetadataUseCaseImpl", () => {
  let useCase: GetIssueCustomFieldMetadataUseCaseImpl;
  let mockRepo: {
    getIssueCustomFieldMetadata: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    mockRepo = {
      getIssueCustomFieldMetadata: mock(),
    };

    useCase = new GetIssueCustomFieldMetadataUseCaseImpl(
      mockRepo as unknown as IssueCustomFieldRepository,
    );
  });

  afterEach(() => {
    mock.restore();
  });

  it("filters custom fields by query", async () => {
    mockRepo.getIssueCustomFieldMetadata.mockResolvedValue([
      {
        fieldId: "customfield_10070",
        key: "customfield_10070",
        name: "Инициатор",
        required: false,
        operations: ["set"],
        schema: { type: "option" },
        allowedValues: [],
      },
      {
        fieldId: "customfield_10071",
        key: "customfield_10071",
        name: "Другой",
        required: false,
        operations: ["set"],
        schema: { type: "string" },
        allowedValues: [],
      },
    ]);

    const result = await useCase.execute({
      issueKey: "INV-1930",
      fieldQuery: "инициатор",
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Инициатор");
  });
});

describe("ResolveCustomFieldsUseCaseImpl", () => {
  let useCase: ResolveCustomFieldsUseCaseImpl;
  let mockRepo: {
    getIssueCustomFieldMetadata: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    mockRepo = {
      getIssueCustomFieldMetadata: mock(),
    };

    useCase = new ResolveCustomFieldsUseCaseImpl(
      mockRepo as unknown as IssueCustomFieldRepository,
    );
  });

  afterEach(() => {
    mock.restore();
  });

  it("resolves field names and option labels to Jira payloads", async () => {
    mockRepo.getIssueCustomFieldMetadata.mockResolvedValue([
      {
        fieldId: "customfield_10070",
        key: "customfield_10070",
        name: "Инициатор",
        required: false,
        operations: ["set"],
        schema: { type: "option" },
        allowedValues: [
          { id: "10020", value: "Данил" },
          { id: "10026", value: "Роман" },
        ],
      },
    ]);

    const result = await useCase.execute({
      issueKey: "INV-1930",
      customFields: {
        Инициатор: "Роман",
      },
    });

    expect(result).toEqual({
      customfield_10070: { id: "10026" },
    });
  });

  it("keeps explicit customfield ids unchanged", async () => {
    mockRepo.getIssueCustomFieldMetadata.mockResolvedValue([
      {
        fieldId: "customfield_10070",
        key: "customfield_10070",
        name: "Инициатор",
        required: false,
        operations: ["set"],
        schema: { type: "option" },
        allowedValues: [{ id: "10026", value: "Роман" }],
      },
    ]);

    const result = await useCase.execute({
      issueKey: "INV-1930",
      customFields: {
        customfield_10070: { id: "10026" },
      },
    });

    expect(result).toEqual({
      customfield_10070: { id: "10026" },
    });
  });
});
