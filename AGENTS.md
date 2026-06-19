# AGENTS

## Learned User Preferences

- Не добавлять в продукт алиасы и хардкод под конкретные имена исполнителей или названия статусов одного экземпляра Jira: MCP задуман как универсальный и публичный; имена из примеров — только чтобы проверить сценарий, не встроенная конфигурация.
- Когда нужно сохранять знания в Jira, предпочтительнее дополнять тело описания задачи (description), а не дублировать объём через комментарии — если пользователь явно задаёт формат.
- Перед публикацией или деплоем в облако для этого репозитория предпочтительна локальная валидация.
- Для атрибуции в `README` и `LICENSE` можно использовать `@romualdy`; реальное имя писать не обязательно.
- Секреты Jira не записывать в память или код: если нужно обсуждать конфигурацию, использовать только имена переменных окружения вроде `JIRA_HOST`, `JIRA_USERNAME`, `JIRA_API_TOKEN`.
- На feature-ветках предпочитает логические коммиты по фазам (часто отдельно документация Superpowers и код), а не один сводный коммит на всю фичу.
- Сообщение `+` — сигнал продолжить следующую задачу из implementation plan (часто Subagent-Driven Development по плану в `docs/superpowers/plans/`).

## Learned Workspace Facts

- Репозиторий — MCP для Jira; частые задачи от агентов: переходы по workflow, назначение исполнителей, добавление комментариев к задачам.
- Спринты: отдельного инструмента «текущий спринт» нет — активный спринт смотрят через `jira_get_sprints` с `state: "active"` (часто после `jira_get_boards` для `boardId`); добавление задач в спринт — `jira_add_issues_to_sprint` с явным `sprintId` из списка спринтов или с одним `boardId`, если на доске ровно один активный спринт.
- В `jira_update_issue` значение `assignee` — только account id (как ожидает Jira REST API); назначение по человекочитаемому имени — через `jira_assign_issue` с `query` или с уже известным `accountId`.
- Публикуемый npm-пакет по полю `files` в `package.json` включает только `dist/`, `README.md`, `LICENSE`, `CHANGELOG.md`; `AGENTS.md`, исходники репозитория и тесты в tarball не попадают.
- Релиз: ветка `release/vX.Y.Z` → merge в `main` → тег `v<version>` на `main` → `git push origin v<version>` → GitHub Release → workflow `release.yml` (`bun run typecheck`, `bun test`, `bun run check`, build, `npm publish`). Тег должен совпадать с `version` в `package.json` (без `v`); ручной `npm publish` не нужен. Секрет `NPM_TOKEN` в `WayStarCorp/jira-mcp` (granular read/write на пакет `@waystar/jira-mcp` достаточно; альтернатива — npm Trusted Publishing).
- Канонический GitHub remote — `WayStarCorp/jira-mcp`; если `gh` по умолчанию указывает на форк (`Dsazz/mcp-jira`), для PR/Release/Actions использовать `--repo WayStarCorp/jira-mcp`.
- Тулчейн: `bun test` (тесты), `bun run typecheck` (`tsc --noEmit`), `bun run check` / `bunx biome lint` (линтер — Biome, не ESLint). Перед коммитом: `bun run typecheck ; bun test`; перед релизом: также `bun run check` и `bun run build`.
- Проект на Bun: `package-lock.json` в `.gitignore`, lockfile не коммитить.
- Интеграционные тесты: `bunfig.toml` подключает `src/test/preload.ts` (загрузка `.env`); проект для live-тестов — `getJiraTestProjectKey()` (`JIRA_TEST_PROJECT_KEY` → префикс из `JIRA_TEST_ISSUE_KEY` → `SUPP`).
- Крупные фичи оформляются через Superpowers: спеки — `docs/superpowers/specs/`, планы — `docs/superpowers/plans/`, результаты spike — `docs/superpowers/spikes/`.
- Вложения Jira: ADF inline `media` id (UUID) не совпадает с numeric id в `fields.attachment[]`; список — `jira_get_issue_attachments`, скачивание и `ImageContent` — `jira_download_attachment` с `attachmentId`; бинарный ответ через passthrough `McpResponse.content`.
