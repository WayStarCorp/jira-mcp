# Дизайн: поддержка вложений и изображений в jira-mcp

**Дата:** 2026-05-25  
**Статус:** Утверждён (2026-05-25)
**Версия:** 0.7.0 (целевая)

---

## Контекст

jira-mcp v0.6.1 имеет 29 MCP-инструментов, но полностью не поддерживает вложения (attachments) и изображения из Jira-задач:

- ADF-парсер (`adf.parser.ts`) обрабатывает только текстовые узлы; `media`, `mediaSingle`, `mediaGroup` молча игнорируются.
- Тип `ImageContent` в `mcp-content.types.ts` определён, но нигде не используется.
- HTTP-клиент работает только с JSON — бинарные загрузки не поддерживаются.
- Из 29 tool ни один не касается attachments.

---

## Цель

Позволить агенту:
1. Узнать о вложениях задачи (метаданные) из ответа `jira_get_issue` и через отдельный tool.
2. Скачать конкретное вложение и получить его содержимое (изображение как MCP ImageContent, текст как строку) в пределах безопасного лимита размера.
3. Обнаружить inline-изображения в description и comments, разобрав ADF media-узлы; сопоставлять их с attachment metadata только когда есть подтверждённый bridge между ADF media id и Jira attachment.

---

## Архитектура

### Новый домен `attachments/`

Следует тому же паттерну, что `sprints/`, `worklogs/`, но без дублирования существующего issue retrieval:

```
src/features/jira/
└── attachments/
    ├── handlers/
    │   ├── get-issue-attachments.handler.ts
    │   └── download-attachment.handler.ts
    ├── repositories/
    │   └── attachment.repository.ts      # /attachment/{id} metadata + binary download
    ├── formatters/
    │   └── attachment.formatter.ts
    ├── use-cases/
    │   ├── get-issue-attachments.use-case.ts
    │   └── download-attachment.use-case.ts
    └── index.ts
```

`jira_get_issue_attachments` получает список `fields.attachment[]` через существующий `IssueRepository.getIssue(...)` или тонкую обёртку, которая не создаёт второй независимый путь для того же `/issue/{issueKey}` endpoint. Новый `attachment.repository` нужен для операций, которых у `IssueRepository` нет: `GET /attachment/{id}` и бинарное скачивание `content`.

### Изменения в существующих файлах

| Файл | Изменение |
|------|-----------|
| `features/jira/shared/parsers/adf.parser.ts` | Добавить `parseADFWithMedia()`; существующий `parseADF()` остаётся string-only для обратной совместимости |
| `issues/models/issue.models.ts` | Типизировать `fields.attachment[]` (опционально, без breaking change для `[key: string]: unknown`) |
| `issues/formatters/issue.formatter.ts` | Форматировать `fields.attachment[]` в секцию `## Attachments` |
| `issues/formatters/issue-description.formatter.ts` | Использовать `parseADFWithMedia()`; при media-узлах — блок `Inline media` после description |
| `issues/use-cases/get-issue-comments.use-case.ts` | Возвращать comments вместе с attachment metadata для inline media enrichment |
| `issues/formatters/comments.formatter.ts` | Добавлять `inlineMedia[]` с `commentId` из контекста комментария, не из ADF |
| `client/http/jira.http.types.ts` | Добавить binary capability в `HttpClient` или отдельный `BinaryHttpClient` |
| `client/http/jira.http-client.impl.ts` | Новый метод `downloadBinary(url, maxBytes)` → `ArrayBuffer` с host validation |
| `core/responses/mcp-response.types.ts` | Опциональное поле `content?: Content[]` на `McpResponse` |
| `core/responses/mcp-adapter.util.ts` / `core/tools/tool-handler.class.ts` | Поддержать raw MCP content, чтобы handler мог вернуть `ImageContent`, а не JSON-stringified text |
| `core/errors/` | Новый класс `AttachmentTooLargeError` |
| `features/jira/tools/registry/tool.registry.ts` | Зарегистрировать 2 новых tool |
| `features/jira/tools/configs/attachment.config.ts` | Новый файл конфигураций |
| `features/index.ts` | Подключить attachment handlers |

---

## MCP Tools

### `jira_get_issue_attachments`

**Input:**
```typescript
{ issueKey: string }  // формат PROJECT-123
```

