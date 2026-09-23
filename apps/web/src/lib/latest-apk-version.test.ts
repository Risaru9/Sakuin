import { fetchLatestApkVersion } from "./latest-apk-version";

const version = {
  latestVersionCode: 23,
  latestVersionName: "2.5.0",
  apkDownloadUrl: "https://sakuin-web.vercel.app/downloads/sakuin.apk?v=23",
  releaseNotes: ["Perbaikan widget"],
  forceUpdate: false,
  publishedAt: "2026-09-20T09:15:00.000Z"
};

afterEach(() => vi.unstubAllGlobals());

it("checks the live API without using an old cache", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ success: true, data: version }), { status: 200 })
  );
  vi.stubGlobal("fetch", fetchMock);

  expect(await fetchLatestApkVersion()).toEqual(version);
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining("/api/app-version"),
    expect.objectContaining({ cache: "no-store" })
  );
});

it("uses the static metadata when the API fails, but rejects invalid version data", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(version), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  expect(await fetchLatestApkVersion()).toEqual(version);
  expect(fetchMock).toHaveBeenLastCalledWith(
    "/latest-version.json",
    expect.objectContaining({ cache: "no-store" })
  );

  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: {} }), { status: 200 }));
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ latestVersionName: "2.5.0" }), { status: 200 }));
  await expect(fetchLatestApkVersion()).rejects.toThrow("tidak lengkap");
});
