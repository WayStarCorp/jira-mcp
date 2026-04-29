import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { BoardType } from "@features/jira/boards/models";
import { SprintState } from "@features/jira/sprints/models";
import { GetSprintsUseCaseImpl } from "@features/jira/sprints/use-cases/get-sprints.use-case";
import { mockFactory } from "@test/mocks/jira-mock-factory";
import {
  createMockBoardRepository,
  createMockSprintRepository,
} from "@test/utils/repository-test.utils";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("GetSprintsUseCaseImpl", () => {
  let sprintRepository: ReturnType<typeof createMockSprintRepository>;
  let boardRepository: ReturnType<typeof createMockBoardRepository>;
  let useCase: GetSprintsUseCaseImpl;

  beforeEach(() => {
    sprintRepository = createMockSprintRepository();
    boardRepository = createMockBoardRepository();
    useCase = new GetSprintsUseCaseImpl(sprintRepository, boardRepository);
  });

  afterEach(() => {
    mock.restore();
  });

  it("retrieves sprints for a specific board when boardId is provided", async () => {
    const sprint = mockFactory.createMockSprint({
      id: 77,
      name: "Active Sprint",
      state: SprintState.ACTIVE,
    });
    sprintRepository.getSprints.mockResolvedValue([sprint]);

    const result = await useCase.execute({
      boardId: 7,
      state: SprintState.ACTIVE,
      startAt: 0,
      maxResults: 50,
    });

    expect(result).toEqual([sprint]);
    expect(boardRepository.getBoards).not.toHaveBeenCalled();
    expect(sprintRepository.getSprints).toHaveBeenCalledWith(7, {
      state: SprintState.ACTIVE,
      startAt: 0,
      maxResults: 50,
      boardId: 7,
    });
  });

  it("aggregates sprints from scrum boards when boardId is omitted", async () => {
    const firstSprint = mockFactory.createMockSprint({
      id: 77,
      name: "Board 7 Sprint",
      state: SprintState.ACTIVE,
    });
    const secondSprint = mockFactory.createMockSprint({
      id: 88,
      name: "Board 8 Sprint",
      state: SprintState.ACTIVE,
    });
    boardRepository.getBoards.mockResolvedValue([
      { id: "7", name: "Team A", type: BoardType.SCRUM, self: "" },
      { id: "8", name: "Team B", type: BoardType.SCRUM, self: "" },
    ]);
    sprintRepository.getSprints
      .mockResolvedValueOnce([firstSprint])
      .mockResolvedValueOnce([secondSprint]);

    const result = await useCase.execute({
      state: SprintState.ACTIVE,
      startAt: 0,
      maxResults: 50,
    });

    expect(result).toEqual([firstSprint, secondSprint]);
    expect(boardRepository.getBoards).toHaveBeenCalledWith({
      type: BoardType.SCRUM,
      maxResults: 50,
    });
    expect(sprintRepository.getSprints).toHaveBeenCalledWith(7, {
      state: SprintState.ACTIVE,
      startAt: 0,
      maxResults: 50,
    });
    expect(sprintRepository.getSprints).toHaveBeenCalledWith(8, {
      state: SprintState.ACTIVE,
      startAt: 0,
      maxResults: 50,
    });
  });
});