**Output (TextContent, markdown):**
```
Attachments for SUPP-79 (3 files):

📎 screenshot.png (image/png, 245 KB) — uploaded by user@example.com on 2026-05-20
   id: 10042  isImage: true

📎 report.pdf (application/pdf, 1.2 MB) — uploaded by ...
   id: 10043  isImage: false

📎 log.txt (text/plain, 4 KB) — ...
   id: 10044  isImage: false
```

При пустом списке: `"No attachments found for {issueKey}"` — явный текст, не молчать.

**Jira API:** `GET /rest/api/3/issue/{issueKey}` — поле `fields.attachment` возвращается по умолчанию, дополнительный `?fields=` не нужен. `jira_get_issue_attachments` переиспользует существующий issue retrieval путь, чтобы не создавать второй независимый repository для того же endpoint.

---

### `jira_download_attachment`

**Input:**
```typescript
{
  attachmentId: string,
  maxBytes?: number       // лимит размера; default: 10 MiB, hard max: 50 MiB
}
```

**Output по типу содержимого:**

| mimeType | Ответ |
|----------|-------|
| `image/*` | MCP `ImageContent { type: "image", data: base64, mimeType }` |
| `text/*`, `application/json` | MCP `TextContent` со строкой файла |
| всё остальное | `TextContent` с метаданными; binary content не возвращается в v0.7.0 |

**Пример ответа для бинаря:**
```
Downloaded: report.pdf (application/pdf, 1.2 MB)
(binary content not returned for non-image/non-text files)
```

`downloadPath` намеренно не входит в v0.7.0. Локальная запись файлов добавляет отдельную file-system поверхность (base directory, traversal, overwrite, symlink handling, platform differences) и требует отдельного дизайна.

### MCP response contract (обязательное изменение core)

Сейчас все tools регистрируются через `adaptHandler()` → `adaptToMcpContent()`, который **всегда** строит `content: [{ type: "text", ... }]`. `BaseToolHandler.formatResult()` оборачивает любой non-string результат в `createSuccessResponse(object)` → JSON в text.

**Выбранный подход для v0.7.0:** расширить `McpResponse` опциональным полем `content?: Content[]` (типы уже есть в `mcp-content.types.ts`). Правила:

| Случай | Поведение |
|--------|-----------|
| `response.content` задан | `adaptToMcpContent()` возвращает его как есть (+ `isError` / `errorCode`) |
| `response.content` не задан | Текущее поведение: один `TextContent` из `data` / `error` |
| `jira_download_attachment` + `image/*` | Handler возвращает `createSuccessResponse` с `content: [ImageContent]` |
| `jira_download_attachment` + text / metadata | Handler возвращает string или `content: [TextContent]` — оба пути допустимы |

`DownloadAttachmentHandler` может переопределить `formatResult()` или возвращать структуру, которую adapter понимает; **не** полагаться на JSON-stringified `ImageContent` в `data`.

**Jira API:**
1. `GET /rest/api/3/attachment/{attachmentId}` — получить метаданные и `content` URL
2. `GET {content}` — скачать содержимое (binary)

---

## Тип данных `AttachmentMetadata`

```typescript
interface AttachmentMetadata {
  id: string;
  filename: string;
  mimeType: string;
  size: number;       // bytes
  created: string;    // ISO 8601
  author: string;     // displayName
  contentUrl: string; // internal only: не показывать в markdown и не логировать
  isImage: boolean;   // mimeType.startsWith("image/")
}
```

---

## Интеграция в существующие tools

### `jira_get_issue`

Когда у задачи есть вложения — добавляется секция в конце ответа:

```
## Attachments (3)
📎 screenshot.png (image/png, 245 KB) · id: 10042 · use jira_download_attachment to view
📎 report.pdf (application/pdf, 1.2 MB) · id: 10043
📎 log.txt (text/plain, 4 KB) · id: 10044
```

Если вложений нет — секция не добавляется совсем (не пустой список).

Inline-изображения в **description** (ADF `media` в `fields.description`): после текста description, при наличии media-узлов — тот же блок `Inline media`, что и в комментариях; enrichment через `fields.attachment[]` по правилам ADF Media Resolution.

### `jira_get_issue_comments`

`jira_get_issue_comments` должен получить attachment metadata для задачи до форматирования комментариев. Иначе formatter видит только `Comment[]` и не может обогатить inline media filename/mimeType. Use case возвращает модель вида:

```typescript
interface CommentsWithAttachments {
  comments: Comment[];
  attachments: AttachmentMetadata[];
}
```

Когда в комментарии есть ADF media-узлы — добавляется блок после текста. `commentId` берётся из самого комментария, а не из ADF:

