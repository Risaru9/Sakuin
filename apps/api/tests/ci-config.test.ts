import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type ApiPackage = {
  scripts?: Record<string, string>;
};

describe("CI test configuration", () => {
  it("menjalankan integration test API secara serial di CI", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    ) as ApiPackage;
    const workflow = readFileSync(
      new URL("../../../.github/workflows/ci.yml", import.meta.url),
      "utf8"
    );

    expect(packageJson.scripts?.["test:ci"]).toContain("--maxWorkers=1");
    expect(workflow).toContain("pnpm --filter @sakuin/api test:ci");
    expect(workflow).not.toContain("pnpm --filter @sakuin/api test\n");

    const jobTimeout = workflow.match(/timeout-minutes:\s*(\d+)/);
    expect(jobTimeout).not.toBeNull();
    expect(Number(jobTimeout?.[1])).toBeGreaterThanOrEqual(35);
  });
});
