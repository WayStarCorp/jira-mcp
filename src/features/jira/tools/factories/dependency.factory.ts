/**
 * Dependency Factory
 *
 * Creates and manages all dependencies for JIRA tools
 */

import type { JiraConfig } from "../../client/config";
import { JiraHttpClient } from "../../client/http/jira.http-client.impl";

// Import repositories, validators, and use cases (issues)
import {
  AddIssueCommentUseCaseImpl,
  AddWorklogUseCaseImpl,
  ChangeIssueTypeUseCaseImpl,
  CreateIssueUseCaseImpl,
  DeleteWorklogUseCaseImpl,
  EpicRelationResolver,
  GetAssignedIssuesUseCaseImpl,
  GetEpicInfoUseCaseImpl,
  GetIssueCommentsUseCaseImpl,
  GetIssueCustomFieldMetadataUseCaseImpl,
  GetIssueLinkTypesUseCaseImpl,
  GetIssueTransitionsUseCaseImpl,
  GetIssueUseCaseImpl,
  GetWorklogsUseCaseImpl,
  IssueCommentRepositoryImpl,
  IssueCommentValidatorImpl,
  IssueCustomFieldRepositoryImpl,
  IssueCustomFieldValidatorImpl,
  IssueLinkRepositoryImpl,
  IssueParamsValidatorImpl,
  IssueRepositoryImpl,
  IssueSearchRepositoryImpl,
  IssueTransitionRepositoryImpl,
  LinkIssuesUseCaseImpl,
  RemoveIssueEpicUseCaseImpl,
  ResolveCustomFieldsUseCaseImpl,
  SearchIssuesUseCaseImpl,
  SetIssueEpicUseCaseImpl,
  TransitionIssueUseCaseImpl,
  UnlinkIssueUseCaseImpl,
  UpdateIssueUseCaseImpl,
  UpdateWorklogUseCaseImpl,
  WorklogRepositoryImpl,
  WorklogValidatorImpl,
} from "../../issues";

import {
  BoardRepositoryImpl,
  BoardValidatorImpl,
  GetBoardsUseCaseImpl,
} from "../../boards";

import {
  GetProjectsUseCaseImpl,
  ProjectParamsValidatorImpl,
  ProjectPermissionRepositoryImpl,
  ProjectRepositoryImpl,
  ProjectValidatorImpl,
} from "../../projects";

import {
  AddIssuesToSprintUseCaseImpl,
  GetSprintsUseCaseImpl,
  SprintRepositoryImpl,
  SprintValidatorImpl,
} from "../../sprints";

import {
  AssignIssueUseCaseImpl,
  GetAssignableUsersUseCaseImpl,
  GetCurrentUserUseCaseImpl,
  SearchUsersUseCaseImpl,
  UserProfileRepositoryImpl,
  UserProfileValidatorImpl,
} from "../../users";

import {
  AttachmentValidatorImpl,
  DownloadAttachmentUseCaseImpl,
  GetIssueAttachmentsUseCaseImpl,
} from "../../attachments";
import { AttachmentRepositoryImpl } from "../../attachments/repositories";

/**
 * Dependencies interface
 *
 * Defines all dependencies required for JIRA tools
 */
export interface JiraDependencies {
  // Use cases
  getEpicInfoUseCase: GetEpicInfoUseCaseImpl;
  setIssueEpicUseCase: SetIssueEpicUseCaseImpl;
  removeIssueEpicUseCase: RemoveIssueEpicUseCaseImpl;
  changeIssueTypeUseCase: ChangeIssueTypeUseCaseImpl;
  unlinkIssueUseCase: UnlinkIssueUseCaseImpl;
  createIssueUseCase: CreateIssueUseCaseImpl;
  updateIssueUseCase: UpdateIssueUseCaseImpl;
  searchIssuesUseCase: SearchIssuesUseCaseImpl;
  getIssueUseCase: GetIssueUseCaseImpl;
  getAssignedIssuesUseCase: GetAssignedIssuesUseCaseImpl;
  getIssueCommentsUseCase: GetIssueCommentsUseCaseImpl;
  getIssueCustomFieldMetadataUseCase: GetIssueCustomFieldMetadataUseCaseImpl;
  addIssueCommentUseCase: AddIssueCommentUseCaseImpl;
  getIssueTransitionsUseCase: GetIssueTransitionsUseCaseImpl;
  getIssueLinkTypesUseCase: GetIssueLinkTypesUseCaseImpl;
  linkIssuesUseCase: LinkIssuesUseCaseImpl;
  resolveCustomFieldsUseCase: ResolveCustomFieldsUseCaseImpl;
  addWorklogUseCase: AddWorklogUseCaseImpl;
  getWorklogsUseCase: GetWorklogsUseCaseImpl;
  updateWorklogUseCase: UpdateWorklogUseCaseImpl;
  deleteWorklogUseCase: DeleteWorklogUseCaseImpl;
  getProjectsUseCase: GetProjectsUseCaseImpl;
  getBoardsUseCase: GetBoardsUseCaseImpl;
  getSprintsUseCase: GetSprintsUseCaseImpl;
  addIssuesToSprintUseCase: AddIssuesToSprintUseCaseImpl;
  transitionIssueUseCase: TransitionIssueUseCaseImpl;
  getCurrentUserUseCase: GetCurrentUserUseCaseImpl;
  searchUsersUseCase: SearchUsersUseCaseImpl;
  getAssignableUsersUseCase: GetAssignableUsersUseCaseImpl;
  assignIssueUseCase: AssignIssueUseCaseImpl;
  getIssueAttachmentsUseCase: GetIssueAttachmentsUseCaseImpl;
  downloadAttachmentUseCase: DownloadAttachmentUseCaseImpl;