```
[Comment #3 by user@example.com on 2026-05-20]
...текст комментария...

Inline media:
  📷 attachment id: 10042 → screenshot.png (image/png)
  📷 media id: def-456 → [unresolved: no matching attachment found]
```

---

## ADF Media Resolution

Jira ADF `media.attrs.id` нельзя считать равным Jira attachment id без проверки на реальном payload. В Jira Cloud `media.attrs.id` может быть Media Services ID, а attachment id из `fields.attachment[]` обычно отдельный numeric id.

**Алгоритм:**
1. Добавить non-breaking API `parseADFWithMedia(adf)` → `{ markdown: string; media: ParsedMedia[] }`; существующий `parseADF(adf): string` не менять.
2. При парсинге ADF description/comment собрать `media.attrs.id`, `type`, `collection`, `alt` в `ParsedMedia[]`.
3. До реализации resolution проверить минимум один реальный Jira payload с inline image: сравнить `media.attrs.id` и `fields.attachment[].id`.
4. Если id действительно совпадает для данного Jira payload — enrichment может сопоставить media с attachment по `id`.
5. Если bridge не подтверждён — возвращать media как unresolved (`media id`, `type`, `collection/alt` если есть) и рядом показывать список обычных attachments как путь для ручного выбора `attachmentId`.

**Spike (SUPP-79, 2026-05-25):** id-bridge **не** подтверждён (`media.attrs.id` = UUID `aad76a6d-…`, `attachment.id` = `15894`). `media.attrs.alt` совпадает с `attachment.filename` — heuristic по filename **вне scope v0.7.0**. `contentUrl` host = `JIRA_HOST` (CDN не нужен). Детали: `docs/superpowers/spikes/2026-05-25-attachments-spike.md`.

**Новые node types в ADF парсере:**

| Node type | Поведение |
|-----------|-----------|
| `mediaSingle` | Парсить дочерние `media` узлы |
| `mediaGroup` | Парсить дочерние `media` узлы |
| `media` | Извлечь attrs в `ParsedMedia[]`; в markdown: `[media: {id}]` |

```typescript
interface ParsedMedia {
  mediaId: string;
  type?: string;
  collection?: string;
  alt?: string;
}
```

---

## HTTP Client: `downloadBinary`

```typescript
async downloadBinary(url: string, maxBytes: number): Promise<ArrayBuffer>
```

- Auth headers строятся в памяти, не логируются
- Метод доступен через `HttpClient` interface или отдельный `BinaryHttpClient`, чтобы repositories не зависели от concrete `JiraHttpClient`
- `maxBytes` всегда имеет эффективное значение: default `10 * 1024 * 1024`, hard max `50 * 1024 * 1024`
- Если `Content-Length > maxBytes` — бросает `AttachmentTooLargeError` **до** скачивания
- Если `Content-Length` отсутствует — потоковая проверка размера во время чтения
- URL абсолютный (Jira `contentUrl`), не проходит через `JiraUrlBuilder`
- URL должен быть HTTPS и принадлежать `JIRA_HOST` или явно разрешённому Atlassian attachment/media host
- Cross-origin redirects запрещены; private/link-local hosts запрещены
- Authorization header добавляется только для разрешённых Jira origins

---

## Безопасность

| Требование | Реализация |
|---|---|
| Не логировать auth headers | `downloadBinary` не передаёт заголовки в `Logger` |
| Не сохранять вложения на диск | `downloadPath` исключён из v0.7.0 |
| Скачивание только по явному вызову | Binary download только в `jira_download_attachment` |
| Ограничение размера | default 10 MiB для content response, hard max 50 MiB; при превышении: `AttachmentTooLargeError` |
| SSRF / credential leak | Разрешены только HTTPS Jira/Atlassian attachment hosts; auth headers не уходят на другие origins |
| Data exposure | `contentUrl` и локальные пути не возвращаются в markdown и не логируются |

---

## Обработка ошибок

| Условие | Ошибка | Сообщение |
|---------|--------|-----------|
| 401 | `JiraAuthenticationError` | `"Check JIRA_USERNAME and JIRA_API_TOKEN"` |
| 403 | `JiraPermissionError` | `"Insufficient permissions. Verify Jira scopes include read:attachment"` |
| 404 | `McpError` | `"Attachment {id} not found"` |
| `> maxBytes` | `AttachmentTooLargeError` | `"File exceeds maxBytes limit ({X} bytes). Pass a larger maxBytes up to the hard maximum."` |
| Неразрешённый `contentUrl` host | `McpError` | `"Attachment content URL is not allowed"` |
| Пустой список | — | Явный текст `"No attachments found for {issueKey}"` |

