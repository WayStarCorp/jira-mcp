/**
 * Worklog Formatter Unit Tests
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { WorklogEntryFormatter } from "@features/jira/issues/formatters/worklog.formatter";
import type { WorklogEntry } from "@features/jira/issues/models/worklog.models";
import { setupTests } from "@test/utils/test-setup";

setupTests();

describe("WorklogEntryFormatter", () => {
  let formatter: WorklogEntryFormatter;

  beforeEach(() => {
    formatter = new WorklogEntryFormatter();
  });

  test("formats dates using a deterministic locale", () => {
    const worklog: WorklogEntry = {
      id: "1",
      started: "2024-01-15T10:30:00.000Z",
      created: "2024-01-15T10:30:00.000Z",
      updated: "2024-01-16T14:45:00.000Z",
      timeSpent: "1h",
      timeSpentSeconds: 3600,
      author: {
        accountId: "u1",
        displayName: "Test User",
      },
      updateAuthor: {
        accountId: "u2",
        displayName: "Updater",
      },
      comment: "Done",
    };

    const result = formatter.format(worklog);

    expect(result).toContain("Jan 15, 2024");
    expect(result).toContain("Jan 16, 2024");
    expect(result).not.toContain("15.01.2024");
    expect(result).not.toContain("1/15/2024");
  });
});
