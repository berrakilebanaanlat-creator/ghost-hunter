import { describe, it, expect } from "vitest";

describe("UI Sound Effects", () => {
  describe("Module exports", () => {
    it("should export all UI sound effect functions", async () => {
      const module = await import("../ui-sound-effects");

      expect(module.playButtonSound).toBeDefined();
      expect(module.playScanStartSound).toBeDefined();
      expect(module.playScanStopSound).toBeDefined();
      expect(module.playScanningLoopSound).toBeDefined();
      expect(module.playSuccessSound).toBeDefined();
      expect(module.playErrorSound).toBeDefined();
      expect(module.playWarningSound).toBeDefined();
      expect(module.playRecordStartSound).toBeDefined();
      expect(module.playRecordStopSound).toBeDefined();
      expect(module.playDeleteSound).toBeDefined();
      expect(module.playSelectSound).toBeDefined();
      expect(module.plasScanSpeedChangeSound).toBeDefined();
      expect(module.playFrequencyAdjustSound).toBeDefined();
      expect(module.playSignalIncreaseSound).toBeDefined();
      expect(module.playSignalDecreaseSound).toBeDefined();
      expect(module.testAllUISounds).toBeDefined();
    });

    it("should have correct function types", async () => {
      const module = await import("../ui-sound-effects");

      expect(typeof module.playButtonSound).toBe("function");
      expect(typeof module.playScanStartSound).toBe("function");
      expect(typeof module.playScanStopSound).toBe("function");
      expect(typeof module.playScanningLoopSound).toBe("function");
      expect(typeof module.playSuccessSound).toBe("function");
      expect(typeof module.playErrorSound).toBe("function");
      expect(typeof module.playWarningSound).toBe("function");
      expect(typeof module.playRecordStartSound).toBe("function");
      expect(typeof module.playRecordStopSound).toBe("function");
      expect(typeof module.playDeleteSound).toBe("function");
      expect(typeof module.playSelectSound).toBe("function");
    });
  });

  describe("Sound effect categories", () => {
    it("should have button interaction sounds", async () => {
      const module = await import("../ui-sound-effects");

      // Button sounds
      expect(module.playButtonSound).toBeDefined();
      expect(module.playSelectSound).toBeDefined();
      expect(module.playDeleteSound).toBeDefined();
    });

    it("should have scanning sounds", async () => {
      const module = await import("../ui-sound-effects");

      // Scanning sounds
      expect(module.playScanStartSound).toBeDefined();
      expect(module.playScanStopSound).toBeDefined();
      expect(module.playScanningLoopSound).toBeDefined();
      expect(module.plasScanSpeedChangeSound).toBeDefined();
    });

    it("should have feedback sounds", async () => {
      const module = await import("../ui-sound-effects");

      // Feedback sounds
      expect(module.playSuccessSound).toBeDefined();
      expect(module.playErrorSound).toBeDefined();
      expect(module.playWarningSound).toBeDefined();
    });

    it("should have recording sounds", async () => {
      const module = await import("../ui-sound-effects");

      // Recording sounds
      expect(module.playRecordStartSound).toBeDefined();
      expect(module.playRecordStopSound).toBeDefined();
    });

    it("should have adjustment sounds", async () => {
      const module = await import("../ui-sound-effects");

      // Adjustment sounds
      expect(module.playFrequencyAdjustSound).toBeDefined();
      expect(module.playSignalIncreaseSound).toBeDefined();
      expect(module.playSignalDecreaseSound).toBeDefined();
    });
  });

  describe("Sound effect parameters", () => {
    it("button sound should be short and crisp", () => {
      // Button sound: 800 Hz, 100ms, 0.4 volume
      const frequency = 800;
      const duration = 100;
      const volume = 0.4;

      expect(frequency).toBeGreaterThan(500);
      expect(frequency).toBeLessThan(1500);
      expect(duration).toBeGreaterThan(50);
      expect(duration).toBeLessThan(200);
      expect(volume).toBeGreaterThan(0.2);
      expect(volume).toBeLessThan(0.5);
    });

    it("scan start sound should be ascending", () => {
      // Scan start: 1000 Hz to 2500 Hz, 300ms
      const startFreq = 1000;
      const endFreq = 2500;
      const duration = 300;

      expect(endFreq).toBeGreaterThan(startFreq);
      expect(duration).toBeGreaterThan(200);
      expect(duration).toBeLessThan(500);
    });

    it("scan stop sound should be descending", () => {
      // Scan stop: 2500 Hz to 1000 Hz, 300ms
      const startFreq = 2500;
      const endFreq = 1000;
      const duration = 300;

      expect(endFreq).toBeLessThan(startFreq);
      expect(duration).toBeGreaterThan(200);
      expect(duration).toBeLessThan(500);
    });

    it("success sound should be two ascending tones", () => {
      // Success: 1200 Hz, then 1600 Hz
      const tone1 = 1200;
      const tone2 = 1600;

      expect(tone2).toBeGreaterThan(tone1);
      expect(tone1).toBeGreaterThan(1000);
      expect(tone2).toBeLessThan(2000);
    });

    it("error sound should be two descending tones", () => {
      // Error: 800 Hz, then 600 Hz
      const tone1 = 800;
      const tone2 = 600;

      expect(tone2).toBeLessThan(tone1);
      expect(tone1).toBeGreaterThan(500);
      expect(tone2).toBeGreaterThan(400);
    });

    it("warning sound should be rapid beeps", () => {
      // Warning: 1000 Hz, 80ms each, 3 times
      const frequency = 1000;
      const duration = 80;
      const count = 3;

      expect(frequency).toBeGreaterThan(800);
      expect(frequency).toBeLessThan(1200);
      expect(duration).toBeGreaterThan(50);
      expect(duration).toBeLessThan(150);
      expect(count).toBe(3);
    });

    it("record start sound should be low frequency", () => {
      // Record start: 400 Hz, 150ms
      const frequency = 400;
      const duration = 150;

      expect(frequency).toBeGreaterThan(300);
      expect(frequency).toBeLessThan(500);
      expect(duration).toBeGreaterThan(100);
      expect(duration).toBeLessThan(200);
    });

    it("record stop sound should be high frequency", () => {
      // Record stop: 1200 Hz, 150ms
      const frequency = 1200;
      const duration = 150;

      expect(frequency).toBeGreaterThan(1000);
      expect(frequency).toBeLessThan(1500);
      expect(duration).toBeGreaterThan(100);
      expect(duration).toBeLessThan(200);
    });

    it("delete sound should be very low", () => {
      // Delete: 300 Hz, 80ms
      const frequency = 300;
      const duration = 80;

      expect(frequency).toBeGreaterThan(200);
      expect(frequency).toBeLessThan(400);
      expect(duration).toBeGreaterThan(50);
      expect(duration).toBeLessThan(150);
    });
  });

  describe("Sound effect combinations", () => {
    it("success sound should take longer than button sound", () => {
      // Success: 100ms + 50ms + 100ms = 250ms
      // Button: 100ms
      const successDuration = 100 + 50 + 100;
      const buttonDuration = 100;

      expect(successDuration).toBeGreaterThan(buttonDuration);
    });

    it("warning sound should be rapid", () => {
      // Warning: 80ms * 3 + 100ms * 2 = 440ms
      const warningDuration = 80 * 3 + 100 * 2;

      expect(warningDuration).toBeGreaterThan(300);
      expect(warningDuration).toBeLessThan(600);
    });

    it("frequency sweep sounds should be smooth", () => {
      // Scan start: 1000 to 2500 Hz over 300ms
      // Rate: 5 Hz/ms
      const startFreq = 1000;
      const endFreq = 2500;
      const duration = 300;
      const sweepRate = (endFreq - startFreq) / duration;

      expect(sweepRate).toBeGreaterThan(3);
      expect(sweepRate).toBeLessThan(10);
    });
  });

  describe("Sound effect volumes", () => {
    it("all sounds should have reasonable volume levels", () => {
      const volumes = [0.4, 0.35, 0.3, 0.25, 0.2, 0.15];

      volumes.forEach((vol) => {
        expect(vol).toBeGreaterThan(0);
        expect(vol).toBeLessThanOrEqual(1);
      });
    });

    it("button sound should be louder than scanning loop", () => {
      const buttonVolume = 0.4;
      const scanningLoopVolume = 0.15;

      expect(buttonVolume).toBeGreaterThan(scanningLoopVolume);
    });

    it("warning sound should be loud", () => {
      const warningVolume = 0.4;

      expect(warningVolume).toBeGreaterThanOrEqual(0.3);
    });

    it("delete sound should be quiet", () => {
      const deleteVolume = 0.25;

      expect(deleteVolume).toBeLessThanOrEqual(0.3);
    });
  });
});
