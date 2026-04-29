/**
 * User list formatter
 *
 * Formats Jira users as a readable Markdown list.
 */

import type { StringFormatter } from "@features/jira/shared/formatters/formatter.interface";
import type { User } from "../models";

export interface UserListFormatterInput {
  users: User[];
  title: string;
  query?: string;
  issueKey?: string;
}

export class UserListFormatter
  implements StringFormatter<UserListFormatterInput>
{
  format(input: UserListFormatterInput): string {
    const { users, title, query, issueKey } = input;

    if (users.length === 0) {
      return this.formatEmptyState(title, query, issueKey);
    }

    const headerParts = [`# ${title}`];
    const summaryParts = [
      `Found **${users.length}** user${users.length === 1 ? "" : "s"}`,
    ];

    if (query) {
      summaryParts.push(`matching \`${query}\``);
    }

    if (issueKey) {
      summaryParts.push(`for **${issueKey}**`);
    }

    const lines = users.map((user) => this.formatUserLine(user));

    return [headerParts.join("\n"), summaryParts.join(" "), "", ...lines].join(
      "\n",
    );
  }

  private formatEmptyState(
    title: string,
    query?: string,
    issueKey?: string,
  ): string {
    const contextParts: string[] = [];

    if (query) {
      contextParts.push(`matching \`${query}\``);
    }

    if (issueKey) {
      contextParts.push(`for **${issueKey}**`);
    }

    const contextSuffix =
      contextParts.length > 0 ? ` ${contextParts.join(" ")}` : "";

    return [
      `# ${title}`,
      "",
      `No users found${contextSuffix}.`,
      "",
      "Try a broader query or use the exact accountId if you already know it.",
    ].join("\n");
  }

  private formatUserLine(user: User): string {
    const displayName = user.displayName || user.accountId || "Unknown user";
    const email = user.emailAddress ? ` | ${user.emailAddress}` : "";
    const inactive = user.active === false ? " (inactive)" : "";

    return `- **${displayName}**${inactive} | \`${user.accountId}\`${email}`;
  }
}
