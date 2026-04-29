/**
 * Sprint Repository Tests
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { HttpClient } from "@features/jira/client/http/jira.http.types";
import { SprintState } from "@features/jira/sprints/models";
import { SprintRepositoryImpl } from "@features/jira/sprints/repositories/sprint.repository";
import { mockFactory } from "@test/mocks/jira-mock-factory";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("SprintRepositoryImpl", () => {
  let repository: SprintRepositoryImpl;
  let sendRequestMock: ReturnType<typeof mock>;

  beforeEach(() => {
    sendRequestMock = mock();
    const httpClient = {
      sendRequest: sendRequestMock,
    } as unknown as HttpClient;

    repository = new SprintRepositoryImpl(httpClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it("routes getSprints through the agile API", async () => {
    const sprint = mockFactory.createMockSprint({
      id: 77,
      name: "Active Sprint",
      state: SprintState.ACTIVE,
    });
    sendRequestMock.mockResolvedValue({ values: [sprint] });

    const result = await repository.getSprints(7, {
      state: SprintState.ACTIVE,
      maxResults: 50,
      startAt: 0,
    });

    expect(result).toEqual([sprint]);
    expect(sendRequestMock).toHaveBeenCalledWith({
      endpoint: "board/7/sprint",
      method: "GET",
      queryParams: {
        state: SprintState.ACTIVE,
        maxResults: 50,
        startAt: 0,
      },
      jiraApi: "agile",
    });
  });

  it("routes getSprint through the agile API", async () => {
    const sprint = mockFactory.createMockSprint({
      id: 77,
      name: "Active Sprint",
      state: SprintState.ACTIVE,
    });
    sendRequestMock.mockResolvedValue(sprint);

    const result = await repository.getSprint(77);

    expect(result).toEqual(sprint);
    expect(sendRequestMock).toHaveBeenCalledWith({
      endpoint: "sprint/77",
      method: "GET",
      jiraApi: "agile",
    });
  });

  it("adds issues to a sprint through the agile API", async () => {
    sendRequestMock.mockResolvedValue(undefined);

    await repository.addIssuesToSprint(77, ["PROJ-1", "PROJ-2"]);

    expect(sendRequestMock).toHaveBeenCalledWith({
      endpoint: "sprint/77/issue",
      method: "POST",
      body: {
        issues: ["PROJ-1", "PROJ-2"],
      },
      jiraApi: "agile",
    });
  });
});
