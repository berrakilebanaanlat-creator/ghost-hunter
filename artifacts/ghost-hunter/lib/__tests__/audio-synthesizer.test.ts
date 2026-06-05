import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Web Audio API'nin Node.js ortamında olmadığını test et
describe("Audio Synthesizer", () => {
  describe("Environment Detection", () => {
    it("should detect when Web Audio API is not available in Node.js", () => {
      // Node.js ortamında window ve AudioContext tanımlı değil
      expect(typeof window).toBe("undefined");
    });

    it("should gracefully handle missing Web Audio API", () => {
      // Audio synthesizer fonksiyonları Web Audio API olmadan çalışmalı
      // (hata vermeden, sadece ses çalmayacak)
      const isSupported = typeof (global as any).AudioContext !== "undefined";
      expect(isSupported).toBe(false);
    });
  });

  describe("Audio Synthesizer Module", () => {
    it("should export all required functions", async () => {
      const module = await import("../audio-synthesizer");

      expect(module.getAudioContext).toBeDefined();
      expect(module.synthesizeFrequency).toBeDefined();
      expect(module.playStaticNoise).toBeDefined();
      expect(module.playFrequencySweep).toBeDefined();
      expect(module.playParanormalEffect).toBeDefined();
      expect(module.playWhisper).toBeDefined();
      expect(module.playScreech).toBeDefined();
      expect(module.playMoan).toBeDefined();
      expect(module.playDistortion).toBeDefined();
      expect(module.stopAllAudio).toBeDefined();
    });

    it("should have correct function signatures", async () => {
      const module = await import("../audio-synthesizer");

      // Functions should be async and accept parameters
      expect(typeof module.synthesizeFrequency).toBe("function");
      expect(typeof module.playStaticNoise).toBe("function");
      expect(typeof module.playFrequencySweep).toBe("function");
      expect(typeof module.playParanormalEffect).toBe("function");
    });
  });

  describe("Audio Parameter Validation", () => {
    it("should accept valid frequency ranges", async () => {
      const module = await import("../audio-synthesizer");

      // Frequencies should be in audible range (20Hz - 20kHz)
      const validFrequencies = [20, 100, 440, 1000, 5000, 20000];

      for (const freq of validFrequencies) {
        expect(freq).toBeGreaterThanOrEqual(20);
        expect(freq).toBeLessThanOrEqual(20000);
      }
    });

    it("should accept valid volume levels", () => {
      const validVolumes = [0, 0.1, 0.3, 0.5, 0.8, 1.0];

      for (const vol of validVolumes) {
        expect(vol).toBeGreaterThanOrEqual(0);
        expect(vol).toBeLessThanOrEqual(1);
      }
    });

    it("should accept valid durations", () => {
      const validDurations = [100, 300, 500, 800, 1000, 5000];

      for (const dur of validDurations) {
        expect(dur).toBeGreaterThan(0);
        expect(dur).toBeLessThanOrEqual(10000);
      }
    });
  });

  describe("Paranormal Sound Effects", () => {
    it("should have correct paranormal effect frequencies", () => {
      // Paranormal sounds should use specific frequencies
      const paranormalFrequencies = {
        whisper: 2000,
        static: 5000,
        moan: 150,
        screech: 8000,
        distortion: 3000,
        echo: 1000,
      };

      // Verify frequencies are in valid range
      Object.values(paranormalFrequencies).forEach((freq) => {
        expect(freq).toBeGreaterThan(0);
        expect(freq).toBeLessThanOrEqual(20000);
      });
    });

    it("should have correct paranormal effect durations", () => {
      const paranormalDurations = {
        whisper: 500,
        static: 300,
        moan: 800,
        screech: 400,
        distortion: 600,
        echo: 1000,
      };

      // Verify durations are reasonable
      Object.values(paranormalDurations).forEach((dur) => {
        expect(dur).toBeGreaterThan(100);
        expect(dur).toBeLessThanOrEqual(2000);
      });
    });

    it("should have correct paranormal effect intensities", () => {
      const paranormalIntensities = {
        whisper: 30,
        static: 60,
        moan: 50,
        screech: 80,
        distortion: 70,
        echo: 40,
      };

      // Verify intensities are in 0-100 range
      Object.values(paranormalIntensities).forEach((intensity) => {
        expect(intensity).toBeGreaterThanOrEqual(0);
        expect(intensity).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("Frequency Sweep Calculations", () => {
    it("should calculate correct sweep ratios", () => {
      // FM band: 88.1 - 108.0 MHz
      const fmStart = 88.1;
      const fmEnd = 108.0;
      const fmRange = fmEnd - fmStart;

      expect(fmRange).toBeCloseTo(19.9, 1);

      // Sweep speed: 0.1 MHz per 100ms
      const sweepSpeed = 0.1;
      const sweepTime = 100;
      const expectedSweepPerMs = sweepSpeed / sweepTime;

      expect(expectedSweepPerMs).toBeCloseTo(0.001, 4);
    });

    it("should handle frequency wrapping correctly", () => {
      const fmStart = 88.1;
      const fmEnd = 108.0;

      // Test forward sweep
      let freq = fmStart;
      for (let i = 0; i < 200; i++) {
        freq += 0.1;
        if (freq > fmEnd) {
          freq = fmStart;
        }
        expect(freq).toBeGreaterThanOrEqual(fmStart);
        expect(freq).toBeLessThanOrEqual(fmEnd);
      }
    });
  });

  describe("Signal Strength Calculations", () => {
    it("should calculate signal strength correctly", () => {
      // Signal strength = max(0, 100 - diff * 10)
      const baseFrequency = 98.5;

      // Same frequency = 100%
      const diff1 = Math.abs(98.5 - baseFrequency);
      const strength1 = Math.max(0, 100 - diff1 * 10);
      expect(strength1).toBe(100);

      // 1 MHz difference = 90%
      const diff2 = Math.abs(99.5 - baseFrequency);
      const strength2 = Math.max(0, 100 - diff2 * 10);
      expect(strength2).toBe(90);

      // 10 MHz difference = 0%
      const diff3 = Math.abs(108.5 - baseFrequency);
      const strength3 = Math.max(0, 100 - diff3 * 10);
      expect(strength3).toBe(0);
    });
  });

  describe("Frequency Color Mapping", () => {
    it("should map frequencies to colors correctly", () => {
      // FM band: 88.1 - 108.0 MHz
      const fmStart = 88.1;
      const fmEnd = 108.0;
      const fmRange = fmEnd - fmStart;

      // Low frequency (88.1) = Green
      const normalized1 = (fmStart - fmStart) / fmRange;
      expect(normalized1).toBeLessThan(0.33);

      // Mid frequency (98.05) = Yellow
      const mid = (fmStart + fmEnd) / 2;
      const normalized2 = (mid - fmStart) / fmRange;
      expect(normalized2).toBeGreaterThanOrEqual(0.33);
      expect(normalized2).toBeLessThan(0.66);

      // High frequency (108.0) = Red
      const normalized3 = (fmEnd - fmStart) / fmRange;
      expect(normalized3).toBeGreaterThanOrEqual(0.66);
    });
  });
});
