# Changelog

All notable changes to the Jira MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.0] - 2026-05-25

Attachments and inline ADF media: list metadata, download images/text safely, and surface file references in issue and comment markdown. **31** MCP tools (was 29).

### 🆕 Added — 0.7.0

- **`jira_get_issue_attachments`**: List `fields.attachment[]` metadata for an issue (filename, mimeType, size, author, id) without downloading bytes.
- **`jira_download_attachment`**: Download by attachment id; images return MCP **`ImageContent`**; `text/*` and `application/json` return decoded text; other types return metadata only in v0.7.0.

### ✨ Enhanced

- **`jira_get_issue`**: Markdown **Attachments** section from `fields.attachment[]`; description uses **`parseADFWithMedia`** with an **Inline media** block when ADF contains `media` nodes (hints to download by attachment id when id-bridge matches).
- **`jira_get_issue_comments`**: Inline media enrichment in comment bodies using issue attachment metadata and the same ADF media parsing.

### 🔧 Technical — 0.7.0

- **`McpResponse.content`**: Optional MCP content array; **`adaptToMcpContent`** passthrough when set (legacy text path unchanged).
- **`downloadBinary`**: Host allowlist and size cap on attachment `content` URLs (SSRF mitigation).
- **`parseADFWithMedia`**: ADF parser extension for `media` / `mediaSingle` / `mediaGroup` without breaking string-only **`parseADF`**.
- **`AttachmentTooLargeError`**, **`attachments/`** domain (repository, use-cases, handlers, formatters).

### 🧪 Tests — 0.7.0

- Unit coverage for attachment handlers, repository, formatters, ADF media parsing, MCP adapter passthrough, and issue/comments integration.

### 📖 Documentation — 0.7.0

- README: attachments feature bullets, **31**-tool note, **What's New in v0.7.0**, tool table and list → download workflow, **ImageContent** for MCP clients.

## [0.6.1] - 2026-05-15

Epic/hierarchy MCP tools, issue-type change, generic link unlink, richer issue markdown, and **`jira_get_epic_info` auto children** merge (parent + Classic Epic Link with dedupe and `maxChildren`).

### 🐛 Fixed — 0.6.1

- **`jira_get_epic_info`**: `relationMode: auto` + `includeChildren` now loads children from **both** parent hierarchy and Epic Link JQL when the Epic Link `customfield_*` is known, merges and dedupes by issue key, then sorts by `updated` (desc) before applying `maxChildren`. Previously, a non-empty parent-only result skipped Epic Link and could omit Epic-Link-only children. **Semantics**: two capped searches (each up to `maxChildren`) then merge/sort/slice—the resulting top N by `updated` can differ from a single global JQL; intentional for API limits.
- **`jira_get_epic_info`**: `includeChildren` with `relationMode: epicLink` no longer throws when no Epic Link `customfield_*` is known; returns an empty children list instead.

### 🆕 Added — 0.6.1

- **Epic & hierarchy tools**: `jira_get_epic_info`, `jira_set_issue_epic`, `jira_remove_issue_epic` with `relationMode` `auto|parent|epicLink` and optional `epicFieldId` (no hardcoded custom field IDs in code paths).
- **`jira_change_issue_type`**: change `issuetype` with `validateOnly`, `requiredFields`, and `customFields` resolution aligned with `jira_update_issue`.
- **`jira_unlink_issue`**: delete generic issue links by REST `linkId` (`DELETE issueLink/{id}`).
- **Issue output**: `jira_get_issue` / `search_jira_issues` markdown includes **Type**, parent, and a short **Issue links** snippet when present.

### ⚠️ Compatibility — 0.6.1

- Markdown returned for single-issue and search views **may change** if clients parse the raw template (new sections: type, parent, links summary). Intended for humans and stable field semantics, not brittle string parsers.

### 🧪 Tests — 0.6.1

- Unit tests for `EpicRelationResolver`, epic set/remove/change-type/unlink use cases, `get-epic-info`, validator refinements, mixed parent + Epic Link children in auto mode, and `UnlinkIssueHandler`.

### 📖 Documentation — 0.6.1

