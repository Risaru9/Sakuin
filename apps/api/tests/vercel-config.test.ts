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
  it("menjalankan reminder tiap jam dan job lain maksimal sekali sehari", () => {
    const config = JSON.parse(
      readFileSync(new URL("../vercel.json", import.meta.url), "utf8")
    ) as VercelConfig;

    expect(config.crons?.length).toBeGreaterThan(0);

    for (const cron of config.crons ?? []) {
      if (cron.path === "/api/reminders/run") {
        expect(cron.schedule).toBe("0 * * * *");
      } else {
        expect(
          runsMoreThanOncePerDay(cron.schedule),
          `${cron.path} memakai jadwal ${cron.schedule}`
        ).toBe(false);
      }
    }
  });
});
