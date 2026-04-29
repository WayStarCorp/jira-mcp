/**
 * Worklog formatter
 */
import type { WorklogEntry } from "@features/jira/issues/models";
import type { AddWorklogRequest } from "@features/jira/issues/use-cases/worklog.use-cases";
import type { StringFormatter } from "@features/jira/shared";
import type {
  ADFDocument,
  ADFNode,
} from "@features/jira/shared/parsers/adf.parser";

/**
 * Builder for formatting worklog entry sections
 */
class WorklogEntryBuilder {
  private readonly sections: string[] = [];

  constructor(private readonly worklog: WorklogEntry) {}

  /**
   * Add header section with worklog ID
   */
  addHeader(): this {
    const header = this.worklog.id
      ? `## ⏱️ Worklog ${this.worklog.id}`
      : "## ⏱️ Worklog Entry";
    this.sections.push(header);
    return this;
  }

  /**
   * Add time information section
   */
  addTimeInformation(): this {
    this.sections.push(
      `**Time Spent:** ${this.worklog.timeSpent} (${this.worklog.timeSpentSeconds}s)`,
    );

    if (this.worklog.started) {
      this.sections.push(
        `**Started:** ${this.formatDateTime(this.worklog.started)}`,
      );
    }
    return this;
  }

  /**
   * Add author information section
   */
  addAuthorInformation(): this {
    if (this.worklog.author) {
      this.sections.push(
        `**Author:** ${this.worklog.author.displayName || "Unknown"}`,
      );
    }
    return this;
  }

  /**
   * Add date information section
   */
  addDateInformation(): this {
    if (this.worklog.created) {
      this.sections.push(
        `**Created:** ${this.formatDateTime(this.worklog.created)}`,
      );
    }

    if (this.worklog.updated && this.worklog.updated !== this.worklog.created) {
      this.sections.push(
        `**Updated:** ${this.formatDateTime(this.worklog.updated)}`,
      );

      if (
        this.worklog.updateAuthor &&
        this.worklog.updateAuthor !== this.worklog.author
      ) {
        this.sections.push(
          `**Updated By:** ${this.worklog.updateAuthor.displayName || "Unknown"}`,
        );
      }
    }
    return this;
  }

  /**
   * Add comment section
   */
  addComment(): this {
    if (this.worklog.comment) {
      if (typeof this.worklog.comment === "string") {
        this.sections.push("**Comment:**", this.worklog.comment);
      } else if (
        this.worklog.comment &&
        typeof this.worklog.comment === "object"
      ) {
        this.sections.push(
          "**Comment:**",
          this.extractTextFromADF(this.worklog.comment),
        );
      } else {
        this.sections.push("**Comment:**");
      }
    }
    return this;
  }

  /**
   * Add visibility section
   */
  addVisibility(): this {
    if (this.worklog.visibility) {
      this.sections.push(
        `**Visibility:** ${this.worklog.visibility.type} - ${this.worklog.visibility.value}`,
      );
    }
    return this;
  }

  /**
   * Build the final formatted string
   */
  build(): string {
    return this.sections.join("\n\n");
  }

  /**
   * Extract text content from ADF document
   */
  private extractTextFromADF(adf: ADFDocument | ADFNode): string {
    if (typeof adf === "string") {
      return adf;
    }

    if (adf?.content && Array.isArray(adf.content)) {
      return adf.content
        .map((node: ADFNode) => this.extractTextFromNode(node))
        .filter(Boolean)
        .join("\n");
    }

    return "No comment text available";
  }

  /**
   * Extract text from ADF node
   */
  private extractTextFromNode(node: ADFNode): string {
    if (!node) return "";

    if (node.type === "text" && node.text) {
      return node.text;
    }

    if (node.content && Array.isArray(node.content)) {
      return node.content
        .map((child: ADFNode) => this.extractTextFromNode(child))
        .filter(Boolean)
        .join(" ");
    }

    return "";
  }

  /**
   * Format date-time strings in a deterministic locale
   */
  private formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });
  }
}

/**
 * Formatter class for worklog requests - formats for display
 */
export class WorklogFormatter implements StringFormatter<AddWorklogRequest> {
  /**
   * Format a worklog request for display
   */
  format(request: AddWorklogRequest): string {
    const sections: string[] = [];

    // Header and time information
    sections.push("# ⏱️ Adding Worklog", `**Time Spent:** ${request.timeSpent}`);

    // Start time
    if (request.started) {
      sections.push(`**Started:** ${request.started}`);
    }

    // Comment
    if (request.comment) {
      sections.push("**Comment:**", request.comment);
    }

    return sections.join("\n\n");
  }
}

/**
 * Formatter class for worklog entries - formats worklog data for display
 */
export class WorklogEntryFormatter implements StringFormatter<WorklogEntry> {
  /**
   * Format a worklog entry for display
   */
  format(worklog: WorklogEntry): string {
    return new WorklogEntryBuilder(worklog)
      .addHeader()
      .addTimeInformation()
      .addAuthorInformation()
      .addDateInformation()
      .addComment()
      .addVisibility()
      .build();
  }
}

/**
 * Formatter class for worklog lists - formats multiple worklog entries
 */
export class WorklogListFormatter implements StringFormatter<WorklogEntry[]> {
  private readonly entryFormatter = new WorklogEntryFormatter();

  /**
   * Format a list of worklog entries for display
   */
  format(worklogs: WorklogEntry[]): string {
    if (!worklogs || worklogs.length === 0) {
      return "# ⏱️ Worklogs\n\nNo worklog entries found.";
    }

    const sections: string[] = [];

    // Header with summary
    const totalSeconds = worklogs.reduce(
      (sum, w) => sum + (w.timeSpentSeconds || 0),
      0,
    );
    const totalHours = Math.round((totalSeconds / 3600) * 100) / 100;

    sections.push(
      "# ⏱️ Worklogs",
      `**Total Entries:** ${worklogs.length}`,
      `**Total Time:** ${totalHours} hours (${totalSeconds} seconds)`,
      "---",
    );

    worklogs.forEach((worklog, index) => {
      const entry = this.entryFormatter.format(worklog);
      sections.push(...(index > 0 ? ["---", entry] : [entry]));
    });

    return sections.join("\n\n");
  }
}
