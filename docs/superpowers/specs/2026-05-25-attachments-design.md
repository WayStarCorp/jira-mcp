# Дизайн: поддержка вложений и изображений в jira-mcp

**Дата:** 2026-05-25  
**Статус:** Approved  
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
2. Скачать конкретное вложение и получить его содержимое (изображение как MCP ImageContent, текст как строку).
3. Обнаружить inline-изображения в description и comments, разобрав ADF media-узлы.

---

## Архитектура

### Новый домен `attachments/`

Следует тому же паттерну, что `sprints/`, `worklogs/`:

```
src/features/jira/
└── attachments/
    ├── handlers/
    │   ├── get-issue-attachments.handler.ts
    │   └── download-attachment.handler.ts
    ├── repositories/
    │   └── attachment.repository.ts
    ├── formatters/
    │   └── attachment.formatter.ts
    ├── use-cases/
    │   ├── get-issue-attachments.use-case.ts
    │   └── download-attachment.use-case.ts
    └── index.ts
```

### Изменения в существующих файлах

| Файл | Изменение |
|------|-----------|
| `shared/parsers/adf.parser.ts` | Добавить обработку `media`, `mediaSingle`, `mediaGroup`; возвращать `unresolvedMedia[]` |
| `issues/formatters/issue.formatter.ts` | Форматировать `fields.attachment[]` в секцию `## Attachments` |
| `issues/formatters/comments.formatter.ts` | Добавлять `inlineMedia[]` с `commentId` из ADF |
| `client/http/jira-http.client.ts` | Новый метод `downloadBinary(url, maxBytes?)` → `ArrayBuffer` |
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

**Jira API:** `GET /rest/api/3/issue/{issueKey}?fields=attachment`

---

### `jira_download_attachment`

**Input:**
```typescript
{
  attachmentId: string,
  downloadPath?: string,  // путь для сохранения на диск; опциональный
  maxBytes?: number       // лимит размера; если не задан — нет лимита
}
```

**Output по типу содержимого:**

| mimeType | Ответ |
|----------|-------|
| `image/*` | MCP `ImageContent { type: "image", data: base64, mimeType }` |
| `text/*`, `application/json` | MCP `TextContent` со строкой файла |
| всё остальное | `TextContent` с метаданными и путём если сохранён |

**Пример ответа для бинаря без downloadPath:**
```
Downloaded: report.pdf (application/pdf, 1.2 MB)
(binary content not returned for non-image/non-text files)
Use downloadPath parameter to save the file to disk.
```

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
  contentUrl: string; // Jira internal URL
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

### `jira_get_issue_comments`

Когда в комментарии есть ADF media-узлы — добавляется блок после текста:

```
[Comment #3 by user@example.com on 2026-05-20]
...текст комментария...

Inline media:
  📷 attachment id: 10042 → screenshot.png (image/png)
  📷 media id: def-456 → [unresolved: no matching attachment found]
```

---

## ADF Media Resolution

Jira ADF `media` узел имеет `attrs.id` — это тот же `id`, что у attachment в `fields.attachment`.

**Алгоритм:**
1. При парсинге ADF description/comment: собрать все `media.attrs.id` в `unresolvedMedia[]`
2. Сопоставить с `fields.attachment[]` по `id`
3. Совпадение → resolved (filename, mimeType, contentUrl)
4. Нет совпадения → оставить в `unresolvedMedia` с диагностическим полем

**Новые node types в ADF парсере:**

| Node type | Поведение |
|-----------|-----------|
| `mediaSingle` | Парсить дочерние `media` узлы |
| `mediaGroup` | Парсить дочерние `media` узлы |
| `media` | Извлечь `attrs.id`, добавить в `unresolvedMedia[]`; в markdown: `[media: {id}]` |

---

## HTTP Client: `downloadBinary`

```typescript
async downloadBinary(url: string, maxBytes?: number): Promise<ArrayBuffer>
```

- Auth headers строятся в памяти, не логируются
- Если `maxBytes` задан и `Content-Length > maxBytes` — бросает `AttachmentTooLargeError` **до** скачивания
- Если `Content-Length` отсутствует — потоковая проверка размера во время чтения
- URL абсолютный (Jira `contentUrl`), не проходит через `JiraUrlBuilder`

---

## Безопасность

| Требование | Реализация |
|---|---|
| Не логировать auth headers | `downloadBinary` не передаёт заголовки в `Logger` |
| Не сохранять вложения по умолчанию | `downloadPath` опциональный; без него файл на диск не пишется |
| Скачивание только по явному вызову | Binary download только в `jira_download_attachment` |
| Ограничение размера | `maxBytes` опциональный, без дефолта; при превышении: `AttachmentTooLargeError` |

---

## Обработка ошибок

| Условие | Ошибка | Сообщение |
|---------|--------|-----------|
| 401 | `JiraAuthenticationError` | `"Check JIRA_USERNAME and JIRA_API_TOKEN"` |
| 403 | `JiraPermissionError` | `"Insufficient permissions. Verify Jira scopes include read:attachment"` |
| 404 | `McpError` | `"Attachment {id} not found"` |
| `> maxBytes` | `AttachmentTooLargeError` | `"File exceeds maxBytes limit ({X} bytes). Pass a larger maxBytes or use downloadPath."` |
| Ошибка записи на диск | `McpError` | `"Failed to save attachment to {path}: {reason}"` |
| Пустой список | — | Явный текст `"No attachments found for {issueKey}"` |

---

## Тестирование

**Unit тесты** (`src/test/unit/`):
- ADF parser: media node resolve / unresolved / mediaSingle / mediaGroup
- `attachment.formatter`: форматирование списка, пустой список, isImage detection
- `AttachmentTooLargeError`: конструктор и сообщение

**Integration тесты** (`src/test/integration/`):
- `attachment.repository`: успех, 401, 403, 404, превышение `maxBytes`
- Mock HTTP client по паттерну существующих integration тестов

---

## Acceptance Criteria

- По SUPP-79 агент может получить список вложений и увидеть скриншот через `jira_download_attachment`.
- Картинка вставленная inline в description обнаруживается через ADF media resolution.
- Картинка в комментарии возвращается с `commentId`.
- При пустом списке вложений tool явно возвращает `"No attachments found"`.
- Ошибки 401/403 возвращаются с подсказкой по permissions/scopes.
- Auth headers не появляются в логах.
