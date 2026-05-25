# Attachments & Images (v0.7.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать агенту список вложений, скачивание image/text через MCP, inline ADF media в issue/comments — по [design spec](../specs/2026-05-25-attachments-design.md).

**Architecture:** Домен `attachments/` (как `sprints/`), binary через `downloadBinary` на `JiraHttpClient`, passthrough `McpResponse.content` в adapter. Metadata вложений — через существующий `IssueRepository`. Spike на реальной задаче — до prod-кода.

**Tech Stack:** TypeScript, Bun test, Biome, MCP SDK, Jira REST API v3.

**Spec:** `docs/superpowers/specs/2026-05-25-attachments-design.md`

---

## File map (создать / изменить)

| Area               | Create                                                                       | Modify                                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Spike doc          | `docs/superpowers/spikes/2026-05-25-attachments-spike.md`                    | spec (id-bridge, hosts)                                                                                                   |
| Core               | —                                                                            | `mcp-response.types.ts`, `mcp-response.util.ts`, `mcp-adapter.util.ts`, `index.ts`                                        |
| Errors             | `attachment-too-large.error.ts`                                              | `core/errors/index.ts`                                                                                                    |
| HTTP               | —                                                                            | `jira.http.types.ts`, `jira.http-client.impl.ts`, unit test                                                               |
| ADF                | —                                                                            | `adf.parser.ts`, `adf.parser.test.ts`                                                                                     |
| Attachments domain | `attachments/**` (models, repo, formatters, use-cases, handlers, validators) | `attachments/index.ts`                                                                                                    |
| Issues integration | `inline-media.formatter.ts` (или в `attachments/formatters/`)                | `issue.formatter.ts`, `issue-description.formatter.ts`, `comments.formatter.ts`, `get-issue-comments.use-case.ts`, models |
| Tools              | `attachment-tools.config.ts`                                                 | `tool.factory.ts`, `dependency.factory.ts`, `jira-tools.interface.ts`, `tool.registry.ts`, `configs/index.ts`             |
| Tests              | unit + integration under `src/test/`                                         | —                                                                                                                         |
| Release            | —                                                                            | `package.json`, `CHANGELOG.md`, `README.md`                                                                               |

---

### Task 0: Pre-implementation spike (SUPP-79)

**Files:**

- Create: `docs/superpowers/spikes/2026-05-25-attachments-spike.md`
- Modify (if findings differ): `docs/superpowers/specs/2026-05-25-attachments-design.md` (ADF Media Resolution, Open Questions → allowed hosts)

- [ ] **Step 1: Получить issue payload**

Через настроенный Jira (`JIRA_HOST`, `JIRA_USERNAME`, `JIRA_API_TOKEN`) или MCP `jira_get_issue` / raw API:

```bash
# Пример (подставить host и key)
curl -s -u "$JIRA_USERNAME:$JIRA_API_TOKEN" \
  "$JIRA_HOST/rest/api/3/issue/SUPP-79" \
  | bun -e "const j=JSON.parse(await Bun.stdin.text()); console.log(JSON.stringify({attachments:j.fields?.attachment, description:j.fields?.description}, null, 2))"
```

- [ ] **Step 2: Зафиксировать сравнение media id ↔ attachment id**

В spike-doc записать:

- каждый `media.attrs.id` из description/comments;
- каждый `fields.attachment[].id`;
- совпадают ли (id-bridge: yes/no/partial).

- [ ] **Step 3: Проверить attachment metadata + content URL**

Для одного `attachmentId` из списка:

```bash
curl -s -u "$JIRA_USERNAME:$JIRA_API_TOKEN" \
  "$JIRA_HOST/rest/api/3/attachment/{id}"
```

Записать: `content` URL, scheme, host (совпадает с `JIRA_HOST` или CDN).

- [ ] **Step 4: Обновить spec при необходимости**

Если `contentUrl` host ≠ `JIRA_HOST` — в spec явно добавить host в allowlist (раздел HTTP Client / Open Questions). Если id-bridge не совпадает — оставить conditional enrichment (уже в spec).

- [ ] **Step 5: Commit spike doc only**

```bash
git add docs/superpowers/spikes/2026-05-25-attachments-spike.md docs/superpowers/specs/2026-05-25-attachments-design.md
git commit -m "docs/superpowers/spikes/2026-05-25-attachments-spike.md: Jira attachment ADF spike findings"
```

---

