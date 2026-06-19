import { describe, expect, test } from "bun:test";
import { escapeJqlQuotedLiteral } from "@features/jira/issues/utils/jql-escape";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("escapeJqlQuotedLiteral", () => {
  test("escapes double quotes for JQL string literals", () => {
    expect(escapeJqlQuotedLiteral('PROJ-1" OR 1=1')).toBe(
      String.raw`PROJ-1\" OR 1=1`,
    );
  });

  test("leaves keys without special characters unchanged", () => {
    expect(escapeJqlQuotedLiteral("E-1")).toBe("E-1");
  });
});