- README: Sprint section — current sprint via `state:"active"`, optional `boardId`, agent workflow, `maxResults` cap, add-to-sprint edge cases; tool table + feature bullets; MCP tool descriptions in `sprint-tools.config.ts`.
- README: Epic management section (parent vs Epic Link vs generic links), `jira_get_epic_info` auto merge behavior, note on markdown output stability.
- Prior: Clarified `jira_create_issue` `parentIssueKey` vs Epic Link (`customFields`) for company-managed Jira; extended tool and field descriptions and README.
- **`jira_change_issue_type`**: Clarified for MCP consumers that the tool JSON Schema exposes `issueTypeName` and `issueTypeId` as separate optional fields without an XOR/oneOf; **exactly one** must be supplied at runtime (unless `validateOnly:true`). Codegen and UI layers should encode that rule even when generating from schema alone.
- **`jira_get_epic_info`**: Documented `relationMode:auto` + `includeChildren` when Classic Epic Link `customfield_*` is not resolved—children load from **parent** JQL only until `epicFieldId` or metadata resolves Epic Link; markdown includes a **parent-only** footnote when applicable.
- **README**: Epic Link field detection heuristics (`EpicRelationResolver`) and when to pass explicit `epicFieldId`.

### 🔧 Technical — 0.6.1

- **`unlinkIssueParamsSchema`** moved from `epic.validator.ts` to `issue-link.validator.ts` (behavior unchanged).

## [0.6.0] - 2026-04-29

### 🆕 New Tools — v0.6.0

