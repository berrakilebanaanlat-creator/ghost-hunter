/**
 * Ayarlar Yöneticisi
 * Tüm uygulama ayarlarını AsyncStorage ile kalıcı olarak saklar.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================
// TİPLER
// ============================================================

export interface AppSettings {
  // Genel
  theme: "dark" | "light" | "auto";
  language: "tr" | "en";
  hapticFeedback: boolean;
  keepScreenAwake: boolean;

  // VOX Ayarları
  voxSensitivity: number; // 1-10
  voxWhiteNoiseMode: "off" | "slow" | "fast" | "continuous";
  voxReverb: number; // 0-100
  voxEcho: number; // 0-100
  voxDistortion: number; // 0-100
  voxAutoSpeak: boolean;
  voxVoiceCharacter: string;

  // EMF Ayarları
  emfSensitivity: number; // 1-10
  emfAlertThreshold: number; // mG değeri
  emfSoundAlert: boolean;
  emfVibrationAlert: boolean;

  // SLS Ayarları
  slsCamera: "back" | "front";
  slsSensitivity: number; // 1-10
  slsAutoCapture: boolean;
  slsShowGrid: boolean;
  slsShowPointCloud: boolean;
  slsDefaultMode: "normal" | "thermal";

  // Radar Ayarları
  radarRange: number; // metre
  radarSensitivity: number; // 1-10
  radarSoundAlert: boolean;

  // EVP Ayarları
  evpRecordingQuality: "low" | "medium" | "high";
  evpAutoAnalyze: boolean;
  evpNoiseReduction: boolean;

  // Bildirimler
  notificationsEnabled: boolean;
  notificationSound: boolean;
  notificationVibration: boolean;
}

// Varsayılan ayarlar
export const DEFAULT_SETTINGS: AppSettings = {
  // Genel
  theme: "dark",
  language: "tr",
  hapticFeedback: true,
  keepScreenAwake: true,

  // VOX
  voxSensitivity: 5,
  voxWhiteNoiseMode: "slow",
  voxReverb: 40,
  voxEcho: 30,
  voxDistortion: 20,
  voxAutoSpeak: true,
  voxVoiceCharacter: "random",

  // EMF
  emfSensitivity: 5,
  emfAlertThreshold: 5,
  emfSoundAlert: true,
  emfVibrationAlert: true,

  // SLS
  slsCamera: "back",
  slsSensitivity: 5,
  slsAutoCapture: false,
  slsShowGrid: true,
  slsShowPointCloud: true,
  slsDefaultMode: "normal",

  // Radar
  radarRange: 50,
  radarSensitivity: 5,
  radarSoundAlert: true,

  // EVP
  evpRecordingQuality: "high",
  evpAutoAnalyze: true,
  evpNoiseReduction: true,

  // Bildirimler
  notificationsEnabled: true,
  notificationSound: true,
  notificationVibration: true,
};

const SETTINGS_KEY = "@antik_ghost_settings";

export class SettingsManager {
  private static cache: AppSettings | null = null;

  /**
   * Tüm ayarları yükle
   */
  static async getSettings(): Promise<AppSettings> {
    if (this.cache) return { ...this.cache };

    try {
      const data = await AsyncStorage.getItem(SETTINGS_KEY);
      if (data) {
        const parsed = JSON.parse(data) as Partial<AppSettings>;
        // Eksik ayarları varsayılanlarla doldur
        this.cache = { ...DEFAULT_SETTINGS, ...parsed } as AppSettings;
      } else {
        this.cache = { ...DEFAULT_SETTINGS };
      }
      return { ...this.cache };
    } catch (error) {
      console.error("Ayarlar yüklenemedi:", error);
      this.cache = { ...DEFAULT_SETTINGS };
      return { ...this.cache };
    }
  }

  /**
   * Tek bir ayarı güncelle
   */
  static async setSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> {
    try {
      const settings = await this.getSettings();
      settings[key] = value;
      this.cache = settings;
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error(`Ayar kaydedilemedi (${key}):`, error);
    }
  }

  /**
   * Birden fazla ayarı güncelle
   */
  static async setSettings(
    updates: Partial<AppSettings>
  ): Promise<void> {
    try {
      const settings = await this.getSettings();
      const updated = { ...settings, ...updates };
      this.cache = updated;
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Ayarlar kaydedilemedi:", error);
    }
  }

  /**
   * Tek bir ayarı oku
   */
  static async getSetting<K extends keyof AppSettings>(
    key: K
  ): Promise<AppSettings[K]> {
    const settings = await this.getSettings();
    return settings[key];
  }

  /**
   * Tüm ayarları varsayılana sıfırla
   */
  static async resetSettings(): Promise<void> {
    try {
      this.cache = { ...DEFAULT_SETTINGS };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (error) {
      console.error("Ayarlar sıfırlanamadı:", error);
    }
  }

  /**
   * Belirli bir kategoriyi sıfırla
   */
  static async resetCategory(
    category: "vox" | "emf" | "sls" | "radar" | "evp" | "general" | "notifications"
  ): Promise<void> {
    const prefixMap: Record<string, string[]> = {
      vox: ["voxSensitivity", "voxWhiteNoiseMode", "voxReverb", "voxEcho", "voxDistortion", "voxAutoSpeak", "voxVoiceCharacter"],
      emf: ["emfSensitivity", "emfAlertThreshold", "emfSoundAlert", "emfVibrationAlert"],
      sls: ["slsCamera", "slsSensitivity", "slsAutoCapture", "slsShowGrid", "slsShowPointCloud", "slsDefaultMode"],
      radar: ["radarRange", "radarSensitivity", "radarSoundAlert"],
      evp: ["evpRecordingQuality", "evpAutoAnalyze", "evpNoiseReduction"],
      general: ["theme", "language", "hapticFeedback", "keepScreenAwake"],
      notifications: ["notificationsEnabled", "notificationSound", "notificationVibration"],
    };

    const keys = prefixMap[category];
    if (!keys) return;

    const updates: Partial<AppSettings> = {};
    for (const key of keys) {
      (updates as any)[key] = (DEFAULT_SETTINGS as any)[key];
    }
    await this.setSettings(updates);
  }

  /**
   * Cache'i temizle (test için)
   */
  static clearCache(): void {
    this.cache = null;
  }
}