  // Validators
  issueParamsValidator: IssueParamsValidatorImpl;
  issueCommentValidator: IssueCommentValidatorImpl;
  issueCustomFieldValidator: IssueCustomFieldValidatorImpl;
  worklogValidator: WorklogValidatorImpl;
  projectParamsValidator: ProjectParamsValidatorImpl;
  boardValidator: BoardValidatorImpl;
  sprintValidator: SprintValidatorImpl;
  userProfileValidator: UserProfileValidatorImpl;
  attachmentValidator: AttachmentValidatorImpl;
}

/**
 * Create all JIRA dependencies
 *
 * @param config - JIRA configuration
 * @returns Complete set of dependencies for JIRA tools
 */
export function createJiraDependencies(config: JiraConfig): JiraDependencies {
  // Create shared HTTP client
  const httpClient = new JiraHttpClient(config);

  // Create repositories
  const repositories = createRepositories(httpClient);

  // Create validators
  const validators = createValidators(httpClient);

  // Create use cases
  const useCases = createUseCases(repositories, validators);

  return {
    ...useCases,
    ...validators,
  };
}

/**
 * Create all repositories
 */
function createRepositories(httpClient: JiraHttpClient) {
  return {
    issueRepository: new IssueRepositoryImpl(httpClient),
    issueSearchRepository: new IssueSearchRepositoryImpl(httpClient),
    issueCommentRepository: new IssueCommentRepositoryImpl(httpClient),
    issueCustomFieldRepository: new IssueCustomFieldRepositoryImpl(httpClient),
    issueLinkRepository: new IssueLinkRepositoryImpl(httpClient),
    issueTransitionRepository: new IssueTransitionRepositoryImpl(httpClient),
    worklogRepository: new WorklogRepositoryImpl(httpClient),
    projectRepository: new ProjectRepositoryImpl(httpClient),
    projectPermissionRepository: new ProjectPermissionRepositoryImpl(
      httpClient,
    ),
    boardRepository: new BoardRepositoryImpl(httpClient),
    sprintRepository: new SprintRepositoryImpl(httpClient),
    userProfileRepository: new UserProfileRepositoryImpl(httpClient),
    attachmentRepository: new AttachmentRepositoryImpl(httpClient),
  };
}

/**
 * Create all validators
 */
function createValidators(httpClient: JiraHttpClient) {
  return {
    issueParamsValidator: new IssueParamsValidatorImpl(),
    issueCommentValidator: new IssueCommentValidatorImpl(),
    issueCustomFieldValidator: new IssueCustomFieldValidatorImpl(),
    worklogValidator: new WorklogValidatorImpl(),
    projectValidator: new ProjectValidatorImpl(httpClient),
    projectParamsValidator: new ProjectParamsValidatorImpl(),
    boardValidator: new BoardValidatorImpl(),
    sprintValidator: new SprintValidatorImpl(),
    userProfileValidator: new UserProfileValidatorImpl(),
    attachmentValidator: new AttachmentValidatorImpl(),
  };
}

/**
 * Create all use cases
 */