- **💬 `jira_add_issue_comment`**: Add a public comment to any issue. Automatically converts plain text to ADF format required by the Jira API.
- **🔄 `jira_get_issue_transitions`**: List all available workflow transitions for an issue with their IDs and target statuses.
- **🔄 `jira_transition_issue`**: Apply a workflow transition by `transitionId` or by `statusName` (fuzzy matched). Supports extra transition-screen fields.
- **🔗 `jira_get_issue_link_types`**: Discover all available link types (`Blocks`, `Relates to`, `Duplicates`, etc.) with inward/outward direction labels.
- **🔗 `jira_link_issues`**: Create a typed directional link between two issues. Validates self-link attempts.
- **👤 `jira_search_users`**: Search the entire Jira user directory by name or email fragment.
- **👤 `jira_get_assignable_users`**: List users eligible for assignment to a specific issue, with optional name filter.
- **👤 `jira_assign_issue`**: Assign an issue. Accepts `accountId` (direct) **or** `query` (resolved via assignable user search — must be unambiguous).
- **🏃 `jira_add_issues_to_sprint`**: Add one or more issues to a sprint. Provide either `sprintId` (explicit) or `boardId` (uses the board's current active sprint).
- **🔧 `jira_get_issue_custom_field_metadata`**: Inspect custom field IDs, types, allowed values and required operations for an issue before calling `jira_update_issue`.

### 🧪 Testing & Quality — v0.6.0

- 900+ unit tests covering all new handlers, use cases, repositories, validators, and formatters
- Test coverage extended for sprint repositories, board repositories, issue-link and transition flows

### 🔧 Technical Improvements — v0.6.0

- All new tools follow the established handler → use-case → repository layered pattern
- Exhaustive error classification with actionable human-readable suggestions in every handler
- `jira_transition_issue` supports both exact ID and fuzzy status-name matching
- `jira_assign_issue` fails fast when a query resolves to 0 or 2+ users, preventing accidental assignments

### ⚠️ Breaking Changes — v0.6.0

- `jira_create_issue.description` now requires a non-empty value after trim
- `GetSprintsOptions.state` is now narrowed to `SprintState`
- `GetSprintsOptions.boardId` is optional

## [0.5.4-waystar.1] - 2026-02-06

### 🐛 Fixes

- **Jira Cloud search API compatibility**: updated issue search to use `/rest/api/3/search/jql` (GET with query params) to restore search functionality after Atlassian API changes.

## [0.5.4] - 2025-01-18

### 🐛 Critical Bug Fixes — 0.5.4

- **🚨 Node.js Compatibility Fixed**: Resolved critical syntax error preventing package execution on Node.js environments
  - **Issue**: TypeScript enum compilation generated ES2021 `||=` operator causing `SyntaxError: missing ) after argument list`
  - **Solution**: Replaced TypeScript enum with const assertion for broader compatibility
  - **Impact**: Package now runs on Node.js 12.x and later (previously required Node.js 15.0.0+)
  - **Affected**: `SprintState` enum in sprint models
  - **Benefits**: Better tree-shaking, improved bundler compatibility, no breaking changes

### 🔧 Technical Improvements — 0.5.4

- **TypeScript Configuration**: Updated target from ESNext to ES2020 for better compatibility
- **Code Quality**: Improved enum patterns using const assertions for better performance
- **Build Process**: Enhanced JavaScript output compatibility across Node.js versions

### 📦 Package Updates

- **Dependencies**: No dependency changes
- **Breaking Changes**: None - fully backward compatible
- **Migration**: No migration required - automatic compatibility improvement

## [0.5.3] - 2025-06-05

### 🐛 Critical Bug Fixes — 0.5.3

- **🚨 Jira Worklog Description Format Fixed**: Resolved critical bug where worklog creation failed when descriptions were provided
  - **Issue**: Jira API requires worklog comments to be in ADF (Atlassian Document Format) instead of plain strings
  - **Error**: Worklog creation worked without description but failed when description was sent as plain string
  - **Fix**: Updated WorklogRepository to convert string comments to ADF format using existing `textToADF()` function
  - **Impact**: Users can now successfully add worklog entries with descriptions/comments
  - **Location**: `src/features/jira/issues/repositories/worklog.repository.ts`

### 🔧 Technical Details — 0.5.3

- **Root Cause**: Jira worklog API expects comments in ADF format, not plain text strings
- **Solution**: Integrated existing ADF parser to convert string comments to proper ADF document structure
- **ADF Format**: Converts plain text to `{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"..."}]}]}`
- **Backward Compatibility**: Maintains full compatibility - string inputs automatically converted to ADF
- **Methods Updated**: Both `addWorklog()` and `updateWorklog()` now handle ADF conversion

### 🔍 User Impact

- **Before**: Worklog creation failed with descriptions, forcing users to create worklogs without comments
- **After**: Full worklog functionality with rich text descriptions working seamlessly
- **API Consistency**: Worklog comments now properly display in Jira UI as descriptions
- **Developer Experience**: Transparent ADF conversion - developers can still use simple strings

## [0.5.2] - 2025-06-05

### 🐛 Critical Bug Fixes — 0.5.2

- **🚨 Jira Permission Validation Fixed**: Resolved critical bug where MCP-Jira incorrectly reported permission failures
  - **Issue**: Tool was using wrong Jira REST API endpoint `/rest/api/3/user/permission/search` for permission checking
  - **Error**: Users with correct permissions (CREATE_ISSUES, EDIT_ISSUES) were getting false permission denied errors
  - **Fix**: Updated to correct endpoint `/rest/api/3/mypermissions` in ProjectPermissionRepository and ProjectRepository
  - **Impact**: Users can now successfully create and edit Jira issues when they have proper permissions
  - **Verification**: Tested with real Jira instance - permissions now correctly detected as GRANTED
  - **Location**: `src/features/jira/projects/repositories/project-permission.repository.ts`, `src/features/jira/projects/repositories/project.repository.ts`

### 📋 Quality Assurance

- **Build Validation**: All TypeScript compilation errors resolved
- **Linting**: All Biome linting issues fixed
- **Test Coverage**: 824/824 unit tests passing
- **Integration Testing**: 15 integration tests with proper credential validation
- **Real Jira Testing**: Verified fix with live Jira instance (SEC project)

### 🔍 Root Cause Analysis

- **Problem**: Jira Cloud API endpoint mismatch in permission validation
- **Detection**: User reported permission failures despite having correct Jira permissions
- **Solution**: Updated API endpoints to use Jira's standard `/mypermissions` endpoint
- **Prevention**: Added integration tests to catch similar API endpoint issues

## [0.5.1] - 2025-06-05

### 🐛 Critical Bug Fixes — 0.5.1

- **🚨 Jira Projects API Pagination Fixed**: Resolved `projects.map is not a function` error
  - **Issue**: Jira `/project/search` API returns paginated responses with `{values: [...]}` structure
  - **Error**: Code expected direct arrays, causing `projects.map is not a function` when using `jira_get_projects`
  - **Fix**: Updated ProjectRepository to properly extract `values` array from paginated responses
  - **Impact**: Users can now successfully use `jira_get_projects` and `jira_get_projects searchQuery="..."` commands
  - **Location**: `src/features/jira/projects/repositories/project.repository.ts`

### 🔧 Technical Details — 0.5.1

- **Root Cause**: Jira API pagination structure mismatch in projects repository
- **Solution**: Added `PaginatedResponse<T>` and `ProjectSearchResponse` interfaces with proper value extraction
- **Validation**: All 829 tests passing with comprehensive coverage across all domains
- **Testing**: Enhanced mock factories and repository test coverage
- **Compatibility**: Fully backward compatible with no breaking changes

### 📋 Release Process — 0.5.1

- **Type**: Patch release (0.5.0 → 0.5.1)
- **Priority**: High - resolves user-blocking issues
- **Compatibility**: Fully backward compatible
- **Dependencies**: No dependency changes required

## [0.5.0] - 2025-06-05

### 🆕 New Tools — 0.5.0

- **📝 Worklog Management**: Complete worklog functionality for time tracking
  - `jira_add_worklog`: Add time entries to issues with comments and date specification
  - `jira_get_worklogs`: Retrieve worklog entries with date filtering
  - `jira_update_worklog`: Modify existing worklog entries
  - `jira_delete_worklog`: Remove worklog entries
- **👤 User Management**: Enhanced user operations
  - `jira_get_current_user`: Get current authenticated user information

### 🏗️ Architecture Overhaul

- **Modular Design**: Complete code reorganization with domain-driven structure (issues, projects, boards, sprints, users, worklogs)
- **Enhanced HTTP Client**: Rebuilt with dedicated utility classes for improved reliability and maintainability
- **822+ Tests**: Comprehensive test coverage including 95+ new tests for HTTP client utilities

### 🐛 Critical Fixes

- **URL Construction Bug**: Fixed malformed Jira API URLs that prevented proper communication with Jira Cloud
- **Enhanced Error Handling**: Improved error classification with actionable solutions

## [0.4.1] - 2025-06-04

### 🐛 Critical Bug Fixes — 0.4.1

- **🚨 Jira Issue Creation Fixed**: Resolved critical bug preventing Jira issue creation
  - **Issue**: Jira Cloud API now requires `permissions` query parameter for `mypermissions` endpoint
  - **Error**: `JiraApiError: The 'permissions' query parameter is required.`
  - **Fix**: Added `permissions: "CREATE_ISSUES"` parameter to project validation API call
  - **Impact**: Users can now successfully create Jira issues through MCP integration
  - **Location**: `src/features/jira/api/jira.client.impl.ts` - `validateProject` method

### 🔧 Technical Details — 0.4.1

- **Root Cause**: Jira Cloud API policy change requiring explicit permission specification
- **Solution**: Updated `mypermissions` endpoint call to include required `permissions` parameter
- **Validation**: Verified fix with TypeScript compilation and build process
- **Testing**: Confirmed no regression in existing functionality

### 📋 Release Process — 0.4.1

- **Type**: Patch release (0.4.0 → 0.4.1)
- **Priority**: Critical - affects core functionality
- **Compatibility**: Fully backward compatible
- **Dependencies**: No dependency changes required

## [0.4.0] - 2025-06-02

### 🚀 Major Features

- **🆕 Complete Jira Issue Management Suite**: Full CRUD operations for Jira issues

  - `jira_create_issue`: Create new issues with comprehensive field support
  - `jira_update_issue`: Update existing issues with field changes, status transitions, and worklog entries
  - Advanced field support including custom fields, time tracking, and array operations

- **📊 Project & Board Management**: Comprehensive Jira workspace navigation
  - `jira_get_projects`: Browse and discover Jira projects with filtering options
  - `jira_get_boards`: Access Scrum and Kanban boards with advanced filtering
  - `jira_get_sprints`: Sprint management for agile project workflows

### ✨ Enhanced Capabilities

- **🎯 Advanced Issue Creation**:

  - Support for all standard Jira fields (priority, assignee, labels, components, versions)
  - Time tracking integration (estimates, due dates)
  - Custom field support for organization-specific workflows
  - ADF format support for rich descriptions

- **⚡ Powerful Issue Updates**:

  - Field-level updates with validation
  - Array operations (add/remove/set) for labels, components, and versions
  - Status transitions with workflow validation
  - Worklog entries with time tracking
  - Comprehensive error handling and validation

- **🔍 Enhanced Discovery Tools**:
  - Project browsing with metadata (description, lead, issue types)
  - Board filtering by type (Scrum/Kanban), project, and name
  - Sprint management with state filtering (active, closed, future)
  - Pagination support across all discovery tools

### 🏗️ Technical Improvements

- **📋 Comprehensive Test Suite**: 540+ tests covering all new functionality

  - Unit tests for all new handlers and formatters
  - Integration tests for end-to-end workflows
  - Mock factories for reliable testing
  - 100% test pass rate maintained

- **🎨 Rich Formatting System**:

  - Specialized formatters for each tool type
  - Consistent markdown output with action links
  - Error formatting with helpful suggestions
  - Progress indicators and status displays

- **🔧 Enhanced Error Handling**:

  - Detailed error messages with solution suggestions
  - Validation error formatting with field-specific guidance
  - Network error resilience with retry suggestions
  - Permission error handling with clear explanations

- **📚 Code Quality & Architecture**:
  - Biome integration for consistent code formatting
  - Import organization and standardization
  - TypeScript strict mode compliance
  - Modular architecture with clear separation of concerns

### 🛠️ Developer Experience

- **📖 Comprehensive Documentation**: Updated README with all new tools and examples
- **🧪 Testing Infrastructure**: Enhanced test utilities and mock systems
- **⚙️ Build System**: Optimized build process with proper TypeScript compilation
- **🔍 Code Quality**: Automated formatting and linting with Biome

### 🐛 Bug Fixes

- **Import Organization**: Fixed import ordering and standardization across codebase
- **Type Safety**: Resolved TypeScript compilation issues
- **Code Formatting**: Applied consistent formatting standards
- **Test Reliability**: Enhanced test stability and mock accuracy

### 📈 Performance & Reliability

- **Optimized API Calls**: Efficient Jira API usage with proper pagination
- **Memory Management**: Improved resource handling in long-running operations
- **Error Recovery**: Better error handling and recovery mechanisms
- **Validation Performance**: Fast parameter validation with detailed feedback

## [0.3.1] - 2025-06-01

### Added — 0.3.1

- **💬 Jira Issue Comments Retrieval**: New jira_get_issue_comments tool with progressive disclosure parameters, advanced filtering, and rich formatting
- **🎨 Comments Formatting System**: Structured markdown display with ADF parsing and context-aware formatting

### Improved — 0.3.1

- **Test Coverage**: Added 37 comprehensive test cases (230 total tests passing)
- **Code Organization**: New formatters and handlers following existing patterns

### Technical — 0.3.1

- **Progressive Disclosure Pattern**: Successfully implemented and documented for reuse
- **Architectural Consistency**: Maintained consistency with existing tool patterns

## [0.3.0] - 2025-05-28

### Added — 0.3.0

- **🔍 Advanced Issue Search Functionality**

  - New `search_jira_issues` tool with hybrid JQL + helper parameter support
  - Expert mode: Direct JQL query support for advanced users
  - Beginner mode: User-friendly filters (assignedToMe, project, status, text)
  - Flexible search options with configurable result limits (1-50, default: 25)
  - Rich search results formatting with issue previews and navigation links

- **📝 Atlassian Document Format (ADF) Parser**

  - Complete ADF to Markdown conversion for issue descriptions
  - Support for formatted text (bold, italic, code, strikethrough, links)
  - Document structure support (headings, paragraphs, lists, blockquotes, code blocks)
  - Special elements handling (hard breaks, horizontal rules)
  - Backward compatibility with plain text descriptions
  - Text extraction utilities for plain text output

- **🎨 Enhanced Formatting**
  - Card-based issue display with status icons and metadata
  - Description previews with intelligent truncation (100 chars)
  - Improved date formatting and status visualization
  - Action-oriented navigation links between tools

### Improved — 0.3.0

- **Issue Details**: Descriptions now properly display formatted content instead of "[object Object]"
- **Type Safety**: Enhanced TypeScript definitions for ADF structures and search parameters
- **Error Handling**: Better validation and error messages for search parameters
- **Code Organization**: Improved modular architecture with dedicated utils and formatters

### Fixed

- **Description Parsing**: Resolved issue where complex Jira descriptions appeared as "[object Object]"
- **Search Validation**: Proper parameter validation with clear error messages
- **Quote Escaping**: Fixed JQL text search parameter escaping for special characters

### Technical — 0.3.0

- **Comprehensive Test Suite**: 62 unit tests covering ADF parsing, search functionality, and formatting
- **Schema Validation**: Robust Zod schemas for type-safe parameter validation
- **Documentation**: Updated README with new features and usage examples
- **Code Quality**: Maintained 100% TypeScript strict mode compliance

## [0.2.2] - Previous Release

### Features

- Basic Jira issue retrieval
- Assigned issues listing
- Local task creation from Jira issues
- MCP server implementation