---

## Тестирование

**Unit тесты** (`src/test/unit/`):
- ADF parser: `parseADF()` сохраняет string contract; `parseADFWithMedia()` возвращает markdown + media / mediaSingle / mediaGroup
- Inline media formatter: resolved при подтверждённом id match, unresolved без match, `commentId` из контекста комментария
- `attachment.formatter`: форматирование списка, пустой список, isImage detection
- `AttachmentTooLargeError`: конструктор и сообщение
- `adaptToMcpContent()`: при `McpResponse.content` — passthrough; без него — legacy text path
- `DownloadAttachmentHandler`: image → `ImageContent`, не JSON в text

**Integration тесты** (`src/test/integration/`):
- `attachment.repository`: metadata success, download success, 401, 403, 404, превышение `maxBytes`, forbidden host
- `jira_get_issue_comments`: comments + issue attachments are fetched before inline media formatting
- Mock HTTP client по паттерну существующих integration тестов

---

## Pre-implementation spike (до основной реализации)

**Решение:** spike — **первый шаг** implementation plan (до prod-кода). Доступ к Jira с задачей с inline-изображением подтверждён (например SUPP-79). Результаты фиксируются в `docs/superpowers/spikes/2026-05-25-attachments-spike.md` и при необходимости обновляют этот spec (id-bridge, allowed hosts).

Минимальная проверка на реальной задаче (например SUPP-79), без коммита прод-кода:

1. `GET /rest/api/3/issue/{key}` — сохранить фрагмент `fields.attachment[]` и ADF из `fields.description` / comment body с inline image.
2. Сравнить `media.attrs.id` с `attachment.id` — зафиксировать в spec, подтверждён ли id-bridge для этого Jira.
3. Один вызов `GET /rest/api/3/attachment/{id}` — проверить форму `content` URL (host, HTTPS).
4. Если id-bridge не совпадает — acceptance для «resolved inline filename» остаётся **условным**; v0.7.0 всё равно ship-ит parsing + unresolved + список attachments.

---

## Вне scope v0.7.0

- `downloadPath` и запись файлов на диск агентом/CLI
- Загрузка вложений в Jira (POST attachment)
- `ResourceContent` / blob для PDF и прочего binary в MCP response
- Универсальный resolver Media Services ID без подтверждённого bridge
- Хардкод имён исполнителей, статусов или project-specific полей

---

## Публикация

- `package.json` → `0.7.0`
- `CHANGELOG.md` — два новых tool, секция Attachments в `jira_get_issue`, ADF media parsing
- `README.md` — краткий workflow: list → `jira_download_attachment` по `id`
- Локальная проверка перед тегом: `bun run typecheck` ; `bun test`

---

## Open Questions

| Вопрос | Влияние | Решение по умолчанию для v0.7.0 |
|--------|---------|----------------------------------|
| Список разрешённых Atlassian hosts кроме `JIRA_HOST` | SSRF policy | **Закрыто (spike SUPP-79):** только `JIRA_HOST` origin; `contentUrl` на том же host |
| `image/heic` и прочие редкие MIME | Клиенты MCP могут не рендерить | Возвращать как `ImageContent` с фактическим `mimeType`; в metadata tool помечать `isImage: true` |
| Кодировка `text/*` без charset | Неверный текст в ответе | UTF-8 default; при `charset` в `Content-Type` — уважать заголовок |
| Дублировать ли `jira_get_issue_attachments`, если список уже в `jira_get_issue` | Два tool для одного списка | Оставить оба: отдельный tool для узкого запроса «только attachments» без полного issue markdown |

---

## Acceptance Criteria

- Для любой доступной задачи агент может получить список вложений через `jira_get_issue` и `jira_get_issue_attachments`.
- По SUPP-79 агент может увидеть скриншот через `jira_download_attachment`, если размер не превышает default/hard лимиты.
- Картинка inline в **description** и в **comment** обнаруживается через ADF media parsing; блок `Inline media` виден в markdown; при подтверждённом bridge — filename/mimeType.
- Картинка в комментарии возвращается с `commentId` из контекста комментария; unresolved media явно помечаются как unresolved.
- При пустом списке вложений tool явно возвращает `"No attachments found for {issueKey}"`.
- Ошибки 401/403 возвращаются с подсказкой по permissions/scopes.
- Auth headers не появляются в логах.
- Неразрешённые `contentUrl` hosts не скачиваются и не получают Authorization header.
