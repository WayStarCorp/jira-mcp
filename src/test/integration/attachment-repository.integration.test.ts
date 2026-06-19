/**
 * Integration tests for AttachmentRepository (metadata + binary download).
 * Uses attachment id 15894 on SUPP-79 when credentials are set (see attachments spike).
 */
import { beforeAll, describe, expect, test } from "bun:test";
import { AttachmentRepositoryImpl } from "@features/jira/attachments/repositories/attachment.repository";
import { JiraConfigService } from "@features/jira/client/config";
import { JiraHttpClient } from "@features/jira/client/http";
import { HARD_MAX_BYTES } from "@features/jira/client/http/attachment-url.validator";
import {
  getJiraCredentialsSkipReason,
  hasJiraCredentials,
} from "../utils/jira-credentials";

describe("AttachmentRepository Integration Tests", () => {
  let httpClient: JiraHttpClient;
  let repository: AttachmentRepositoryImpl;

  const testConfig = {
    hostUrl: process.env.JIRA_HOST || "https://example.atlassian.net",
    username: process.env.JIRA_USERNAME || "test@example.com",
    apiToken: process.env.JIRA_API_TOKEN || "test-token",
  };

  beforeAll(() => {
    if (!hasJiraCredentials()) {
      console.log(
        "⚠️ Skipping integration tests - no JIRA credentials provided",
      );
      console.log(`   Reason: ${getJiraCredentialsSkipReason()}`);
      return;
    }

    const configService = new JiraConfigService(testConfig);
    httpClient = new JiraHttpClient(configService);
    repository = new AttachmentRepositoryImpl(httpClient);
  });

  test("getMetadata returns attachment metadata for SUPP-79 attachment", async () => {
    if (!hasJiraCredentials()) {
      console.log("⚠️ Skipping test - no JIRA credentials provided");
      return;
    }

    const metadata = await repository.getMetadata("15894");

    expect(metadata.id).toBeTruthy();
    expect(metadata.filename).toBeTruthy();
    expect(metadata.mimeType).toBeTruthy();
    expect(metadata.size).toBeGreaterThan(0);
    expect(metadata.contentUrl).toMatch(/^https:\/\//);
  });

  test("downloadContent returns binary within maxBytes", async () => {
    if (!hasJiraCredentials()) {
      console.log("⚠️ Skipping test - no JIRA credentials provided");
      return;
    }

    const metadata = await repository.getMetadata("15894");
    const maxBytes = Math.min(metadata.size + 1024, HARD_MAX_BYTES);
    const buffer = await repository.downloadContent(metadata, maxBytes);

    expect(buffer.byteLength).toBeGreaterThan(0);
    expect(buffer.byteLength).toBeLessThanOrEqual(maxBytes);
  });
});
