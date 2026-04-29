# 🎯 JIRA MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)
[![JIRA](https://img.shields.io/badge/JIRA-0052CC?style=for-the-badge&logo=jira&logoColor=white)](https://www.atlassian.com/software/jira)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-Model_Context_Protocol-blue?style=for-the-badge)](https://modelcontextprotocol.io)

A powerful Model Context Protocol (MCP) server that brings Atlassian JIRA integration directly to any editor or application that supports MCP.

---

## ✨ Features

- 🎯 **Complete JIRA Integration Suite**

  - **Issue Management**: Full CRUD operations for JIRA issues with comprehensive field support
  - **Workflow & Transitions**: List and apply workflow transitions with status-name or transitionId
  - **Issue Linking**: Link/unlink issues via typed directional links (blocks, duplicates, relates to, etc.)
  - **Comment System**: Retrieve and add comments with progressive disclosure and filtering
  - **Project & Board Discovery**: Browse projects, boards, and sprints with advanced filtering
  - **Smart Search**: JQL and beginner-friendly search with rich formatting

- 👥 **User & Assignment Management** _(New in v0.6.0)_

  - **Search Users**: Find users by name or email across the entire Jira instance
  - **Assignable Users**: List users eligible for a specific issue before assigning
  - **Assign Issues**: Assign any issue by accountId or by fuzzy-matching a display name

- 🏃 **Sprint Management** _(New in v0.6.0)_

  - **Add Issues to Sprint**: Move issues into a sprint by explicit sprintId or active sprint on a board

- 🏗️ **Enterprise-Grade Architecture**

  - **Modular Design**: Feature-based architecture with clear separation of concerns
  - **Robust HTTP Client**: Refactored with dedicated utility classes for reliability
  - **Comprehensive Testing**: 900+ tests ensuring stability and reliability
  - **Type Safety**: Full TypeScript strict mode with enhanced error handling

- 🔍 **Powerful Search & Discovery**

  - Search issues using JQL (JIRA Query Language) or beginner-friendly parameters
  - Project, board, and sprint discovery with metadata and filtering
  - Rich markdown formatting with issue previews and direct navigation links
  - Advanced comment retrieval with author filtering and date ranges

- 📝 **Advanced Issue Management**
  - Create, update, and transition issues with comprehensive field support
  - Time tracking, worklog management, and custom field support
  - ADF (Atlassian Document Format) parsing for rich content display
  - Array operations for labels, components, and versions
  - Custom field discovery via `jira_get_issue_custom_field_metadata`

## 🆕 What's New in v0.6.0

### 🆕 New Tools

- **💬 Comment Authoring**: `jira_add_issue_comment` — post a public comment to any issue
- **🔄 Workflow Transitions**: `jira_get_issue_transitions` + `jira_transition_issue` — inspect and apply workflow transitions by name or ID
- **🔗 Issue Linking**: `jira_get_issue_link_types` + `jira_link_issues` — discover link types and create typed directional links between issues
- **👤 User Management**: `jira_search_users`, `jira_get_assignable_users`, `jira_assign_issue` — full user search and assignment flow
- **🏃 Sprint Membership**: `jira_add_issues_to_sprint` — add issues to an explicit sprint or to the active sprint on a board
- **🔧 Custom Field Discovery**: `jira_get_issue_custom_field_metadata` — inspect custom field schemas before updating issues

### 🧪 Testing & Quality

- **900+ total tests** with expanded coverage for all new tools
- Unit tests for all new handlers, use cases, repositories, validators, and formatters

### 🔧 Technical Details

- All new tools follow the established handler → use-case → repository pattern
- Exhaustive error classification with actionable suggestions in every handler
- Transition matching supports both exact `transitionId` and fuzzy `statusName` matching
- `jira_assign_issue` accepts either `accountId` (direct) or `query` (resolved via `jira_get_assignable_users`)

## 🚀 Quick Start

### Installation

Add this configuration to your MCP client:

```json
{
  "mcpServers": {
    "JIRA Tools": {
      "command": "bunx",
      "args": ["-y", "@waystar/jira-mcp@latest"],
      "env": {
        "JIRA_HOST": "https://your-domain.atlassian.net",
        "JIRA_USERNAME": "your-email@example.com",
        "JIRA_API_TOKEN": "your-jira-api-token"
      }
    }
  }
}
```

### Development Setup

For local development and testing:

```bash
# Clone the repository
git clone https://github.com/WayStarCorp/jira-mcp.git
cd jira-mcp

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your JIRA credentials

# Build the project
bun run build

# Test with MCP Inspector
bun run inspect
```

### Configuration

Create a `.env` file with the following variables:

```ini
JIRA_HOST=https://your-instance.atlassian.net
JIRA_USERNAME=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token-here
```

> **🔑 Important Note About JIRA API Tokens**
>
> - A JIRA API token can be generated at [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
> - Tokens may contain special characters, including the `=` sign
> - Place the token on a single line in the `.env` file
> - Do not add quotes around the token value
> - Paste the token exactly as provided by Atlassian

## 🧰 Available Tools

### Issue Tools

| Tool                                   | Description                                                            | Parameters                    | Returns                            |
| -------------------------------------- | ---------------------------------------------------------------------- | ----------------------------- | ---------------------------------- |
| `jira_get_assigned_issues`             | Retrieves all issues assigned to you                                   | None                          | Markdown-formatted list of issues  |
| `jira_get_issue`                       | Gets detailed information about a specific issue                       | `issueKey`                    | Markdown-formatted issue details   |
| `jira_create_issue`                    | Create new JIRA issues with comprehensive field support                | See issue creation parameters | Markdown-formatted creation result |
| `jira_update_issue`                    | Update existing issues with fields, status, worklog, and custom fields | See issue update parameters   | Markdown-formatted update result   |
| `jira_get_issue_custom_field_metadata` | Inspect custom field ids, types, and allowed values for an issue       | `issueKey`                    | Markdown-formatted field list      |
| `search_jira_issues`                   | Search JIRA issues with JQL or helper parameters                       | See search parameters below   | Markdown-formatted search results  |

### Comments

| Tool                      | Description                                                | Parameters                   | Returns                     |
| ------------------------- | ---------------------------------------------------------- | ---------------------------- | --------------------------- |
| `jira_get_issue_comments` | Retrieve comments with configurable quantity and filtering | See comment parameters below | Markdown-formatted comments |
| `jira_add_issue_comment`  | Add a public comment to a JIRA issue (max 32 767 chars)    | `issueKey`, `comment`        | Confirmation with comment   |

### Workflow & Transitions

| Tool                         | Description                                                       | Parameters                      | Returns                              |
| ---------------------------- | ----------------------------------------------------------------- | ------------------------------- | ------------------------------------ |
| `jira_get_issue_transitions` | List available workflow transitions for an issue                  | `issueKey`                      | Markdown list of transitions + IDs   |
| `jira_transition_issue`      | Apply a workflow transition by `transitionId` **or** `statusName` | See transition parameters below | Markdown-formatted transition result |

### Issue Links

| Tool                        | Description                                                  | Parameters                | Returns                        |
| --------------------------- | ------------------------------------------------------------ | ------------------------- | ------------------------------ |
| `jira_get_issue_link_types` | List all available link types with inward/outward directions | None                      | Markdown list of link types    |
| `jira_link_issues`          | Create a typed directional link between two issues           | See link parameters below | Markdown-formatted link result |

### Users & Assignment

| Tool                        | Description                                                  | Parameters                          | Returns                          |
| --------------------------- | ------------------------------------------------------------ | ----------------------------------- | -------------------------------- |
| `jira_get_current_user`     | Get current authenticated user information                   | None                                | Markdown-formatted user details  |
| `jira_search_users`         | Search Jira users by name or email                           | `query`, `maxResults`               | Markdown-formatted user list     |
| `jira_get_assignable_users` | List users eligible for assignment to a specific issue       | `issueKey`, `query?`, `maxResults?` | Markdown-formatted user list     |
| `jira_assign_issue`         | Assign an issue to a user (by `accountId` **or** by `query`) | See assign parameters below         | Markdown-formatted update result |

### Projects & Boards

| Tool                | Description                                              | Parameters             | Returns                         |
| ------------------- | -------------------------------------------------------- | ---------------------- | ------------------------------- |
| `jira_get_projects` | Retrieve and browse JIRA projects with filtering options | See project parameters | Markdown-formatted project list |
| `jira_get_boards`   | Get JIRA boards (Scrum/Kanban) with advanced filtering   | See board parameters   | Markdown-formatted board list   |

### Sprints

| Tool                        | Description                                                                                        | Parameters                      | Returns                        |
| --------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------ |
| `jira_get_sprints`          | Retrieve sprint information for a board, or from accessible Scrum boards when `boardId` is omitted | See sprint parameters           | Markdown-formatted sprint list |
| `jira_add_issues_to_sprint` | Add one or more issues to a sprint (by `sprintId` **or** active sprint via `boardId`)              | See sprint-add parameters below | Markdown-formatted result      |

### Time Tracking

| Tool                  | Description                                             | Parameters                   | Returns                            |
| --------------------- | ------------------------------------------------------- | ---------------------------- | ---------------------------------- |
| `jira_add_worklog`    | Add time tracking entries to issues                     | See worklog parameters below | Markdown-formatted worklog result  |
| `jira_get_worklogs`   | Retrieve worklog entries for issues with date filtering | See worklog parameters below | Markdown-formatted worklog list    |
| `jira_update_worklog` | Update existing worklog entries                         | See worklog parameters below | Markdown-formatted update result   |
| `jira_delete_worklog` | Delete worklog entries from issues                      | See worklog parameters below | Markdown-formatted deletion result |

#### Issue Creation Parameters

The `jira_create_issue` tool supports comprehensive issue creation:

**Required**:

- `projectKey`: String - Project key (e.g., `"PROJ"`)
- `summary`: String - Issue title/summary

**Optional Fields**:

- `issueType`: String - Issue type (default `"Task"`; e.g., `"Task"`, `"Bug"`, `"Story"`)
- `description`: String - Detailed description (supports ADF format)
- `priority`: String - Priority level (`"Highest"`, `"High"`, `"Medium"`, `"Low"`, `"Lowest"`)
- `assignee`: String - Assignee username or email
- `reporter`: String - Reporter username or email
- `labels`: Array - Labels to apply to the issue
- `components`: Array - Component names
- `fixVersions`: Array - Fix version names
- `affectsVersions`: Array - Affected version names
- `timeEstimate`: String - Time estimate in JIRA format (e.g., `"2h"`, `"1d 4h"`)
- `dueDate`: String - Due date in ISO format
- `environment`: String - Environment description
- `customFields`: Object - Custom field values

**Examples**:

```text
# Basic issue creation
jira_create_issue projectKey:"PROJ" issueType:"Task" summary:"Fix login bug"

# Comprehensive issue with all fields
jira_create_issue projectKey:"PROJ" issueType:"Bug" summary:"Critical login issue" description:"Users cannot log in" priority:"High" assignee:"john.doe" labels:["urgent","security"] timeEstimate:"4h"
```

#### Issue Update Parameters

The `jira_update_issue` tool supports comprehensive issue updates:

**Required**:

- `issueKey`: String - Issue key (e.g., `"PROJ-123"`)

**Field Updates** (any combination):

- `summary`: String - Update issue title
- `description`: String - Update description
- `priority`: String - Change priority
- `assignee`: String - Reassign issue
- `reporter`: String - Change reporter
- `timeEstimate`: String - Update time estimate
- `timeSpent`: String - Log time spent
- `dueDate`: String - Update due date
- `environment`: String - Update environment

**Array Operations** (add/remove/set):

- `labels`: Object - Modify labels (`{operation: "add|remove|set", values: ["label1", "label2"]}`)
- `components`: Object - Modify components
- `fixVersions`: Object - Modify fix versions
- `affectsVersions`: Object - Modify affected versions

**Status Transitions**:

- `status`: String - Transition to new status (e.g., `"In Progress"`, `"Done"`)

**Worklog**:

- `worklog`: Object - Add work log entry (`{timeSpent: "2h", comment: "Fixed issue"}`)

**Examples**:

```text
# Update basic fields
jira_update_issue issueKey:"PROJ-123" summary:"Updated title" priority:"High"

# Add labels and transition status
jira_update_issue issueKey:"PROJ-123" labels:'{operation:"add",values:["urgent"]}' status:"In Progress"

# Log work and add comment
jira_update_issue issueKey:"PROJ-123" worklog:'{timeSpent:"2h",comment:"Completed testing"}'
```

#### Project Parameters

The `jira_get_projects` tool supports project discovery:

**Optional Parameters**:

- `maxResults`: Number (1-100, default: 50) - Limit number of results
- `startAt`: Number (default: 0) - Pagination offset
- `expand`: Array - Additional fields to include (`["description", "lead", "issueTypes", "url", "projectKeys"]`)

**Examples**:

```text
# Get all projects
jira_get_projects

# Get projects with additional details
jira_get_projects expand:["description","lead","issueTypes"] maxResults:20
```

#### Board Parameters

The `jira_get_boards` tool supports board management:

**Optional Parameters**:

- `maxResults`: Number (1-100, default: 50) - Limit number of results
- `startAt`: Number (default: 0) - Pagination offset
- `type`: String - Board type (`"scrum"`, `"kanban"`)
- `name`: String - Filter by board name
- `projectKeyOrId`: String - Filter by project

**Examples**:

```text
# Get all boards
jira_get_boards

# Get Scrum boards for specific project
jira_get_boards type:"scrum" projectKeyOrId:"PROJ"

# Search boards by name
jira_get_boards name:"Sprint Board" maxResults:10
```

#### Sprint Parameters

The `jira_get_sprints` tool supports sprint management:

**Required**:

- `boardId`: Number - Board ID to get sprints from

**Optional Parameters**:

- `maxResults`: Number (1-100, default: 50) - Limit number of results
- `startAt`: Number (default: 0) - Pagination offset
- `state`: String - Sprint state (`"active"`, `"closed"`, `"future"`)

**Examples**:

```text
# Get all sprints for a board
jira_get_sprints boardId:123

# Get only active sprints
jira_get_sprints boardId:123 state:"active"

# Get sprints with pagination
jira_get_sprints boardId:123 maxResults:10 startAt:20
```

#### Worklog Parameters

The worklog tools support comprehensive time tracking:

**`jira_add_worklog` Parameters**:

**Required**:

- `issueKey`: String - Issue key (e.g., `"PROJ-123"`)
- `timeSpent`: String - Time spent in JIRA format (e.g., `"2h"`, `"1d 4h"`, `"30m"`)

**Optional**:

- `comment`: String - Comment describing the work done
- `started`: String - When work started (ISO date format, defaults to now)
- `visibility`: Object - Visibility settings (`{type: "group", value: "jira-developers"}`)

**`jira_get_worklogs` Parameters**:

**Required**:

- `issueKey`: String - Issue key (e.g., `"PROJ-123"`)

**Optional**:

- `startedAfter`: String - Filter worklogs started after this date (ISO format)
- `startedBefore`: String - Filter worklogs started before this date (ISO format)

**`jira_update_worklog` Parameters**:

**Required**:

- `issueKey`: String - Issue key (e.g., `"PROJ-123"`)
- `worklogId`: String - Worklog ID to update

**Optional** (any combination):

- `timeSpent`: String - Update time spent
- `comment`: String - Update comment
- `started`: String - Update start time

**`jira_delete_worklog` Parameters**:

**Required**:

- `issueKey`: String - Issue key (e.g., `"PROJ-123"`)
- `worklogId`: String - Worklog ID to delete

**Examples**:

```text
# Add worklog entry
jira_add_worklog issueKey:"PROJ-123" timeSpent:"2h" comment:"Fixed authentication bug"

# Get all worklogs for an issue
jira_get_worklogs issueKey:"PROJ-123"

# Get worklogs from last week
jira_get_worklogs issueKey:"PROJ-123" startedAfter:"2025-05-29T00:00:00.000Z"

# Update worklog
jira_update_worklog issueKey:"PROJ-123" worklogId:"12345" timeSpent:"3h" comment:"Updated work description"

# Delete worklog
jira_delete_worklog issueKey:"PROJ-123" worklogId:"12345"
```

#### Comment Parameters

The `jira_get_issue_comments` tool supports progressive disclosure with these parameters:

**Required**:

- `issueKey`: String - Issue key (e.g., `"PROJ-123"`)

**Basic Options**:

- `maxComments`: Number (1-100, default: 10) - Maximum number of comments to retrieve
- `orderBy`: String (`"created"` or `"updated"`, default: `"created"`) - Sort order for comments

**Advanced Options**:

- `includeInternal`: Boolean (default: false) - Include internal/restricted comments
- `authorFilter`: String - Filter comments by author name or email
- `dateRange`: Object - Filter by date range:
  - `from`: String (ISO date) - Start date
  - `to`: String (ISO date) - End date

**Examples**:

```text
# Basic usage - get 10 most recent comments
jira_get_issue_comments PROJ-123

# Get more comments with specific ordering
jira_get_issue_comments PROJ-123 maxComments:25 orderBy:"updated"

# Advanced filtering
jira_get_issue_comments PROJ-123 authorFilter:"john.doe" includeInternal:true
```

#### Add Comment Parameters

The `jira_add_issue_comment` tool adds a **public** comment to an issue:

**Required**:

- `issueKey`: String - Issue key (e.g., `"PROJ-123"`)
- `comment`: String (1–32 767 chars) - Comment body (plain text; ADF conversion is handled automatically)

**Examples**:

```text
# Add a comment to an issue
jira_add_issue_comment issueKey:"PROJ-123" comment:"Fixed in commit abc1234, deploying to staging."
```

#### Transition Parameters

The `jira_get_issue_transitions` tool lists available transitions:

**Required**:

- `issueKey`: String - Issue key (e.g., `"PROJ-123"`)

**Examples**:

```text
# List available transitions for an issue
jira_get_issue_transitions issueKey:"PROJ-123"
```

The `jira_transition_issue` tool applies a workflow transition:

**Required**:

- `issueKey`: String - Issue key (e.g., `"PROJ-123"`)
- Exactly **one** of:
  - `transitionId`: String - Transition ID from `jira_get_issue_transitions`
  - `statusName`: String - Target status name (e.g., `"In Progress"`, `"Done"`)

**Optional**:

- `fields`: Object - Additional fields required by the transition screen

**Examples**:

```text
# Transition by status name
jira_transition_issue issueKey:"PROJ-123" statusName:"In Progress"

# Transition by explicit ID (more reliable when names overlap)
jira_transition_issue issueKey:"PROJ-123" transitionId:"21"
```

#### Issue Link Parameters

The `jira_get_issue_link_types` tool takes no parameters and returns all link types with their `name`, `inward`, and `outward` descriptions.

The `jira_link_issues` tool creates a directional link between two issues:

**Required**:

- `inwardIssueKey`: String - Issue on the receiving end of the link
- `outwardIssueKey`: String - Issue initiating the link
- `linkTypeName`: String - Name from `jira_get_issue_link_types` (e.g., `"Blocks"`, `"Relates to"`, `"Duplicates"`)

**Optional**:

- `comment`: String (max 32 767 chars) - Comment to add alongside the link

**Examples**:

```text
# Discover available link types first
jira_get_issue_link_types

# Link two issues (PROJ-456 blocks PROJ-123)
jira_link_issues inwardIssueKey:"PROJ-123" outwardIssueKey:"PROJ-456" linkTypeName:"Blocks"

# Link with a comment
jira_link_issues inwardIssueKey:"PROJ-123" outwardIssueKey:"PROJ-789" linkTypeName:"Relates to" comment:"Tracking in separate epic"
```

#### User & Assignment Parameters

The `jira_search_users` tool searches all Jira users:

**Required**:

- `query`: String - Name or email fragment to search

**Optional**:

- `maxResults`: Number (1–50, default: 20) - Maximum number of results

**Examples**:

```text
# Search for a user
jira_search_users query:"alice"

# Search with limit
jira_search_users query:"smith" maxResults:5
```

The `jira_get_assignable_users` tool lists users eligible for assignment to a specific issue:

**Required**:

- `issueKey`: String - Issue key (e.g., `"PROJ-123"`)

**Optional**:

- `query`: String - Filter by name/email
- `maxResults`: Number (1–50, default: 20)

**Examples**:

```text
# All assignable users for an issue
jira_get_assignable_users issueKey:"PROJ-123"

# Filtered list
jira_get_assignable_users issueKey:"PROJ-123" query:"alice"
```

The `jira_assign_issue` tool assigns an issue. Provide **exactly one** of `accountId` or `query`:

**Required**:

- `issueKey`: String - Issue key (e.g., `"PROJ-123"`)
- Exactly **one** of:
  - `accountId`: String - Exact Jira account ID (from `jira_get_assignable_users`)
  - `query`: String - Name/email fragment (must resolve to exactly one assignable user)

**Examples**:

```text
# Assign by display name (must match exactly one user)
jira_assign_issue issueKey:"PROJ-123" query:"alice"

# Assign by accountId
jira_assign_issue issueKey:"PROJ-123" accountId:"5b109f2e9729b51b54dc274d"
```

#### Add Issues to Sprint Parameters

The `jira_add_issues_to_sprint` tool moves issues into a sprint. Provide **exactly one** of `sprintId` or `boardId`:

**Required**:

- `issueKeys`: Array of Strings - Issue keys to add (e.g., `["PROJ-123", "PROJ-124"]`)
- Exactly **one** of:
  - `sprintId`: Number - Explicit sprint ID (from `jira_get_sprints`)
  - `boardId`: Number - Board ID — uses the board's current **active** sprint

**Examples**:

```text
# Add to an explicit sprint
jira_add_issues_to_sprint issueKeys:["PROJ-123"] sprintId:42

# Add to the active sprint on a board
jira_add_issues_to_sprint issueKeys:["PROJ-123","PROJ-124"] boardId:7
```

#### Search Parameters

The `search_jira_issues` tool supports two modes:

**Expert Mode (JQL)**:

- `jql`: Direct JQL query string (e.g., `"project = PROJ AND status = Open"`)

**Beginner Mode (Helper Parameters)**:

- `assignedToMe`: Boolean - Show only issues assigned to current user
- `project`: String - Filter by project key
- `status`: String or Array - Filter by status(es) (e.g., `"Open"` or `["Open", "In Progress"]`)
- `text`: String - Search in summary and description fields

**Common Options**:

- `maxResults`: Number (1-50, default: 25) - Limit number of results
- `fields`: Array - Specify which fields to retrieve (optional)

## 🛠️ Development Tools

### Code Quality Tools

The project uses [Biome](https://biomejs.dev/) for code formatting and linting, providing:

- Fast, unified formatting and linting
- TypeScript-first tooling
- Zero configuration needed
- Consistent code style enforcement

```bash
# Format code
bun run format

# Check code for issues
bun run check

# Type check
bun run typecheck

# Run tests
bun test
```

### MCP Inspector

The MCP Inspector is a powerful tool for testing and debugging your MCP server.

```bash
# Run the inspector (no separate build step needed)
bun run inspect
```

The inspector automatically:

- Loads environment variables from `.env`
- Cleans up occupied ports (5175, 3002)
- Builds the project when needed
- Starts the MCP server with your configuration
- Launches the inspector UI

Visit the inspector at <http://localhost:5175?proxyPort=3002>

If you encounter port conflicts:

```bash
bun run cleanup-ports
```

#### Debugging with the Inspector

The inspector UI allows you to:

- View all available MCP capabilities
- Execute tools and examine responses
- Analyze the JSON communication
- Test with different parameters

For more details, see the [MCP Inspector GitHub repository](https://github.com/modelcontextprotocol/inspector).

### Integration with Claude Desktop

Test your MCP server directly with Claude:

1. Build:

   ```bash
   bun run build  # You must build the project before running it
   ```

2. Configure Claude Desktop:

   ```bash
   nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

3. Add the MCP configuration:

   ```json
   {
     "mcpServers": {
       "JIRA Tools": {
         "command": "node",
         "args": ["/absolute/path/to/your/project/dist/index.js"],
         "env": {
           "JIRA_USERNAME": "your-jira-username",
           "JIRA_API_TOKEN": "your-jira-api-token",
           "JIRA_HOST": "your-jira-host.atlassian.net"
         }
       }
     }
   }
   ```

4. Restart Claude Desktop and test with:

   ```text
   Show me my assigned JIRA issues.
   ```

## 🔌 Integration with Cursor IDE

> **⚠️ Important:** You must build the project with `bun run build` before integrating with Cursor IDE or Claude Desktop.

Add this MCP server to your Cursor IDE's MCP configuration:

```json
{
  "mcpServers": {
    "JIRA Tools": {
      "command": "node",
      "args": ["/absolute/path/to/your/project/dist/index.js"],
      "env": {
        "JIRA_USERNAME": "your-jira-username",
        "JIRA_API_TOKEN": "your-jira-api-token",
        "JIRA_HOST": "your-jira-host.atlassian.net"
      }
    }
  }
}
```

## 📁 Project Structure

```text
src/
├── core/                        # Core functionality and configurations
│   ├── errors/                 # Error handling utilities
│   ├── logging/                # Logging infrastructure
│   ├── responses/              # Response formatting
│   ├── server/                 # MCP server implementation
│   ├── tools/                  # Base tool interfaces
│   └── utils/                  # Core utilities
├── features/                    # Feature implementations
│   └── jira/                   # JIRA integration (domain-driven)
│       ├── boards/             # Board management
│       ├── client/             # HTTP client & API layer
│       │   ├── config/
│       │   ├── errors/
│       │   ├── http/           # HTTP client with URL builder & response handler
│       │   └── responses/
│       ├── issues/             # Issue management
│       │   ├── formatters/     # Markdown formatters (comment, link, transition…)
│       │   ├── handlers/       # MCP tool handlers
│       │   ├── models/         # TypeScript interfaces & types
│       │   ├── repositories/   # JIRA API calls
│       │   ├── use-cases/      # Business logic
│       │   └── validators/     # Zod schemas & validators
│       ├── projects/           # Project management
│       ├── shared/             # Shared utilities
│       │   ├── formatters/
│       │   ├── parsers/        # ADF → Markdown parser
│       │   └── validators/
│       ├── sprints/            # Sprint management
│       ├── tools/              # Tool configs, factories & registry
│       │   ├── configs/        # Per-domain tool configs
│       │   ├── factories/      # DI factory
│       │   └── registry/       # Tool registration
│       └── users/              # User management (search, assign)
└── test/                        # Test utilities
    ├── helpers/                 # Test helper factories
    ├── integration/             # Integration tests
    ├── mocks/                   # Mock factories (issues, boards, users…)
    └── unit/                    # Unit tests mirroring src/ structure
```

### NPM Scripts

| Command             | Description                                        |
| ------------------- | -------------------------------------------------- |
| `bun dev`           | Run the server in development mode with hot reload |
| `bun build`         | Build the project for production                   |
| `bun start`         | Start the production server                        |
| `bun format`        | Format code using Biome                            |
| `bun lint`          | Lint code using Biome                              |
| `bun check`         | Run Biome checks on code                           |
| `bun typecheck`     | Run TypeScript type checking                       |
| `bun test`          | Run tests                                          |
| `bun inspect`       | Start the MCP Inspector for debugging              |
| `bun cleanup-ports` | Clean up ports used by the development server      |

## 📝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Development workflow
- Branching strategy
- Commit message format
- Pull request process
- Code style guidelines

## 📘 Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://spec.modelcontextprotocol.io/specification/)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
- [JIRA REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v2/)

## 📄 License

[MIT](LICENSE)

Original project © Stanislav Stepanenko.
Fork changes © 2026 @romualdy.

---

Built with ❤️ for a better developer experience