function createUseCases(
  repositories: ReturnType<typeof createRepositories>,
  validators: ReturnType<typeof createValidators>,
) {
  const epicRelationResolver = new EpicRelationResolver(
    repositories.issueCustomFieldRepository,
  );

  const updateIssueUseCase = new UpdateIssueUseCaseImpl(
    repositories.issueRepository,
    repositories.issueTransitionRepository,
    repositories.worklogRepository,
    repositories.projectPermissionRepository,
  );

  const searchIssuesUseCase = new SearchIssuesUseCaseImpl(
    repositories.issueSearchRepository,
  );

  const resolveCustomFieldsUseCase = new ResolveCustomFieldsUseCaseImpl(
    repositories.issueCustomFieldRepository,
  );

  return {
    // Issue use cases
    createIssueUseCase: new CreateIssueUseCaseImpl(
      repositories.issueRepository,
      validators.projectValidator,
      repositories.projectPermissionRepository,
    ),
    updateIssueUseCase,
    searchIssuesUseCase,
    getEpicInfoUseCase: new GetEpicInfoUseCaseImpl(
      repositories.issueRepository,
      searchIssuesUseCase,
      epicRelationResolver,
    ),
    setIssueEpicUseCase: new SetIssueEpicUseCaseImpl(
      updateIssueUseCase,
      repositories.issueRepository,
      epicRelationResolver,
    ),
    removeIssueEpicUseCase: new RemoveIssueEpicUseCaseImpl(
      updateIssueUseCase,
      repositories.issueRepository,
      epicRelationResolver,
    ),
    changeIssueTypeUseCase: new ChangeIssueTypeUseCaseImpl(
      updateIssueUseCase,
      repositories.issueCustomFieldRepository,
      resolveCustomFieldsUseCase,
    ),
    unlinkIssueUseCase: new UnlinkIssueUseCaseImpl(
      repositories.issueLinkRepository,
    ),
    getIssueUseCase: new GetIssueUseCaseImpl(repositories.issueRepository),
    getAssignedIssuesUseCase: new GetAssignedIssuesUseCaseImpl(
      repositories.issueSearchRepository,
    ),
    getIssueCommentsUseCase: new GetIssueCommentsUseCaseImpl(
      repositories.issueCommentRepository,
      repositories.issueRepository,
      validators.issueCommentValidator,
    ),
    getIssueCustomFieldMetadataUseCase:
      new GetIssueCustomFieldMetadataUseCaseImpl(
        repositories.issueCustomFieldRepository,
      ),
    addIssueCommentUseCase: new AddIssueCommentUseCaseImpl(
      repositories.issueCommentRepository,
    ),
    getIssueTransitionsUseCase: new GetIssueTransitionsUseCaseImpl(
      repositories.issueTransitionRepository,
    ),
    getIssueLinkTypesUseCase: new GetIssueLinkTypesUseCaseImpl(
      repositories.issueLinkRepository,
    ),
    linkIssuesUseCase: new LinkIssuesUseCaseImpl(
      repositories.issueLinkRepository,
    ),
    resolveCustomFieldsUseCase,

    // Worklog use cases
    addWorklogUseCase: new AddWorklogUseCaseImpl(
      repositories.worklogRepository,
    ),
    getWorklogsUseCase: new GetWorklogsUseCaseImpl(
      repositories.worklogRepository,
    ),
    updateWorklogUseCase: new UpdateWorklogUseCaseImpl(
      repositories.worklogRepository,
    ),
    deleteWorklogUseCase: new DeleteWorklogUseCaseImpl(
      repositories.worklogRepository,
    ),

    // Project use cases
    getProjectsUseCase: new GetProjectsUseCaseImpl(
      repositories.projectRepository,
    ),

    // Board use cases
    getBoardsUseCase: new GetBoardsUseCaseImpl(repositories.boardRepository),

    // Sprint use cases
    getSprintsUseCase: new GetSprintsUseCaseImpl(
      repositories.sprintRepository,
      repositories.boardRepository,
    ),
    addIssuesToSprintUseCase: new AddIssuesToSprintUseCaseImpl(
      repositories.sprintRepository,
    ),
    transitionIssueUseCase: new TransitionIssueUseCaseImpl(
      repositories.issueTransitionRepository,
    ),

    // User use cases
    getCurrentUserUseCase: new GetCurrentUserUseCaseImpl(
      repositories.userProfileRepository,
    ),
    searchUsersUseCase: new SearchUsersUseCaseImpl(
      repositories.userProfileRepository,
    ),
    getAssignableUsersUseCase: new GetAssignableUsersUseCaseImpl(
      repositories.userProfileRepository,
    ),
    assignIssueUseCase: new AssignIssueUseCaseImpl(
      repositories.userProfileRepository,
      repositories.issueRepository,
    ),
    getIssueAttachmentsUseCase: new GetIssueAttachmentsUseCaseImpl(
      repositories.issueRepository,
    ),
    downloadAttachmentUseCase: new DownloadAttachmentUseCaseImpl(
      repositories.attachmentRepository,
    ),
  };
}
