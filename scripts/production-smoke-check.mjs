const DEFAULT_WEB_URL = "https://sakuin-web.vercel.app";
const DEFAULT_API_URL = "https://sakuin-api.vercel.app";

const webUrl = process.env.SAKUIN_SMOKE_WEB_URL || DEFAULT_WEB_URL;
const apiUrl = process.env.SAKUIN_SMOKE_API_URL || DEFAULT_API_URL;

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/json"
    }
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${text.slice(0, 200)}`);
  }

  return text;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${body.slice(0, 200)}`);
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(`${url} did not return valid JSON`);
  }
}

async function fetchJsonWithExpectedStatus(url, expectedStatus, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers
    }
  });
  const body = await response.text();

  if (response.status !== expectedStatus) {
    throw new Error(
      `${url} returned ${response.status}, expected ${expectedStatus}: ${body.slice(0, 200)}`
    );
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(`${url} did not return valid JSON`);
  }
}

function assertSakuinHtml(html) {
  if (!html.includes("<html") || !html.includes("Sakuin")) {
    throw new Error("Frontend HTML does not look like the Sakuin app shell.");
  }
}

function assertSuccessPayload(name, payload) {
  if (!payload || payload.success !== true || !payload.data) {
    throw new Error(`${name} did not return the expected success payload.`);
  }
}

const checks = [
  {
    name: "web app shell",
    run: async () => {
      const html = await fetchText(webUrl);
      assertSakuinHtml(html);
    }
  },
  {
    name: "root health",
    run: async () => {
      const payload = await fetchJson(`${apiUrl}/health`);
      assertSuccessPayload("root health", payload);
      if (payload.data.status !== "ok") {
        throw new Error("Root health status is not ok.");
      }
    }
  },
  {
    name: "api health",
    run: async () => {
      const payload = await fetchJson(`${apiUrl}/api/health`);
      assertSuccessPayload("api health", payload);
      if (payload.data.status !== "ok") {
        throw new Error("API health status is not ok.");
      }
    }
  },
  {
    name: "app version",
    run: async () => {
      const payload = await fetchJson(`${apiUrl}/api/app-version`);
      assertSuccessPayload("app version", payload);
      if (!payload.data.latestVersionName || !payload.data.apkDownloadUrl) {
        throw new Error("App version metadata is incomplete.");
      }
    }
  },
  {
    name: "protected summary route",
    run: async () => {
      const payload = await fetchJsonWithExpectedStatus(
        `${apiUrl}/api/summary`,
        401
      );
      if (payload.message !== "Authorization header wajib diisi") {
        throw new Error("Protected summary route did not reach auth middleware.");
      }
    }
  },
  {
    name: "login route validation",
    run: async () => {
      const payload = await fetchJsonWithExpectedStatus(
        `${apiUrl}/api/auth/login`,
        400,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({})
        }
      );
      if (payload.message === "Route tidak ditemukan") {
        throw new Error("Login route fell through to 404.");
      }
    }
  }
];

const failures = [];

for (const check of checks) {
  try {
    await check.run();
    console.log(`Smoke check passed: ${check.name}`);
  } catch (error) {
    failures.push(
      `${check.name}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

if (failures.length > 0) {
  console.error("Production smoke check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Production smoke check passed.");
