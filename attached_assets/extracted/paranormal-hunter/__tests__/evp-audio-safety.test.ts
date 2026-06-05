/**
 * EVP Audio Recorder Crash Safety Tests
 *
 * Crashlytics'teki 4 hatayı doğrulayan testler:
 * 1. SesKaydedici.kaydet IllegalStateException → state machine koruması
 * 2. SesKaydedici.KaydiDurdur IllegalStateException → native state kontrolü
 * 3. SesKaydedici.kaydet RuntimeException → izin kontrolü
 * 4. SesKaydedici.KaydiDurdur RuntimeException → defensive stop
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock expo-audio
vi.mock("expo-audio", () => ({
  requestRecordingPermissionsAsync: vi.fn(),
  getRecordingPermissionsAsync: vi.fn(),
  setAudioModeAsync: vi.fn(),
  createAudioPlayer: vi.fn(() => ({
    play: vi.fn(),
    remove: vi.fn(),
  })),
  useAudioRecorder: vi.fn(() => ({
    prepareToRecordAsync: vi.fn(),
    record: vi.fn(),
    stop: vi.fn(),
    uri: "file://test.m4a",
    isRecording: false,
  })),
  RecordingPresets: {
    HIGH_QUALITY: {},
  },
}));

// Mock react-native
vi.mock("react-native", () => ({
  Platform: { OS: "android" },
  Alert: { alert: vi.fn() },
}));

// Import after mocks
import {
  startRecording,
  stopRecording,
  setGlobalRecorder,
  getRecorderState,
  cleanup,
  isCurrentlyRecording,
} from "../lib/evp-audio-recorder";

import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";

const mockGetPerm = getRecordingPermissionsAsync as ReturnType<typeof vi.fn>;
const mockReqPerm = requestRecordingPermissionsAsync as ReturnType<typeof vi.fn>;
const mockSetAudioMode = setAudioModeAsync as ReturnType<typeof vi.fn>;

describe("EVP Audio Recorder - Crash Safety", () => {
  let mockRecorder: any;

  beforeEach(() => {
    // Reset state
    cleanup();

    // Create fresh mock recorder
    mockRecorder = {
      prepareToRecordAsync: vi.fn().mockResolvedValue(undefined),
      record: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
      uri: "file://test-recording.m4a",
      isRecording: false,
    };

    setGlobalRecorder(mockRecorder);

    // Default: permission granted
    mockGetPerm.mockResolvedValue({ granted: true });
    mockReqPerm.mockResolvedValue({ granted: true });
    mockSetAudioMode.mockResolvedValue(undefined);
  });

  // ============================================================
  // STATE MACHINE TESTS
  // ============================================================

  describe("State Machine", () => {
    it("should start in idle state", () => {
      expect(getRecorderState()).toBe("idle");
      expect(isCurrentlyRecording()).toBe(false);
    });

    it("should transition to recording on successful start", async () => {
      const result = await startRecording();
      expect(result).toBe(true);
      expect(getRecorderState()).toBe("recording");
      expect(isCurrentlyRecording()).toBe(true);
    });

    it("should transition back to idle on stop", async () => {
      await startRecording();
      mockRecorder.isRecording = true;
      const uri = await stopRecording();
      expect(uri).toBe("file://test-recording.m4a");
      expect(getRecorderState()).toBe("idle");
      expect(isCurrentlyRecording()).toBe(false);
    });

    it("should prevent double start (IllegalStateException koruması)", async () => {
      await startRecording();
      // İkinci start çağrısı engellenmeli
      const result = await startRecording();
      expect(result).toBe(false);
    });

    it("should prevent stop when not recording", async () => {
      // idle durumda stop çağrısı
      const result = await stopRecording();
      expect(result).toBeNull();
      expect(mockRecorder.stop).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // PERMISSION TESTS (RuntimeException koruması)
  // ============================================================

  describe("Permission Pre-Check", () => {
    it("should check existing permission before requesting", async () => {
      mockGetPerm.mockResolvedValue({ granted: true });
      await startRecording();
      expect(mockGetPerm).toHaveBeenCalled();
      // Already granted, should not request again
      expect(mockReqPerm).not.toHaveBeenCalled();
    });

    it("should request permission if not granted", async () => {
      mockGetPerm.mockResolvedValue({ granted: false });
      mockReqPerm.mockResolvedValue({ granted: true });
      await startRecording();
      expect(mockReqPerm).toHaveBeenCalled();
    });

    it("should fail gracefully if permission denied", async () => {
      mockGetPerm.mockResolvedValue({ granted: false });
      mockReqPerm.mockResolvedValue({ granted: false });
      const result = await startRecording();
      expect(result).toBe(false);
      expect(getRecorderState()).toBe("idle");
      // record() should never be called
      expect(mockRecorder.record).not.toHaveBeenCalled();
    });

    it("should fail gracefully if permission check throws", async () => {
      mockGetPerm.mockRejectedValue(new Error("Permission API crash"));
      const result = await startRecording();
      expect(result).toBe(false);
      expect(getRecorderState()).toBe("idle");
    });
  });

  // ============================================================
  // NATIVE STATE VALIDATION (IllegalStateException koruması)
  // ============================================================

  describe("Native State Validation", () => {
    it("should skip stop() if native recorder already stopped", async () => {
      await startRecording();
      // Native tarafta recorder zaten durmuş
      mockRecorder.isRecording = false;
      const uri = await stopRecording();
      // stop() çağrılmamalı - IllegalStateException önlendi
      expect(mockRecorder.stop).not.toHaveBeenCalled();
      expect(uri).toBe("file://test-recording.m4a");
      expect(getRecorderState()).toBe("idle");
    });

    it("should call stop() if native recorder is actually recording", async () => {
      await startRecording();
      mockRecorder.isRecording = true;
      await stopRecording();
      expect(mockRecorder.stop).toHaveBeenCalled();
    });

    it("should pre-stop if recorder is already recording on start", async () => {
      mockRecorder.isRecording = true;
      await startRecording();
      // İlk stop çağrısı (pre-stop) yapılmalı
      expect(mockRecorder.stop).toHaveBeenCalled();
    });
  });

  // ============================================================
  // ERROR HANDLING (RuntimeException koruması)
  // ============================================================

  describe("Error Handling", () => {
    it("should recover from prepare failure", async () => {
      mockRecorder.prepareToRecordAsync.mockRejectedValue(
        new Error("prepare failed")
      );
      const result = await startRecording();
      expect(result).toBe(false);
      expect(getRecorderState()).toBe("idle");
      // record() should never be called
      expect(mockRecorder.record).not.toHaveBeenCalled();
    });

    it("should recover from record() IllegalStateException", async () => {
      mockRecorder.record.mockImplementation(() => {
        throw new Error("IllegalStateException: not prepared");
      });
      const result = await startRecording();
      expect(result).toBe(false);
      expect(getRecorderState()).toBe("idle");
    });

    it("should recover from stop() RuntimeException", async () => {
      await startRecording();
      mockRecorder.isRecording = true;
      mockRecorder.stop.mockRejectedValue(
        new Error("RuntimeException: duraklatma başarısız")
      );
      // stop hatası olsa bile state temizlenmeli
      const uri = await stopRecording();
      expect(getRecorderState()).toBe("idle");
      expect(isCurrentlyRecording()).toBe(false);
    });

    it("should recover from setAudioModeAsync failure", async () => {
      mockSetAudioMode.mockRejectedValue(new Error("audio mode failed"));
      const result = await startRecording();
      expect(result).toBe(false);
      expect(getRecorderState()).toBe("idle");
    });

    it("should not crash if recorder is null", async () => {
      setGlobalRecorder(null);
      const result = await startRecording();
      expect(result).toBe(false);
      expect(getRecorderState()).toBe("idle");
    });
  });

  // ============================================================
  // MUTEX LOCK (Hızlı tıklama koruması)
  // ============================================================

  describe("Mutex Lock", () => {
    it("should prevent concurrent start operations", async () => {
      // İki start'ı aynı anda çağır
      const [result1, result2] = await Promise.all([
        startRecording(),
        startRecording(),
      ]);
      // Biri başarılı, diğeri engellenmeli
      const successCount = [result1, result2].filter(Boolean).length;
      expect(successCount).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================
  // CLEANUP
  // ============================================================

  describe("Cleanup", () => {
    it("should reset all state on cleanup", async () => {
      await startRecording();
      mockRecorder.isRecording = true;
      cleanup();
      expect(getRecorderState()).toBe("idle");
      expect(isCurrentlyRecording()).toBe(false);
    });

    it("should not crash on double cleanup", () => {
      cleanup();
      cleanup(); // İkinci cleanup çökmemeli
      expect(getRecorderState()).toBe("idle");
    });
  });
});
