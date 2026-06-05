/**
 * Paranormal Glitch Sesleri
 * Frekans atlamalı, korkutucu paranormal efektleri
 */

import { synthesizeFrequency, playStaticNoise, playFrequencySweep } from "./audio-synthesizer";

/**
 * Paranormal glitch sesi #1
 * Hızlı frekans atlaması
 */
export async function playGlitch1(): Promise<void> {
  // Derin: 100 Hz, 30ms
  await synthesizeFrequency(100, 30, 0.5);
  // Yüksek: 2000 Hz, 20ms
  await synthesizeFrequency(2000, 20, 0.4);
  // Orta: 300 Hz, 25ms
  await synthesizeFrequency(300, 25, 0.45);
  // Çok yüksek: 3000 Hz, 15ms
  await synthesizeFrequency(3000, 15, 0.3);
}

/**
 * Paranormal glitch sesi #2
 * Derin frekans atlamas ile korkutucu efekt
 */
export async function playGlitch2(): Promise<void> {
  // Çok derin: 80 Hz, 50ms
  await synthesizeFrequency(80, 50, 0.55);
  await new Promise((resolve) => setTimeout(resolve, 40));
  // Orta-yüksek: 1500 Hz, 40ms
  await synthesizeFrequency(1500, 40, 0.35);
  await new Promise((resolve) => setTimeout(resolve, 30));
  // Derin: 150 Hz, 60ms
  await synthesizeFrequency(150, 60, 0.5);
}

/**
 * Paranormal glitch sesi #3
 * Çılgın frekans atlaması
 */
export async function playGlitch3(): Promise<void> {
  const frequencies = [120, 2500, 200, 3500, 150, 2000, 100, 2800];
  const durations = [25, 20, 30, 15, 35, 20, 25, 30];
  const volumes = [0.5, 0.3, 0.45, 0.25, 0.5, 0.35, 0.5, 0.3];

  for (let i = 0; i < frequencies.length; i++) {
    await synthesizeFrequency(frequencies[i], durations[i], volumes[i]);
    if (i < frequencies.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

/**
 * Paranormal glitch sesi #4
 * Yumuşak frekans atlamas ile sinister efekt
 */
export async function playGlitch4(): Promise<void> {
  // Sweep 1: 150 Hz'den 1200 Hz'e, 100ms
  await playFrequencySweep(150, 1200, 100, 0.4);
  await new Promise((resolve) => setTimeout(resolve, 50));
  // Sweep 2: 2000 Hz'den 300 Hz'e, 120ms
  await playFrequencySweep(2000, 300, 120, 0.35);
}

/**
 * Paranormal glitch sesi #5
 * Çok hızlı frekans atlamas
 */
export async function playGlitch5(): Promise<void> {
  const frequencies = [200, 1800, 250, 2200, 180, 2500, 220, 1500];

  for (let i = 0; i < frequencies.length; i++) {
    await synthesizeFrequency(frequencies[i], 20, 0.4);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

/**
 * Paranormal glitch sesi #6
 * Derin ve sinister
 */
export async function playGlitch6(): Promise<void> {
  // Çok derin: 60 Hz, 80ms
  await synthesizeFrequency(60, 80, 0.6);
  await new Promise((resolve) => setTimeout(resolve, 60));
  // Yüksek: 2200 Hz, 50ms
  await synthesizeFrequency(2200, 50, 0.3);
  await new Promise((resolve) => setTimeout(resolve, 40));
  // Derin: 120 Hz, 100ms
  await synthesizeFrequency(120, 100, 0.55);
}

/**
 * Paranormal glitch sesi #7
 * Spiral efekt
 */
export async function playGlitch7(): Promise<void> {
  // Yükselen spiral
  const startFreqs = [200, 300, 400, 500];
  const endFreqs = [800, 1200, 1600, 2000];

  for (let i = 0; i < startFreqs.length; i++) {
    await playFrequencySweep(startFreqs[i], endFreqs[i], 80, 0.3);
    if (i < startFreqs.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}

/**
 * Paranormal glitch sesi #8
 * Kaotik atlama
 */
export async function playGlitch8(): Promise<void> {
  const frequencies = [150, 3000, 100, 2800, 200, 2500, 80, 3200, 250, 1800];
  const durations = [30, 15, 35, 20, 25, 18, 40, 12, 28, 22];

  for (let i = 0; i < frequencies.length; i++) {
    await synthesizeFrequency(frequencies[i], durations[i], 0.4);
    if (i < frequencies.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 8));
    }
  }
}

/**
 * Paranormal glitch sesi #9
 * Çift sweep
 */
export async function playGlitch9(): Promise<void> {
  // Sweep 1: 100 Hz'den 2000 Hz'e, 150ms
  await playFrequencySweep(100, 2000, 150, 0.4);
  await new Promise((resolve) => setTimeout(resolve, 60));
  // Sweep 2: 3000 Hz'den 200 Hz'e, 150ms
  await playFrequencySweep(3000, 200, 150, 0.35);
}

/**
 * Paranormal glitch sesi #10
 * Titreşim efekt
 */
export async function playGlitch10(): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await synthesizeFrequency(150, 40, 0.5);
    await new Promise((resolve) => setTimeout(resolve, 30));
    await synthesizeFrequency(2000, 30, 0.3);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

/**
 * Rastgele paranormal glitch sesi seç ve çal
 */
export async function playRandomGlitch(): Promise<void> {
  const glitches = [
    playGlitch1,
    playGlitch2,
    playGlitch3,
    playGlitch4,
    playGlitch5,
    playGlitch6,
    playGlitch7,
    playGlitch8,
    playGlitch9,
    playGlitch10,
  ];

  const randomGlitch = glitches[Math.floor(Math.random() * glitches.length)];
  await randomGlitch();
}

/**
 * Tüm paranormal glitch seslerini test et
 */
export async function testAllGlitches(): Promise<void> {
  const glitches = [
    { name: "Glitch 1", fn: playGlitch1 },
    { name: "Glitch 2", fn: playGlitch2 },
    { name: "Glitch 3", fn: playGlitch3 },
    { name: "Glitch 4", fn: playGlitch4 },
    { name: "Glitch 5", fn: playGlitch5 },
    { name: "Glitch 6", fn: playGlitch6 },
    { name: "Glitch 7", fn: playGlitch7 },
    { name: "Glitch 8", fn: playGlitch8 },
    { name: "Glitch 9", fn: playGlitch9 },
    { name: "Glitch 10", fn: playGlitch10 },
  ];

  for (const glitch of glitches) {
    console.log(`Playing ${glitch.name}...`);
    await glitch.fn();
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