### Task 1: `McpResponse.content` + adapter passthrough

**Files:**

- Modify: `src/core/responses/mcp-response.types.ts`
- Modify: `src/core/responses/mcp-response.util.ts`
- Modify: `src/core/responses/mcp-adapter.util.ts`
- Create: `src/test/unit/core/responses/mcp-adapter.util.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, test } from "bun:test";
import { adaptToMcpContent } from "@core/responses/mcp-adapter.util";
import { createSuccessResponse } from "@core/responses/mcp-response.util";
import type { ImageContent } from "@core/responses/mcp-content.types";

describe("adaptToMcpContent", () => {
  test("passthrough when response.content is set", () => {
    const image: ImageContent = {
      type: "image",
      data: "aGVsbG8=",
      mimeType: "image/png",
    };
    const response = createSuccessResponse("ignored", {
      content: [image],
    });
    const result = adaptToMcpContent(response);
    expect(result.content).toEqual([image]);
    expect(result.content[0].type).toBe("image");
  });

  test("legacy text path when content absent", () => {
    const result = adaptToMcpContent(createSuccessResponse("hello"));
    expect(result.content).toEqual([{ type: "text", text: "hello" }]);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `bun test src/test/unit/core/responses/mcp-adapter.util.test.ts`
Expected: FAIL (overload/signature or passthrough missing)

- [ ] **Step 3: Implement**

`mcp-response.types.ts`:

```typescript
import type { Content } from "./mcp-content.types";

