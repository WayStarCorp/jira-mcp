/**
 * Add Issues To Sprint Use Case Tests
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { SprintState } from "@features/jira/sprints/models";
import { AddIssuesToSprintUseCaseImpl } from "@features/jira/sprints/use-cases/add-issues-to-sprint.use-case";
import { mockFactory } from "@test/mocks/jira-mock-factory";
import { createMockSprintRepository } from "@test/utils/repository-test.utils";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("AddIssuesToSprintUseCaseImpl", () => {
  let useCase: AddIssuesToSprintUseCaseImpl;
  let repository: ReturnType<typeof createMockSprintRepository>;

  beforeEach(() => {
    repository = createMockSprintRepository();
    useCase = new AddIssuesToSprintUseCaseImpl(repository);
  });

  afterEach(() => {
    mock.restore();
  });

  it("uses explicit sprintId without looking up active sprints", async () => {
    const sprint = mockFactory.createMockSprint({
      id: 42,
      name: "Test Sprint",
      state: SprintState.ACTIVE,
    });
    repository.getSprint.mockResolvedValue(sprint);
    repository.addIssuesToSprint.mockResolvedValue(undefined);

    const result = await useCase.execute({
      issueKeys: ["PROJ-100"],
      sprintId: 42,
    });

    expect(repository.getSprints).not.toHaveBeenCalled();
    expect(repository.addIssuesToSprint).toHaveBeenCalledWith(42, ["PROJ-100"]);
    expect(repository.getSprint).toHaveBeenCalledWith(42);
    expect(result).toEqual({
      sprintId: 42,
      sprintName: "Test Sprint",
      issueKeys: ["PROJ-100"],
    });
  });

  it("resolves the active sprint for a board", async () => {
    const activeSprint = mockFactory.createMockSprint({
      id: 77,
      name: "Active Sprint",
      state: SprintState.ACTIVE,
    });
    repository.getSprints.mockResolvedValue([activeSprint]);
    repository.addIssuesToSprint.mockResolvedValue(undefined);
    repository.getSprint.mockResolvedValue(activeSprint);

    const result = await useCase.execute({
      issueKeys: ["PROJ-200"],
      boardId: 7,
    });

    expect(repository.getSprints).toHaveBeenCalledWith(7, {
      state: SprintState.ACTIVE,
      maxResults: 50,
      startAt: 0,
    });
    expect(repository.addIssuesToSprint).toHaveBeenCalledWith(77, ["PROJ-200"]);
    expect(repository.getSprint).toHaveBeenCalledWith(77);
    expect(result.sprintId).toBe(77);
    expect(result.sprintName).toBe("Active Sprint");
  });

  it("fails when a board has no active sprint", async () => {
    repository.getSprints.mockResolvedValue([]);

    await expect(
      useCase.execute({
        issueKeys: ["PROJ-300"],
        boardId: 7,
      }),
    ).rejects.toThrow("No active sprint on board 7");

    expect(repository.addIssuesToSprint).not.toHaveBeenCalled();
  });

  it("fails when a board has multiple active sprints", async () => {
    repository.getSprints.mockResolvedValue([
      mockFactory.createMockSprint({
        id: 77,
        name: "Sprint Alpha",
        state: SprintState.ACTIVE,
      }),
      mockFactory.createMockSprint({
        id: 78,
        name: "Sprint Beta",
        state: SprintState.ACTIVE,
      }),
    ]);

    await expect(
      useCase.execute({
        issueKeys: ["PROJ-400"],
        boardId: 7,
      }),
    ).rejects.toThrow("Multiple active sprints found on board 7");

    expect(repository.addIssuesToSprint).not.toHaveBeenCalled();
  });

  it("fails when neither sprintId nor boardId is provided", async () => {
    await expect(
      useCase.execute({
        issueKeys: ["PROJ-500"],
      }),
    ).rejects.toThrow("Provide either sprintId or boardId");

    expect(repository.getSprints).not.toHaveBeenCalled();
    expect(repository.addIssuesToSprint).not.toHaveBeenCalled();
  });
});
