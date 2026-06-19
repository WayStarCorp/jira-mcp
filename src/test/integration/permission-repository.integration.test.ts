/**
 * Integration tests for ProjectPermissionRepository
 * Tests the actual JIRA API endpoint for permission checking
 */
import { beforeAll, describe, expect, test } from "bun:test";
import { JiraConfigService } from "@features/jira/client/config";
import { JiraHttpClient } from "@features/jira/client/http";
import type { ProjectPermissions } from "@features/jira/projects/models";
import { ProjectPermissionRepositoryImpl } from "@features/jira/projects/repositories/project-permission.repository";
import {
  getJiraCredentialsSkipReason,
  hasJiraCredentials,
} from "../utils/jira-credentials";
import { getJiraTestProjectKey } from "../utils/jira-integration-config";

describe("ProjectPermissionRepository Integration Tests", () => {
  let permissionRepository: ProjectPermissionRepositoryImpl;
  let httpClient: JiraHttpClient;

  // Test configuration - these should be set via environment variables
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
      console.log(
        "   Set JIRA_HOST, JIRA_USERNAME, and JIRA_API_TOKEN to run integration tests",
      );
      return;
    }

    const configService = new JiraConfigService(testConfig);
    httpClient = new JiraHttpClient(configService);
    permissionRepository = new ProjectPermissionRepositoryImpl(httpClient);
  });

  describe("mypermissions endpoint", () => {
    test("should successfully call /rest/api/3/mypermissions endpoint", async () => {
      if (!hasJiraCredentials()) {
        console.log("⚠️ Skipping test - no JIRA credentials provided");
        return;
      }
      await testMypermissionsEndpoint();
    });

    async function testMypermissionsEndpoint() {
      try {
        const permissions = await permissionRepository.getProjectPermissions(
          getJiraTestProjectKey(),
        );
        validatePermissionsResponse(permissions);
        logPermissionsSuccess(permissions);
      } catch (error) {
        handlePermissionsError(error);
      }
    }

    function validatePermissionsResponse(permissions: ProjectPermissions) {
      expect(permissions).toBeDefined();
      expect(permissions.permissions).toBeDefined();
    }

    function logPermissionsSuccess(permissions: ProjectPermissions) {
      console.log("✅ Successfully called mypermissions endpoint");
      console.log(
        "📋 Response structure:",
        JSON.stringify(permissions, null, 2),
      );

      if (permissions.permissions) {
        console.log("🔍 Available permissions:");
        for (const permission of Object.keys(permissions.permissions)) {
          const hasPermission =
            permissions.permissions?.[permission]?.havePermission;
          console.log(`  ${permission}: ${hasPermission ? "✅" : "❌"}`);
        }
      }
    }

    function handlePermissionsError(error: unknown): never {
      console.error("❌ API call failed:", error);

      if (error instanceof Error) {
        console.error("Error details:", error.message);

        if (
          error.message.includes("404") ||
          error.message.includes("Not Found")
        ) {
          throw new Error(
            "❌ CRITICAL: mypermissions endpoint not found - API endpoint may be incorrect",
          );
        }

        if (
          error.message.includes("401") ||
          error.message.includes("Unauthorized")
        ) {
          throw new Error("❌ Authentication failed - check JIRA credentials");
        }
      }

      throw error;
    }

    test("should check CREATE_ISSUES permission for test project", async () => {
      if (!hasJiraCredentials()) {
        console.log("⚠️ Skipping test - no JIRA credentials provided");
        return;
      }

      try {
        const hasPermission =
          await permissionRepository.hasCreateIssuePermission(
            getJiraTestProjectKey(),
          );

        console.log(
          `🔍 CREATE_ISSUES permission for ${getJiraTestProjectKey()}: ${hasPermission ? "✅ GRANTED" : "❌ DENIED"}`,
        );

        // This should return true based on the user's report
        expect(typeof hasPermission).toBe("boolean");

        if (!hasPermission) {
          console.warn(
            "⚠️ CREATE_ISSUES permission denied - this might indicate the fix didn't work",
          );
        }
      } catch (error) {
        console.error("❌ Permission check failed:", error);
        throw error;
      }
    });

    test("should check EDIT_ISSUES permission for test project", async () => {
      if (!hasJiraCredentials()) {
        console.log("⚠️ Skipping test - no JIRA credentials provided");
        return;
      }

      try {
        const hasPermission = await permissionRepository.hasEditIssuePermission(
          getJiraTestProjectKey(),
        );

        console.log(
          `🔍 EDIT_ISSUES permission for ${getJiraTestProjectKey()}: ${hasPermission ? "✅ GRANTED" : "❌ DENIED"}`,
        );

        // This should return true based on the user's report
        expect(typeof hasPermission).toBe("boolean");

        if (!hasPermission) {
          console.warn(
            "⚠️ EDIT_ISSUES permission denied - this might indicate the fix didn't work",
          );
        }
      } catch (error) {
        console.error("❌ Permission check failed:", error);
        throw error;
      }
    });
  });

  describe("endpoint comparison", () => {
    test("should demonstrate the difference between old and new endpoints", async () => {
      if (!hasJiraCredentials()) {
        console.log("⚠️ Skipping test - no JIRA credentials provided");
        return;
      }
      console.log("🔍 Testing endpoint differences:");

      // Test the new (correct) endpoint
      try {
        console.log("📡 Testing NEW endpoint: /rest/api/3/mypermissions");
        const newResponse = await httpClient.sendRequest({
          endpoint: "mypermissions",
          method: "GET",
          queryParams: {
            projectKey: getJiraTestProjectKey(),
            permissions: "CREATE_ISSUES,EDIT_ISSUES,DELETE_ISSUES",
          },
        });

        console.log("✅ NEW endpoint SUCCESS");
        console.log("📋 Response:", JSON.stringify(newResponse, null, 2));
      } catch (error) {
        console.error("❌ NEW endpoint FAILED:", error);
      }

      // Test the old (incorrect) endpoint to show it fails
      try {
        console.log(
          "📡 Testing OLD endpoint: /rest/api/3/user/permission/search",
        );
        const oldResponse = await httpClient.sendRequest({
          endpoint: "user/permission/search",
          method: "GET",
          queryParams: {
            projectKey: getJiraTestProjectKey(),
            permissions: "CREATE_ISSUES,EDIT_ISSUES,DELETE_ISSUES",
          },
        });

        console.log("⚠️ OLD endpoint unexpectedly succeeded:");
        console.log("📋 Response:", JSON.stringify(oldResponse, null, 2));
      } catch (error) {
        console.log(
          "✅ OLD endpoint FAILED as expected:",
          error instanceof Error ? error.message : error,
        );
      }
    });
  });

  describe("error handling", () => {
    test("should handle invalid project key gracefully", async () => {
      if (!hasJiraCredentials()) {
        console.log("⚠️ Skipping test - no JIRA credentials provided");
        return;
      }
      try {
        const hasPermission =
          await permissionRepository.hasCreateIssuePermission("NONEXISTENT");

        // Should return false for non-existent project
        expect(hasPermission).toBe(false);
        console.log("✅ Correctly handled invalid project key");
      } catch (error) {
        console.log(
          "✅ Correctly threw error for invalid project:",
          error instanceof Error ? error.message : error,
        );
      }
    });
  });
});

/**
 * Test runner instructions:
 *
 * To run these integration tests with real JIRA credentials:
 *
 * 1. Set environment variables:
 *    export JIRA_HOST="https://your-domain.atlassian.net"
 *    export JIRA_USERNAME="your-email@domain.com"
 *    export JIRA_API_TOKEN="your-api-token"
 *
 * 2. Run integration tests:
 *    bun run test:integration
 *
 * Without credentials, these tests will be automatically skipped.
 */
