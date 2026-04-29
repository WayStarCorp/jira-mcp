/**
 * Tool Factory
 *
 * Creates JIRA tool handlers with proper dependency injection
 */

import type { JiraTools } from "../types";
import type { JiraDependencies } from "./dependency.factory";

// Import handlers
import {
  AddIssueCommentHandler,
  AddWorklogHandler,
  CreateIssueHandler,
  DeleteWorklogHandler,
  GetAssignedIssuesHandler,
  GetCustomFieldMetadataHandler,
  GetIssueCommentsHandler,
  GetIssueHandler,
  GetIssueLinkTypesHandler,
  GetIssueTransitionsHandler,
  GetWorklogsHandler,
  LinkIssuesHandler,
  SearchIssuesHandler,
  TransitionIssueHandler,
  UpdateIssueHandler,
  UpdateWorklogHandler,
} from "../../issues";

import { GetBoardsHandler } from "../../boards";
import { GetProjectsHandler } from "../../projects";
import { AddIssuesToSprintHandler, GetSprintsHandler } from "../../sprints";
import {
  AssignIssueHandler,
  GetAssignableUsersHandler,
  GetCurrentUserHandler,
  SearchUsersHandler,
} from "../../users";

/**
 * Create JIRA tools with dependencies
 *
 * @param dependencies - All required dependencies for JIRA tools
 * @returns Complete set of JIRA tool handlers
 */
export function createJiraTools(dependencies: JiraDependencies): JiraTools {
  // Create issue handlers
  const issueHandlers = createIssueHandlers(dependencies);

  // Create worklog handlers
  const worklogHandlers = createWorklogHandlers(dependencies);

  // Create project handlers
  const projectHandlers = createProjectHandlers(dependencies);

  // Create board handlers
  const boardHandlers = createBoardHandlers(dependencies);

  // Create sprint handlers
  const sprintHandlers = createSprintHandlers(dependencies);

  // Create user handlers
  const userHandlers = createUserHandlers(dependencies);

  return {
    ...issueHandlers,
    ...worklogHandlers,
    ...projectHandlers,
    ...boardHandlers,
    ...sprintHandlers,
    ...userHandlers,
  };
}

/**
 * Create issue-related handlers
 */
function createIssueHandlers(dependencies: JiraDependencies) {
  const getIssueHandler = new GetIssueHandler(
    dependencies.getIssueUseCase,
    dependencies.issueParamsValidator,
  );

  const getIssueCommentsHandler = new GetIssueCommentsHandler(
    dependencies.getIssueCommentsUseCase,
    dependencies.issueCommentValidator,
  );

  const addIssueCommentHandler = new AddIssueCommentHandler(
    dependencies.addIssueCommentUseCase,
    dependencies.issueCommentValidator,
  );

  const getIssueTransitionsHandler = new GetIssueTransitionsHandler(
    dependencies.getIssueTransitionsUseCase,
  );

  const getAssignedIssuesHandler = new GetAssignedIssuesHandler(
    dependencies.getAssignedIssuesUseCase,
  );

  const createIssueHandler = new CreateIssueHandler(
    dependencies.createIssueUseCase,
  );

  const updateIssueHandler = new UpdateIssueHandler(
    dependencies.updateIssueUseCase,
    dependencies.resolveCustomFieldsUseCase,
  );

  const transitionIssueHandler = new TransitionIssueHandler(
    dependencies.transitionIssueUseCase,
  );

  const getCustomFieldMetadataHandler = new GetCustomFieldMetadataHandler(
    dependencies.getIssueCustomFieldMetadataUseCase,
    dependencies.issueCustomFieldValidator,
  );

  const getIssueLinkTypesHandler = new GetIssueLinkTypesHandler(
    dependencies.getIssueLinkTypesUseCase,
  );

  const linkIssuesHandler = new LinkIssuesHandler(
    dependencies.linkIssuesUseCase,
  );

  const searchIssuesHandler = new SearchIssuesHandler(
    dependencies.searchIssuesUseCase,
  );

  return {
    jira_get_issue: {
      handle: async (args: unknown) => getIssueHandler.handle(args),
    },
    jira_get_issue_comments: {
      handle: async (args: unknown) => getIssueCommentsHandler.handle(args),
    },
    jira_add_issue_comment: {
      handle: async (args: unknown) => addIssueCommentHandler.handle(args),
    },
    jira_get_assigned_issues: {
      handle: async (args: unknown) => getAssignedIssuesHandler.handle(args),
    },
    jira_get_issue_transitions: {
      handle: async (args: unknown) => getIssueTransitionsHandler.handle(args),
    },
    jira_get_issue_custom_field_metadata: {
      handle: async (args: unknown) =>
        getCustomFieldMetadataHandler.handle(args),
    },
    jira_create_issue: {
      handle: async (args: unknown) => createIssueHandler.handle(args),
    },
    jira_transition_issue: {
      handle: async (args: unknown) => transitionIssueHandler.handle(args),
    },
    jira_update_issue: {
      handle: async (args: unknown) => updateIssueHandler.handle(args),
    },
    jira_get_issue_link_types: {
      handle: async (args: unknown) => getIssueLinkTypesHandler.handle(args),
    },
    jira_link_issues: {
      handle: async (args: unknown) => linkIssuesHandler.handle(args),
    },
    jira_search_issues: {
      handle: async (args: unknown) => searchIssuesHandler.handle(args),
    },
  };
}