export interface McpResponse<T = unknown> {
  success: boolean;
  error?: string;
  errorCode?: string;
  data?: T;
  content?: Content[];
}
```

`mcp-response.util.ts` — optional second arg or options bag:

```typescript
export function createSuccessResponse<T = unknown>(
  data: T,
  extras?: Pick<McpResponse<T>, "content">,
): McpResponse<T> {
  return { success: true, data, ...extras };
}
```

`mcp-adapter.util.ts`:

```typescript
export function adaptToMcpContent(response: McpResponse): McpContentResponse {
  if (response.content?.length) {
    return {
      content: response.content,
      isError: !response.success,
      errorCode: response.errorCode,
    };
  }
  // existing text branch unchanged
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `bun test src/test/unit/core/responses/mcp-adapter.util.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/core/responses/ src/test/unit/core/responses/mcp-adapter.util.test.ts
git commit -m "src/core/responses/: McpResponse.content passthrough in adaptToMcpContent"
```

---

### Task 2: `AttachmentMetadata` models + `AttachmentTooLargeError`

**Files:**

- Create: `src/features/jira/attachments/models/attachment.models.ts`
- Create: `src/core/errors/attachment-too-large.error.ts`
- Create: `src/test/unit/core/errors/attachment-too-large.error.test.ts`
- Modify: `src/core/errors/index.ts`

- [ ] **Step 1: Write failing error test**

```typescript
import { describe, expect, test } from "bun:test";
import { AttachmentTooLargeError } from "@core/errors/attachment-too-large.error";

describe("AttachmentTooLargeError", () => {
  test("message includes byte limit", () => {
    const err = new AttachmentTooLargeError(50 * 1024 * 1024);
    expect(err.message).toContain("52428800");
  });
});
```

- [ ] **Step 2: Run — FAIL**

`bun test src/test/unit/core/errors/attachment-too-large.error.test.ts`

- [ ] **Step 3: Implement models + error**

```typescript
// attachment.models.ts
export interface AttachmentMetadata {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  created: string;
  author: string;
  contentUrl: string;
  isImage: boolean;
}

export function mapJiraAttachment(raw: {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  created: string;
  author?: { displayName?: string };
  content: string;
}): AttachmentMetadata {
  return {
    id: String(raw.id),
    filename: raw.filename,
    mimeType: raw.mimeType,
    size: raw.size,
    created: raw.created,
    author: raw.author?.displayName ?? "Unknown",
    contentUrl: raw.content,
    isImage: raw.mimeType.startsWith("image/"),
  };
}
```

```typescript
// attachment-too-large.error.ts
export class AttachmentTooLargeError extends Error {
  constructor(public readonly maxBytes: number) {
    super(
      `File exceeds maxBytes limit (${maxBytes} bytes). Pass a larger maxBytes up to the hard maximum.`,
    );
    this.name = "AttachmentTooLargeError";
  }
}
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/features/jira/attachments/models/ src/core/errors/attachment-too-large.error.ts src/test/unit/core/errors/
git commit -m "src/features/jira/attachments/models/attachment.models.ts: AttachmentMetadata + TooLarge error"
```

---

### Task 3: `downloadBinary` on HTTP client

**Files:**

- Modify: `src/features/jira/client/http/jira.http.types.ts`
- Modify: `src/features/jira/client/http/jira.http-client.impl.ts`
- Create: `src/features/jira/client/http/attachment-url.validator.ts` (host allowlist)
- Create: `src/test/unit/features/jira/client/http/jira.http-client.download-binary.test.ts`

**Constants:** `DEFAULT_MAX_BYTES = 10 * 1024 * 1024`, `HARD_MAX_BYTES = 50 * 1024 * 1024`

- [ ] **Step 1: Write failing tests** (forbidden host, Content-Length over limit, success buffer)

Mock `fetch` or use stub URL on same host as config.

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement `downloadBinary`**

- Validate URL: HTTPS, host in allowlist (`JIRA_HOST` origin + spike hosts)
- Reject redirects to other origins
- `Content-Length` check before body read
- Stream read with running byte count cap
- Auth headers from `JiraRequestBuilder`, never logged

- [ ] **Step 4: Run — PASS**

`bun test src/test/unit/features/jira/client/http/jira.http-client.download-binary.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/features/jira/client/http/
git commit -m "src/features/jira/client/http/jira.http-client.impl.ts: downloadBinary with SSRF limits"
```

---

### Task 4: `attachment.repository`

**Files:**

- Create: `src/features/jira/attachments/repositories/attachment.repository.ts`
- Create: `src/test/integration/attachment-repository.integration.test.ts`

- [ ] **Step 1: Integration test skeleton** (skip without credentials — pattern from `issue-operations.integration.test.ts`)

- [ ] **Step 2: Implement repository**

```typescript
export class AttachmentRepositoryImpl {
  constructor(private readonly httpClient: HttpClient) {}

  async getMetadata(attachmentId: string): Promise<AttachmentMetadata> {
    const raw = await this.httpClient.sendRequest<JiraAttachmentDto>({
      endpoint: `/attachment/${attachmentId}`,
      method: "GET",
    });
    return mapJiraAttachment(raw);
  }

  async downloadContent(
    metadata: AttachmentMetadata,
    maxBytes: number,
  ): Promise<ArrayBuffer> {
    return this.httpClient.downloadBinary(metadata.contentUrl, maxBytes);
  }
}
```

- [ ] **Step 3: Run integration tests** (with creds) or unit with mock `HttpClient`

- [ ] **Step 4: Commit**

---

### Task 5: `parseADFWithMedia`

**Files:**

- Modify: `src/features/jira/shared/parsers/adf.parser.ts`
- Modify: `src/test/unit/features/jira/shared/parsers/adf.parser.test.ts`

- [ ] **Step 1: Add failing tests** for `mediaSingle` / `media` / `mediaGroup`; assert `parseADF()` unchanged for existing cases

```typescript
import { parseADF, parseADFWithMedia } from "@features/jira/shared/parsers/adf.parser";

test("parseADF unchanged for doc without media", () => {
  const adf = { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }] };
  expect(parseADF(adf)).toBe(parseADFWithMedia(adf).markdown);
});

test("parseADFWithMedia collects media ids", () => {
  const adf = {
    type: "doc",
    version: 1,
    content: [{
      type: "mediaSingle",
      content: [{ type: "media", attrs: { id: "abc-123", type: "file" } }],
    }],
  };
  const result = parseADFWithMedia(adf);
  expect(result.media).toEqual([{ mediaId: "abc-123", type: "file" }]);
  expect(result.markdown).toContain("[media: abc-123]");
});
```

- [ ] **Step 2–4: Implement, run, commit**

```bash
git commit -m "src/features/jira/shared/parsers/adf.parser.ts: parseADFWithMedia for inline media"
```

---

### Task 6: Formatters (list + inline media)

**Files:**

- Create: `src/features/jira/attachments/formatters/attachment.formatter.ts`
- Create: `src/features/jira/attachments/formatters/inline-media.formatter.ts`
- Create: `src/test/unit/features/jira/attachments/formatters/attachment.formatter.test.ts`
- Create: `src/test/unit/features/jira/attachments/formatters/inline-media.formatter.test.ts`

- [ ] **TDD:** empty list message, isImage lines, resolved vs unresolved inline (use spike id-bridge flag)

- [ ] **Commit**

---

### Task 7: `jira_get_issue_attachments` tool chain

**Files:**

- Create: `get-issue-attachments.use-case.ts`, `get-issue-attachments.handler.ts`, validator schema
- Reuse `IssueRepository.getIssue` — extract `fields.attachment`

- [ ] **Handler returns markdown string** via `AttachmentFormatter`

- [ ] **Unit test handler** with mocked use case

- [ ] **Commit**

---

### Task 8: `jira_download_attachment` tool chain

**Files:**

- Create: `download-attachment.use-case.ts`, `download-attachment.handler.ts`
- Modify: handler may override `formatResult` OR return object consumed by use case → `createSuccessResponse("", { content: [image] })`

**Logic:**

- Clamp `maxBytes` to hard max
- image/* → base64 `ImageContent`
- text/*, application/json → decode UTF-8 (charset from header if present)
- else → metadata-only `TextContent` string

- [ ] **Unit test:** image path produces `content[0].type === "image"`, not JSON in text

- [ ] **Commit**

---

### Task 9: Integrate `jira_get_issue`

**Files:**

- Modify: `src/features/jira/issues/formatters/issue.formatter.ts`
- Modify: `src/features/jira/issues/formatters/issue-description.formatter.ts`

- [ ] **Append `## Attachments (N)`** when `fields.attachment.length > 0`
- [ ] **Inline media block** after description when `parseADFWithMedia` finds media
- [ ] **Tests** in existing `get-issue.handler.test.ts` / formatter tests

- [ ] **Commit**

---

### Task 10: Integrate `jira_get_issue_comments`

**Files:**

- Modify: `get-issue-comments.use-case.ts` → `CommentsWithAttachments`
- Modify: `comments.formatter.ts`
- Modify: `get-issue-comments.handler.test.ts`

- [ ] **Use case:** `Promise.all` or sequential: comments + `issueRepository.getIssue` for attachments
- [ ] **Formatter:** `commentId` from comment entity, not ADF

- [ ] **Commit**

---

### Task 11: Register tools (29 → 31 tools)

**Files:**

- Create: `src/features/jira/tools/configs/attachment-tools.config.ts`
- Modify: `dependency.factory.ts`, `tool.factory.ts` (`createAttachmentHandlers`), `jira-tools.interface.ts`, `tool.registry.ts`, `configs/index.ts`
- Create: `src/features/jira/attachments/index.ts`
- Modify: `src/features/jira/index.ts` — `export * from "./attachments"`

Add to `JiraTools`:

- `jira_get_issue_attachments`
- `jira_download_attachment`

New config group `attachments` in `getToolConfigGroups`.

- [ ] **Smoke:** server starts, tool count +2

- [ ] **Commit**

```bash
git commit -m "src/features/jira/tools/: register jira_get_issue_attachments and jira_download_attachment"
```

---

### Task 12: Final verification

- [ ] **Run:** `bun run typecheck ; bun test`
- [ ] **Fix any failures**

---

### Task 13: Release v0.7.0 docs

**Files:**

- Modify: `package.json` version `0.7.0`
- Modify: `CHANGELOG.md`, `README.md`

- [ ] **CHANGELOG:** two tools, issue attachments section, ADF inline media
- [ ] **README:** workflow list → download by id
- [ ] **Commit** (version bump separate or with last feature commit per team habit)

---

## Spec coverage checklist

| Spec section                  | Task |
| ----------------------------- | ---- |
| Spike                         | 0    |
| MCP `content` passthrough     | 1    |
| `AttachmentMetadata` / errors | 2    |
| `downloadBinary` security     | 3    |
| `attachment.repository`       | 4    |
| ADF `parseADFWithMedia`       | 5    |
| Formatters                    | 6    |
| `jira_get_issue_attachments`  | 7    |
| `jira_download_attachment`    | 8    |
| `jira_get_issue` integration  | 9    |
| `jira_get_issue_comments`     | 10   |
| Tool registry                 | 11   |
| Tests / acceptance            | 12   |
| Publish 0.7.0                 | 13   |

## Out of scope (no tasks)

Upload, `downloadPath`, PDF blob, universal Media Services resolver, instance-specific hardcode.

---

## Execution handoff

Plan complete. Choose:

1. **Subagent-Driven** — fresh subagent per task + review between tasks  
2. **Inline Execution** — this session with `executing-plans`, batched checkpoints

Which approach?
