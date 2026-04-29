/**
 * Add Issues To Sprint Handler Tests
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  JiraApiError,
  JiraPermissionError,
} from "@features/jira/client/errors";
import { AddIssuesToSprintHandler } from "@features/jira/sprints/handlers/add-issues-to-sprint.handler";
import type { AddIssuesToSprintUseCase } from "@features/jira/sprints/use-cases/add-issues-to-sprint.use-case";
import type {
  AddIssuesToSprintParams,
  SprintValidator,
} from "@features/jira/sprints/validators/sprint.validator";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("AddIssuesToSprintHandler", () => {
  let handler: AddIssuesToSprintHandler;
  let executeMock: ReturnType<typeof mock>;
  let validateMock: ReturnType<typeof mock>;

  beforeEach(() => {
    executeMock = mock(() =>
      Promise.resolve({
        sprintId: 42,
        sprintName: "Test Sprint",
        issueKeys: ["PROJ-100"],
      }),
    );
    validateMock = mock((params: AddIssuesToSprintParams) => params);

    const mockUseCase: AddIssuesToSprintUseCase = {
      execute: executeMock,
    };

    const mockValidator: SprintValidator = {
      validateGetSprintsParams: validateMock,
      validateGetSprintParams: validateMock,
      validateAddIssuesToSprintParams: validateMock,
    };

    handler = new AddIssuesToSprintHandler(mockUseCase, mockValidator);
  });

  afterEach(() => {
    mock.restore();
  });

  it("should add issues by sprintId and format success", async () => {
    const params: AddIssuesToSprintParams = {
      issueKeys: ["PROJ-100"],
      sprintId: 42,
    };

    const result = await handler.handle(params);

    expect(result.success).toBe(true);
    expect(result.data).toContain("Test Sprint");
    expect(result.data).toContain("42");
    expect(result.data).toContain("PROJ-100");
    expect(executeMock).toHaveBeenCalled();
  });

  it("should surface friendly message on 404 API errors", async () => {
    executeMock.mockImplementation(() => {
      throw new JiraApiError(
        "Not found",
        "JIRA_NOT_FOUND_ERROR",
        undefined,
        404,
      );
    });

    const result = await handler.handle({
      issueKeys: ["PROJ-1"],
      boardId: 7,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Not found");
  });

  it("should surface permission errors", async () => {
    executeMock.mockImplementation(() => {
      throw new JiraPermissionError("Forbidden");
    });

    const result = await handler.handle({
      issueKeys: ["PROJ-1"],
      sprintId: 1,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Permission denied");
  });
});
