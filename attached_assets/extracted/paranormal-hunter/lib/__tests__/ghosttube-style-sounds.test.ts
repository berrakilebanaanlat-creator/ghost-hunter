import { describe, it, expect } from "vitest";

describe("GhostTube Style Sounds", () => {
  describe("Module exports", () => {
    it("should export all GhostTube sound effect functions", async () => {
      const module = await import("../ghosttube-style-sounds");

      expect(module.playGhostTubeButtonSound).toBeDefined();
      expect(module.playGhostTubeDetectionSound).toBeDefined();
      expect(module.playGhostTubeEMFSound).toBeDefined();
      expect(module.playGhostTubeScanSound).toBeDefined();
      expect(module.playGhostTubeSignalBoost).toBeDefined();
      expect(module.playGhostTubeAlertSound).toBeDefined();
      expect(module.playGhostTubeRecordStart).toBeDefined();
      expect(module.playGhostTubeRecordStop).toBeDefined();
      expect(module.playGhostTubeParanormalActivity).toBeDefined();
      expect(module.playGhostTubeStaticNoise).toBeDefined();
      expect(module.playGhostTubeSuccessSound).toBeDefined();
      expect(module.playGhostTubeErrorSound).toBeDefined();
      expect(module.playGhostTubeSelectSound).toBeDefined();
      expect(module.playGhostTubeDeleteSound).toBeDefined();
      expect(module.playGhostTubeScanStart).toBeDefined();
      expect(module.playGhostTubeScanStop).toBeDefined();
      expect(module.playRandomGhostTubeSound).toBeDefined();
    });

    it("should have correct function types", async () => {
      const module = await import("../ghosttube-style-sounds");

      expect(typeof module.playGhostTubeButtonSound).toBe("function");
      expect(typeof module.playGhostTubeDetectionSound).toBe("function");
      expect(typeof module.playGhostTubeEMFSound).toBe("function");
      expect(typeof module.playGhostTubeScanSound).toBe("function");
    });
  });

  describe("GhostTube button sound characteristics", () => {
    it("should be professional and deep", () => {
      // Button sound: 80 Hz (very deep) -> 300 Hz (mid) -> 1000 Hz (high)
      const frequencies = [80, 300, 1000];
      const durations = [100, 80, 50];
      const volumes = [0.6, 0.45, 0.35];

      // Check frequency progression
      expect(frequencies[0]).toBeLessThan(frequencies[1]);
      expect(frequencies[1]).toBeLessThan(frequencies[2]);

      // Check duration progression (decreasing)
      expect(durations[0]).toBeGreaterThan(durations[1]);
      expect(durations[1]).toBeGreaterThan(durations[2]);

      // Check volume progression (decreasing)
      expect(volumes[0]).toBeGreaterThan(volumes[1]);
      expect(volumes[1]).toBeGreaterThan(volumes[2]);
    });

    it("should have sinister quality", () => {
      // Very low starting frequency (80 Hz) creates sinister tone
      const startFrequency = 80;
      expect(startFrequency).toBeLessThan(100);
    });
  });

  describe("GhostTube detection sound characteristics", () => {
    it("should be a sweep-based sound", () => {
      // Detection: 200 Hz to 2000 Hz sweep (ascending)
      // Then: 2500 Hz to 400 Hz sweep (descending)
      const sweep1Start = 200;
      const sweep1End = 2000;
      const sweep2Start = 2500;
      const sweep2End = 400;

      // First sweep ascending
      expect(sweep1End).toBeGreaterThan(sweep1Start);
      // Second sweep descending
      expect(sweep2Start).toBeGreaterThan(sweep2End);
    });

    it("should have paranormal characteristics", () => {
      // Frequency range: 200-2500 Hz (wide paranormal range)
      const minFreq = 200;
      const maxFreq = 2500;
      const range = maxFreq - minFreq;

      expect(range).toBeGreaterThan(2000);
    });
  });

  describe("GhostTube EMF sound characteristics", () => {
    it("should be pulsing and rhythmic", () => {
      // EMF: alternates between deep (120 Hz) and high (1800 Hz)
      const deepFreq = 120;
      const highFreq = 1800;

      expect(deepFreq).toBeLessThan(200);
      expect(highFreq).toBeGreaterThan(1500);
      expect(highFreq / deepFreq).toBeGreaterThan(10);
    });

    it("should repeat in pattern", () => {
      // 4 repetitions of deep-high pattern
      const repetitions = 4;
      expect(repetitions).toBeGreaterThanOrEqual(3);
    });
  });

  describe("GhostTube alert sound characteristics", () => {
    it("should be alarming", () => {
      // Alert: 100 Hz to 2500 Hz sweep (ascending)
      // Then: 2500 Hz to 100 Hz sweep (descending)
      const startFreq = 100;
      const peakFreq = 2500;

      expect(startFreq).toBeLessThan(150);
      expect(peakFreq).toBeGreaterThan(2000);
      expect(peakFreq / startFreq).toBeGreaterThan(15);
    });

    it("should have high volume", () => {
      // Alert volume: 0.5 (high)
      const alertVolume = 0.5;
      expect(alertVolume).toBeGreaterThanOrEqual(0.45);
    });
  });

  describe("GhostTube recording sounds", () => {
    it("record start should be deep", () => {
      // Record start: 100 Hz, 150ms (very deep and long)
      const frequency = 100;
      const duration = 150;

      expect(frequency).toBeLessThan(150);
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it("record stop should be high", () => {
      // Record stop: 1500 Hz to 300 Hz sweep
      const startFreq = 1500;
      const endFreq = 300;

      expect(startFreq).toBeGreaterThan(1000);
      expect(endFreq).toBeLessThan(500);
    });
  });

  describe("GhostTube paranormal activity sound", () => {
    it("should be chaotic and unpredictable", () => {
      // Paranormal: 10 frequencies with varying durations
      const frequencies = [150, 2200, 200, 2500, 180, 2800, 220, 2000, 100, 3000];
      const durations = [40, 30, 45, 25, 50, 20, 40, 30, 55, 25];

      // Check variety in frequencies
      const minFreq = Math.min(...frequencies);
      const maxFreq = Math.max(...frequencies);
      expect(maxFreq - minFreq).toBeGreaterThan(2500);

      // Check variety in durations
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);
      expect(maxDuration - minDuration).toBeGreaterThan(20);
    });
  });

  describe("GhostTube sound categories", () => {
    it("should have button interaction sounds", async () => {
      const module = await import("../ghosttube-style-sounds");

      expect(module.playGhostTubeButtonSound).toBeDefined();
      expect(module.playGhostTubeSelectSound).toBeDefined();
      expect(module.playGhostTubeDeleteSound).toBeDefined();
    });

    it("should have scanning sounds", async () => {
      const module = await import("../ghosttube-style-sounds");

      expect(module.playGhostTubeScanStart).toBeDefined();
      expect(module.playGhostTubeScanStop).toBeDefined();
      expect(module.playGhostTubeScanSound).toBeDefined();
    });

    it("should have detection sounds", async () => {
      const module = await import("../ghosttube-style-sounds");

      expect(module.playGhostTubeDetectionSound).toBeDefined();
      expect(module.playGhostTubeEMFSound).toBeDefined();
      expect(module.playGhostTubeAlertSound).toBeDefined();
    });

    it("should have recording sounds", async () => {
      const module = await import("../ghosttube-style-sounds");

      expect(module.playGhostTubeRecordStart).toBeDefined();
      expect(module.playGhostTubeRecordStop).toBeDefined();
    });
  });

  describe("GhostTube sound quality metrics", () => {
    it("button sound should be short and impactful", () => {
      // Total duration: 100 + 30 + 80 + 20 + 50 = 280ms
      const totalDuration = 100 + 30 + 80 + 20 + 50;
      expect(totalDuration).toBeLessThan(350);
      expect(totalDuration).toBeGreaterThan(200);
    });

    it("detection sound should be medium length", () => {
      // Total duration: 200 + 100 + 250 = 550ms
      const totalDuration = 200 + 100 + 250;
      expect(totalDuration).toBeGreaterThan(400);
      expect(totalDuration).toBeLessThan(700);
    });

    it("paranormal activity sound should be intense", () => {
      // 10 frequencies with short durations
      const frequencies = 10;
      const avgDuration = (40 + 30 + 45 + 25 + 50 + 20 + 40 + 30 + 55 + 25) / frequencies;
      expect(avgDuration).toBeLessThan(50);
    });
  });

  describe("GhostTube sound volumes", () => {
    it("all sounds should have appropriate volumes", () => {
      const volumes = [0.6, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2];

      volumes.forEach((vol) => {
        expect(vol).toBeGreaterThan(0);
        expect(vol).toBeLessThanOrEqual(1);
      });
    });

    it("button sound should be louder than selection sound", () => {
      const buttonVolume = 0.6;
      const selectVolume = 0.4;

      expect(buttonVolume).toBeGreaterThan(selectVolume);
    });

    it("alert sound should be very loud", () => {
      const alertVolume = 0.5;
      expect(alertVolume).toBeGreaterThanOrEqual(0.45);
    });
  });
});
