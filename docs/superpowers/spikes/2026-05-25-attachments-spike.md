# Spike: Jira attachments & ADF inline media (SUPP-79)

**Дата:** 2026-05-25  
**Jira:** Cloud (`JIRA_HOST` из credentials)  
**Задача:** `SUPP-79`

## Метод

- `GET /rest/api/3/issue/SUPP-79` — `fields.attachment[]`, ADF `fields.description`
- `GET /rest/api/3/issue/SUPP-79/comment` — media в телах комментариев
- `GET /rest/api/3/attachment/15894` — host `content` URL (без публикации полного URL в документации)

## `fields.attachment[]`

| id      | filename                    | mimeType    | size (bytes) |
| ------- | --------------------------- | ----------- | ------------ |
| `15894` | `image-20260515-133022.png` | `image/png` | 120161       |

Одно вложение, совпадает со скриншотом в описании по имени файла.

## ADF media в description

```json
{
  "mediaId": "aad76a6d-d7ee-4db2-af06-dad8645d037b",
  "type": "file",
  "collection": "",
  "alt": "image-20260515-133022.png"
}
```

Узел: `mediaSingle` → `media` (типичная структура Jira Cloud).

## ADF media в comments

**Нет** — все 3 комментария SUPP-79 без `media` / `mediaSingle` / `mediaGroup`.

Для acceptance по inline media в комментариях нужна **другая** задача с inline-картинкой в comment body (или синтетический тест на fixture ADF).

## Id-bridge: `media.attrs.id` ↔ `attachment.id`

| Поле           | Значение                                                    |
| -------------- | ----------------------------------------------------------- |
| media.attrs.id | aad76a6d-d7ee-4db2-af06-dad8645d037b (UUID, Media Services) |
| attachment.id  | 15894 (numeric)                                             |

**Вердикт: bridge по id — НЕТ** на этом payload.

**Наблюдение (не для v0.7.0 resolver):** `media.attrs.alt` === `attachment.filename` (`image-20260515-133022.png`). Heuristic match по filename/alt в spec **не** заложен; v0.7.0 — unresolved + список attachments + `jira_download_attachment` по `attachmentId`.

## `content` URL (attachment metadata)

| Проверка                | Результат                      |
| ----------------------- | ------------------------------ |
| Scheme                  | `https:`                       |
| Host                    | тот же origin, что `JIRA_HOST` |
| Совпадает с `JIRA_HOST` | **да**                         |

**Вердикт для SSRF policy v0.7.0:** достаточно allowlist origin `JIRA_HOST`; отдельный Atlassian CDN host для `contentUrl` на этом инстансе **не** потребовался.

## Влияние на spec / реализацию

1. **ADF Media Resolution** — enrichment filename/mimeType по id остаётся **условным**; для SUPP-79 — unresolved inline + явный список вложений.
2. **Open Questions (hosts)** — закрыто для данного инстанса: только `JIRA_HOST`.
3. **Acceptance SUPP-79** — агент видит вложение через список + `jira_download_attachment` с `attachmentId: "15894"`; inline block показывает `media id` и `[unresolved]`, не ложный match по UUID.
4. **Тесты** — unit/fixture ADF с UUID media id + numeric attachment id; integration download на `15894` при наличии credentials.

## Следующий шаг

Task 1 плана: `McpResponse.content` + `adaptToMcpContent` passthrough.
