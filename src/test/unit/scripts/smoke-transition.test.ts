import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

describe("smoke-transition script", () => {
  it("does not hardcode a machine-specific workspace path", async () => {
    const scriptPath = join(
      import.meta.dir,
      "../../../../scripts/smoke-transition.mjs",
    );
    const script = await readFile(scriptPath, "utf8");

    expect(script).not.toContain("c:/sites/jira-mcp");
    expect(script).not.toContain("C:/sites/jira-mcp");
  });
});
