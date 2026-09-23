import { clearSakuinWebCaches } from "./pwa";

afterEach(() => vi.unstubAllGlobals());

it("clears only web shell caches and keeps widget authentication", async () => {
  const deleteCache = vi.fn().mockResolvedValue(true);
  vi.stubGlobal("caches", {
    keys: vi.fn().mockResolvedValue([
      "sakuin-pwa-v11-static",
      "sakuin-pwa-v11-runtime",
      "sakuin-auth",
      "unrelated-cache"
    ]),
    delete: deleteCache
  });

  await clearSakuinWebCaches();

  expect(deleteCache).toHaveBeenCalledTimes(2);
  expect(deleteCache).toHaveBeenCalledWith("sakuin-pwa-v11-static");
  expect(deleteCache).toHaveBeenCalledWith("sakuin-pwa-v11-runtime");
});