/**
 * Create worklog-related handlers
 */
function createWorklogHandlers(dependencies: JiraDependencies) {
  const addWorklogHandler = new AddWorklogHandler(
    dependencies.addWorklogUseCase,
    dependencies.worklogValidator,
  );

  const getWorklogsHandler = new GetWorklogsHandler(
    dependencies.getWorklogsUseCase,
    dependencies.worklogValidator,
  );

  const updateWorklogHandler = new UpdateWorklogHandler(
    dependencies.updateWorklogUseCase,
    dependencies.worklogValidator,
  );

  const deleteWorklogHandler = new DeleteWorklogHandler(
    dependencies.deleteWorklogUseCase,
    dependencies.worklogValidator,
  );

  return {
    jira_add_worklog: {
      handle: async (args: unknown) => addWorklogHandler.handle(args),
    },
    jira_get_worklogs: {
      handle: async (args: unknown) => getWorklogsHandler.handle(args),
    },
    jira_update_worklog: {
      handle: async (args: unknown) => updateWorklogHandler.handle(args),
    },
    jira_delete_worklog: {
      handle: async (args: unknown) => deleteWorklogHandler.handle(args),
    },
  };
}

/**
 * Create project-related handlers
 */
function createProjectHandlers(dependencies: JiraDependencies) {
  const getProjectsHandler = new GetProjectsHandler(
    dependencies.getProjectsUseCase,
    dependencies.projectParamsValidator,
  );

  return {
    jira_get_projects: {
      handle: async (args: unknown) => getProjectsHandler.handle(args),
    },
  };
}

/**
 * Create board-related handlers
 */
function createBoardHandlers(dependencies: JiraDependencies) {
  const getBoardsHandler = new GetBoardsHandler(
    dependencies.getBoardsUseCase,
    dependencies.boardValidator,
  );

  return {
    jira_get_boards: {
      handle: async (args: unknown) => getBoardsHandler.handle(args),
    },
  };
}

/**
 * Create sprint-related handlers
 */
function createSprintHandlers(dependencies: JiraDependencies) {
  const getSprintsHandler = new GetSprintsHandler(
    dependencies.getSprintsUseCase,
    dependencies.sprintValidator,
  );

  const addIssuesToSprintHandler = new AddIssuesToSprintHandler(
    dependencies.addIssuesToSprintUseCase,
    dependencies.sprintValidator,
  );

  return {
    jira_get_sprints: {
      handle: async (args: unknown) => getSprintsHandler.handle(args),
    },
    jira_add_issues_to_sprint: {
      handle: async (args: unknown) => addIssuesToSprintHandler.handle(args),
    },
  };
}

/**
 * Create user-related handlers
 */
function createUserHandlers(dependencies: JiraDependencies) {
  const getCurrentUserHandler = new GetCurrentUserHandler(
    dependencies.getCurrentUserUseCase,
  );

  const searchUsersHandler = new SearchUsersHandler(
    dependencies.searchUsersUseCase,
  );

  const getAssignableUsersHandler = new GetAssignableUsersHandler(
    dependencies.getAssignableUsersUseCase,
  );

  const assignIssueHandler = new AssignIssueHandler(
    dependencies.assignIssueUseCase,
  );

  return {
    jira_get_current_user: {
      handle: async (args: unknown) => getCurrentUserHandler.handle(args),
    },
    jira_search_users: {
      handle: async (args: unknown) => searchUsersHandler.handle(args),
    },
    jira_get_assignable_users: {
      handle: async (args: unknown) => getAssignableUsersHandler.handle(args),
    },
    jira_assign_issue: {
      handle: async (args: unknown) => assignIssueHandler.handle(args),
    },
  };
}
