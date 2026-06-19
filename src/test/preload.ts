import { resolve } from "node:path";
/**
 * Bun test preload: load .env from repo root so integration tests see JIRA_* credentials.
 */
import { config } from "dotenv";

config({ path: resolve(import.meta.dir, "../../.env") });
