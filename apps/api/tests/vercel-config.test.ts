import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type VercelConfig = {
  crons?: Array<{
    path: string;
    schedule: string;
  }>;
};

function runsMoreThanOncePerDay(schedule: string) {
  const fields = schedule.trim().split(/\s+/);

  if (fields.length !== 5) {
    return true;
  }

  const [minute, hour] = fields;
  const hasMultipleMinutes =
    minute === "*" || minute.includes(",") || minute.includes("/") || minute.includes("-");
  const hasMultipleHours =
    hour === "*" || hour.includes(",") || hour.includes("/") || hour.includes("-");

  return hasMultipleMinutes || hasMultipleHours;
}

describe("Vercel deployment config", () => {
  it("hanya memakai cron maksimal sekali sehari agar kompatibel dengan Hobby", () => {
    const config = JSON.parse(
      readFileSync(new URL("../vercel.json", import.meta.url), "utf8")
    ) as VercelConfig;

    expect(config.crons?.length).toBeGreaterThan(0);

    for (const cron of config.crons ?? []) {
      expect(
        runsMoreThanOncePerDay(cron.schedule),
        `${cron.path} memakai jadwal ${cron.schedule}`
      ).toBe(false);
    }
  });
});
