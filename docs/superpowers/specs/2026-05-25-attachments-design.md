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

```text
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

| Файл                                                                      | Изменение                                                                                                 |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `features/jira/shared/parsers/adf.parser.ts`                              | Добавить `parseADFWithMedia()`; существующий `parseADF()` остаётся string-only для обратной совместимости |
| `issues/models/issue.models.ts`                                           | Типизировать `fields.attachment[]` (опционально, без breaking change для `[key: string]: unknown`)        |
| `issues/formatters/issue.formatter.ts`                                    | Форматировать `fields.attachment[]` в секцию `## Attachments`                                             |
| `issues/formatters/issue-description.formatter.ts`                        | Использовать `parseADFWithMedia()`; при media-узлах — блок `Inline media` после description               |
| `issues/use-cases/get-issue-comments.use-case.ts`                         | Возвращать comments вместе с attachment metadata для inline media enrichment                              |
| `issues/formatters/comments.formatter.ts`                                 | Добавлять `inlineMedia[]` с `commentId` из контекста комментария, не из ADF                               |
| `client/http/jira.http.types.ts`                                          | Добавить binary capability в `HttpClient` или отдельный `BinaryHttpClient`                                |
| `client/http/jira.http-client.impl.ts`                                    | Новый метод `downloadBinary(url, maxBytes)` → `ArrayBuffer` с host validation                             |
| `core/responses/mcp-response.types.ts`                                    | Опциональное поле `content?: Content[]` на `McpResponse`                                                  |
| `core/responses/mcp-adapter.util.ts` / `core/tools/tool-handler.class.ts` | Поддержать raw MCP content, чтобы handler мог вернуть `ImageContent`, а не JSON-stringified text          |
| `core/errors/`                                                            | Новый класс `AttachmentTooLargeError`                                                                     |
| `features/jira/tools/registry/tool.registry.ts`                           | Зарегистрировать 2 новых tool                                                                             |
| `features/jira/tools/configs/attachment.config.ts`                        | Новый файл конфигураций                                                                                   |
| `features/index.ts`                                                       | Подключить attachment handlers                                                                            |
