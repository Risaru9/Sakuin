const DEFAULT_FORBIDDEN_DATABASE_PROJECT_REFS = ["bwzxtjgrerjimcuyslci"];

type DatabaseSafetyCheckInput = {
  databaseUrl?: string;
  directUrl?: string;
  nodeEnv?: string;
  vercelEnv?: string;
  databaseTarget?: string;
  productionDatabaseProjectRef?: string;
};

function splitRefs(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function maskDatabaseUrl(value: string | undefined) {
  if (!value) {
    return "-";
  }

  try {
    const url = new URL(value);

    return `${url.protocol}//${url.username ? "***" : ""}${url.username ? "@" : ""}${url.host}${url.pathname}`;
  } catch {
    return "[invalid database url]";
  }
}

function normalizeTarget(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function assertNoForbiddenProjectRef(
  label: string,
  value: string | undefined,
  forbiddenRefs: string[]
) {
  if (!value) {
    return;
  }

  const matchedRef = forbiddenRefs.find((ref) => value.includes(ref));

  if (!matchedRef) {
    return;
  }

  throw new Error(
    [
      "Database safety guard blocked the test run.",
      `${label} points to a forbidden production database project ref.`,
      `Matched project ref: ${matchedRef}`,
      `Masked ${label}: ${maskDatabaseUrl(value)}`,
      "Fix: use a dedicated test/dev database for local tests and GitHub Actions."
    ].join("\n")
  );
}

export function assertSafeTestDatabase(input: DatabaseSafetyCheckInput = {}) {
  const databaseUrl = input.databaseUrl ?? process.env.DATABASE_URL;
  const directUrl = input.directUrl ?? process.env.DIRECT_URL;
  const nodeEnv = normalizeTarget(input.nodeEnv ?? process.env.NODE_ENV);
  const vercelEnv = normalizeTarget(input.vercelEnv ?? process.env.VERCEL_ENV);
  const databaseTarget = normalizeTarget(
    input.databaseTarget ?? process.env.SAKUIN_DATABASE_TARGET
  );

  const forbiddenRefs = [
    ...DEFAULT_FORBIDDEN_DATABASE_PROJECT_REFS,
    ...splitRefs(
      input.productionDatabaseProjectRef ??
        process.env.SAKUIN_PRODUCTION_DATABASE_PROJECT_REF
    )
  ];

  const uniqueForbiddenRefs = [...new Set(forbiddenRefs)];

  if (!databaseUrl) {
    throw new Error(
      [
        "Database safety guard blocked the test run.",
        "DATABASE_URL is missing.",
        "Fix: configure DATABASE_URL to point to a dedicated test/dev database."
      ].join("\n")
    );
  }

  if (nodeEnv === "production" || vercelEnv === "production") {
    throw new Error(
      [
        "Database safety guard blocked the test run.",
        "Tests must never run with production runtime environment.",
        `NODE_ENV=${nodeEnv || "-"}`,
        `VERCEL_ENV=${vercelEnv || "-"}`,
        "Fix: run tests with a test/dev environment only."
      ].join("\n")
    );
  }

  if (!["test", "dev", "development", "ci"].includes(databaseTarget)) {
    throw new Error(
      [
        "Database safety guard blocked the test run.",
        "SAKUIN_DATABASE_TARGET must be explicitly set to test, dev, development, or ci before running backend tests.",
        `Current SAKUIN_DATABASE_TARGET=${databaseTarget || "-"}`,
        "Fix local: set SAKUIN_DATABASE_TARGET=\"test\" in apps/api/.env.",
        "Fix CI: set SAKUIN_DATABASE_TARGET=test in GitHub Actions secrets or workflow env."
      ].join("\n")
    );
  }

  assertNoForbiddenProjectRef(
    "DATABASE_URL",
    databaseUrl,
    uniqueForbiddenRefs
  );

  assertNoForbiddenProjectRef("DIRECT_URL", directUrl, uniqueForbiddenRefs);
}