import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const apiRoot = fileURLToPath(new URL(".", import.meta.url));

function parseEnvValue(rawValue: string) {
  let value = rawValue.trim();

  const isDoubleQuoted = value.startsWith('"') && value.endsWith('"');
  const isSingleQuoted = value.startsWith("'") && value.endsWith("'");

  if (isDoubleQuoted || isSingleQuoted) {
    value = value.slice(1, -1);
  }

  return value;
}

function loadEnvFile(filePath: string, loadedKeys: Set<string>) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = parseEnvValue(line.slice(separatorIndex + 1));

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    const wasLoadedFromEnvFile = loadedKeys.has(key);
    const isMissingFromProcessEnv = process.env[key] === undefined;

    if (isMissingFromProcessEnv || wasLoadedFromEnvFile) {
      process.env[key] = value;
      loadedKeys.add(key);
    }
  }
}

function loadApiTestEnvironment(mode: string) {
  const loadedKeys = new Set<string>();

  const envFiles = [
    ".env",
    ".env.local",
    `.env.${mode}`,
    `.env.${mode}.local`
  ];

  for (const envFile of envFiles) {
    loadEnvFile(resolve(apiRoot, envFile), loadedKeys);
  }
}

export default defineConfig(({ mode }) => {
  loadApiTestEnvironment(mode);

  return {
    test: {
      environment: "node",
      setupFiles: ["./tests/setup.ts"],
      testTimeout: 20000,
      hookTimeout: 30000,
      fileParallelism: false
    }
  };
});