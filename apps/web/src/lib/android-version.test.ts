import { getInstalledAndroidVersion, isAndroidApp, readAndroidBridgeVersion } from "./android-version";

const native = vi.hoisted(() => ({
  getPlatform: vi.fn(),
  getInfo: vi.fn()
}));

vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: native.getPlatform } }));
vi.mock("@capacitor/app", () => ({ App: { getInfo: native.getInfo } }));

beforeEach(() => {
  native.getPlatform.mockReturnValue("web");
  native.getInfo.mockReset();
  delete window.AndroidWidgetBridge;
});

it("reads the actual APK version from the Android bridge", async () => {
  window.AndroidWidgetBridge = {
    saveConfig: vi.fn(),
    getAppVersionCode: () => 23,
    getAppVersionName: () => "2.5.0"
  };

  expect(isAndroidApp()).toBe(true);
  expect(readAndroidBridgeVersion()).toEqual({ code: 23, name: "2.5.0" });
  expect(await getInstalledAndroidVersion()).toEqual({ code: 23, name: "2.5.0" });
  expect(native.getInfo).not.toHaveBeenCalled();
});

it("falls back to Capacitor and never invents a legacy version", async () => {
  native.getPlatform.mockReturnValue("android");
  native.getInfo.mockResolvedValueOnce({ build: "23", version: "2.5.0" });
  expect(await getInstalledAndroidVersion()).toEqual({ code: 23, name: "2.5.0" });

  native.getInfo.mockRejectedValueOnce(new Error("bridge unavailable"));
  expect(await getInstalledAndroidVersion()).toBeNull();
});
