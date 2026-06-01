import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

const checks = [
  {
    file: "apps/api/src/app.ts",
    forbidden: "c.req.query(\"debug\")",
    message: "Production API must not expose debug query responses."
  },
  {
    file: "apps/api/src/app.ts",
    forbidden: "debug_tag",
    message: "Health responses must not include temporary debug tags."
  },
  {
    file: "README.md",
    forbidden: "aaa bbb ccc__",
    message: "README contains leftover scratch text."
  },
  {
    file: "apps/api/src/modules/summary/summary.service.ts",
    forbidden: "Starting getSummary for userId",
    message: "Summary logs must not include raw user identifiers."
  },
  {
    file: "apps/api/src/modules/ai/ai-financial-context.ts",
    forbidden: "for user: ${userId}",
    message: "AI financial context logs must not include raw user identifiers."
  },
  {
    file: "apps/api/src/modules/ai/ai-financial-context-cache.ts",
    forbidden: "for user: ${userId}",
    message: "AI financial context cache logs must not include raw user identifiers."
  }
];

const failures = [];

for (const check of checks) {
  const filePath = join(rootDir, check.file);
  const content = readFileSync(filePath, "utf8");

  if (content.includes(check.forbidden)) {
    failures.push(`${check.file}: ${check.message}`);
  }
}

const webVersion = JSON.parse(
  readFileSync(join(rootDir, "apps/web/public/latest-version.json"), "utf8")
);
const apiVersionConfig = readFileSync(
  join(rootDir, "apps/api/src/config/app-version.ts"),
  "utf8"
);
const apiVercelConfig = JSON.parse(
  readFileSync(join(rootDir, "apps/api/vercel.json"), "utf8")
);

if (!apiVersionConfig.includes(`latestVersionCode: ${webVersion.latestVersionCode}`)) {
  failures.push(
    "apps/api/src/config/app-version.ts: latestVersionCode must match apps/web/public/latest-version.json."
  );
}

if (!apiVersionConfig.includes(`latestVersionName: "${webVersion.latestVersionName}"`)) {
  failures.push(
    "apps/api/src/config/app-version.ts: latestVersionName must match apps/web/public/latest-version.json."
  );
}

const expectedCronSchedules = new Map([
  ["/api/reminders/run", "0 1 * * *"],
  ["/api/ai/proactive-insight", "0 2 * * 0"]
]);

for (const cron of apiVercelConfig.crons ?? []) {
  const expectedSchedule = expectedCronSchedules.get(cron.path);

  if (expectedSchedule && cron.schedule !== expectedSchedule) {
    failures.push(
      `apps/api/vercel.json: ${cron.path} must keep the Hobby-compatible schedule ${expectedSchedule}.`
    );
  }
}

if (failures.length > 0) {
  console.error("Production safety check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Production safety check passed.");
