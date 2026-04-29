/**
 * Board Repository Tests
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { BoardRepositoryImpl } from "@features/jira/boards/repositories/board.repository";
import type { HttpClient } from "@features/jira/client/http/jira.http.types";
import { mockFactory } from "@test/mocks/jira-mock-factory";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("BoardRepositoryImpl", () => {
  let repository: BoardRepositoryImpl;
  let sendRequestMock: ReturnType<typeof mock>;

  beforeEach(() => {
    sendRequestMock = mock();
    const httpClient = {
      sendRequest: sendRequestMock,
    } as unknown as HttpClient;

    repository = new BoardRepositoryImpl(httpClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it("routes getBoards through the agile API", async () => {
    const board = mockFactory.createMockBoard({ id: "7", name: "Scrum Board" });
    sendRequestMock.mockResolvedValue({ values: [board] });

    const result = await repository.getBoards({ maxResults: 10 });

    expect(result).toEqual([board]);
    expect(sendRequestMock).toHaveBeenCalledWith({
      endpoint: "board",
      method: "GET",
      queryParams: {
        maxResults: 10,
      },
      jiraApi: "agile",
    });
  });

  it("routes getBoard and getBoardConfiguration through the agile API", async () => {
    const board = mockFactory.createMockBoard({ id: "7", name: "Scrum Board" });

    sendRequestMock.mockResolvedValueOnce(board);
    const fetchedBoard = await repository.getBoard(7);
    expect(fetchedBoard).toEqual(board);
    expect(sendRequestMock).toHaveBeenCalledWith({
      endpoint: "board/7",
      method: "GET",
      jiraApi: "agile",
    });

    sendRequestMock.mockResolvedValueOnce({
      id: "7",
      name: "Scrum Board",
    });
    await repository.getBoardConfiguration(7);
    expect(sendRequestMock).toHaveBeenCalledWith({
      endpoint: "board/7/configuration",
      method: "GET",
      jiraApi: "agile",
    });
  });
});
