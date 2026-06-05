/**
 * Settings Manager Test Suite
 * Ayarlar yöneticisinin doğru çalıştığını test eder
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SettingsManager,
  DEFAULT_SETTINGS,
  AppSettings,
} from "../settings-manager";

// AsyncStorage mock
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
  },
}));

describe("SettingsManager", () => {
  beforeEach(() => {
    // Her test öncesi storage ve cache temizle
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    SettingsManager.clearCache();
  });

  it("varsayılan ayarları döndürmeli (boş storage)", async () => {
    const settings = await SettingsManager.getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it("varsayılan tema 'dark' olmalı", async () => {
    const theme = await SettingsManager.getSetting("theme");
    expect(theme).toBe("dark");
  });

  it("varsayılan dil 'tr' olmalı", async () => {
    const lang = await SettingsManager.getSetting("language");
    expect(lang).toBe("tr");
  });

  it("tek bir ayarı güncelleyebilmeli", async () => {
    await SettingsManager.setSetting("theme", "light");
    const theme = await SettingsManager.getSetting("theme");
    expect(theme).toBe("light");
  });

  it("birden fazla ayarı güncelleyebilmeli", async () => {
    await SettingsManager.setSettings({
      voxSensitivity: 8,
      voxReverb: 60,
      voxEcho: 50,
    });
    const settings = await SettingsManager.getSettings();
    expect(settings.voxSensitivity).toBe(8);
    expect(settings.voxReverb).toBe(60);
    expect(settings.voxEcho).toBe(50);
  });

  it("güncelleme sonrası diğer ayarlar korunmalı", async () => {
    await SettingsManager.setSetting("emfSensitivity", 9);
    const settings = await SettingsManager.getSettings();
    expect(settings.emfSensitivity).toBe(9);
    expect(settings.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(settings.hapticFeedback).toBe(DEFAULT_SETTINGS.hapticFeedback);
  });

  it("tüm ayarları sıfırlayabilmeli", async () => {
    await SettingsManager.setSetting("theme", "light");
    await SettingsManager.setSetting("voxSensitivity", 10);
    await SettingsManager.resetSettings();
    const settings = await SettingsManager.getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it("belirli bir kategoriyi sıfırlayabilmeli", async () => {
    await SettingsManager.setSettings({
      voxSensitivity: 10,
      voxReverb: 90,
      emfSensitivity: 8,
    });
    await SettingsManager.resetCategory("vox");
    const settings = await SettingsManager.getSettings();
    expect(settings.voxSensitivity).toBe(DEFAULT_SETTINGS.voxSensitivity);
    expect(settings.voxReverb).toBe(DEFAULT_SETTINGS.voxReverb);
    // EMF ayarı korunmalı
    expect(settings.emfSensitivity).toBe(8);
  });

  it("SLS kategori sıfırlaması doğru çalışmalı", async () => {
    await SettingsManager.setSettings({
      slsSensitivity: 10,
      slsShowGrid: false,
      slsDefaultMode: "thermal",
    });
    await SettingsManager.resetCategory("sls");
    const settings = await SettingsManager.getSettings();
    expect(settings.slsSensitivity).toBe(DEFAULT_SETTINGS.slsSensitivity);
    expect(settings.slsShowGrid).toBe(DEFAULT_SETTINGS.slsShowGrid);
    expect(settings.slsDefaultMode).toBe(DEFAULT_SETTINGS.slsDefaultMode);
  });

  it("hapticFeedback varsayılan olarak true olmalı", async () => {
    const val = await SettingsManager.getSetting("hapticFeedback");
    expect(val).toBe(true);
  });

  it("keepScreenAwake varsayılan olarak true olmalı", async () => {
    const val = await SettingsManager.getSetting("keepScreenAwake");
    expect(val).toBe(true);
  });

  it("VOX varsayılan beyaz gürültü modu 'slow' olmalı", async () => {
    const val = await SettingsManager.getSetting("voxWhiteNoiseMode");
    expect(val).toBe("slow");
  });

  it("EVP varsayılan kayıt kalitesi 'high' olmalı", async () => {
    const val = await SettingsManager.getSetting("evpRecordingQuality");
    expect(val).toBe("high");
  });

  it("cache temizlendikten sonra storage'dan yüklemeli", async () => {
    await SettingsManager.setSetting("theme", "light");
    SettingsManager.clearCache();
    const theme = await SettingsManager.getSetting("theme");
    expect(theme).toBe("light");
  });

  it("tüm varsayılan ayar anahtarları tanımlı olmalı", () => {
    const keys = Object.keys(DEFAULT_SETTINGS);
    expect(keys.length).toBeGreaterThan(25);
    expect(keys).toContain("theme");
    expect(keys).toContain("voxSensitivity");
    expect(keys).toContain("emfSensitivity");
    expect(keys).toContain("slsSensitivity");
    expect(keys).toContain("radarRange");
    expect(keys).toContain("evpRecordingQuality");
    expect(keys).toContain("notificationsEnabled");
  });
});
