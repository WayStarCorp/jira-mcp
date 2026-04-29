import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { HttpClient } from "@features/jira/client/http/jira.http.types";
import { IssueCustomFieldRepositoryImpl } from "@features/jira/issues/repositories/issue-custom-field.repository";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("IssueCustomFieldRepositoryImpl", () => {
  let repository: IssueCustomFieldRepositoryImpl;
  let sendRequestMock: ReturnType<typeof mock>;

  beforeEach(() => {
    sendRequestMock = mock();
    const httpClient = {
      sendRequest: sendRequestMock,
    } as unknown as HttpClient;

    repository = new IssueCustomFieldRepositoryImpl(httpClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it("returns only custom field metadata", async () => {
    sendRequestMock.mockResolvedValue({
      fields: {
        summary: {
          key: "summary",
          name: "Summary",
          required: true,
          operations: ["set"],
        },
        customfield_10070: {
          key: "customfield_10070",
          name: "Инициатор",
          required: false,
          operations: ["set"],
          schema: {
            type: "option",
            custom: "com.atlassian.jira.plugin.system.customfieldtypes:select",
            customId: 10070,
          },
          allowedValues: [
            {
              id: "10026",
              value: "Роман",
            },
          ],
        },
      },
    });

    const result = await repository.getIssueCustomFieldMetadata("INV-1930");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        fieldId: "customfield_10070",
        name: "Инициатор",
        required: false,
        operations: ["set"],
      }),
    );
    expect(sendRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "issue/INV-1930/editmeta",
        method: "GET",
      }),
    );
  });
});
