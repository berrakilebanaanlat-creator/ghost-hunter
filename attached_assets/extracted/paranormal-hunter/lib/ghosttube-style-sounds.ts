/**
 * GhostTube Tarzı Profesyonel Paranormal Sesleri
 * Derin, sinister ve gerçekçi paranormal efektler
 */

import { synthesizeFrequency, playStaticNoise, playFrequencySweep } from "./audio-synthesizer";

/**
 * GhostTube tarzı tuş sesi
 * Derin, profesyonel, sinister
 */
export async function playGhostTubeButtonSound(): Promise<void> {
  // Çok derin bas: 80 Hz, 100ms, yüksek volume
  await synthesizeFrequency(80, 100, 0.6);
  // Kısa bekleme
  await new Promise((resolve) => setTimeout(resolve, 50));
  // Orta frekans: 300 Hz, 80ms
  await synthesizeFrequency(300, 80, 0.45);
  // Kısa bekleme
  await new Promise((resolve) => setTimeout(resolve, 30));
  // Yüksek frekans: 1000 Hz, 50ms
  await synthesizeFrequency(1000, 50, 0.35);
}

/**
 * GhostTube tarzı paranormal algılama sesi
 * Sinister ve korkutucu
 */
export async function playGhostTubeDetectionSound(): Promise<void> {
  // Sweep 1: 200 Hz'den 2000 Hz'e, 200ms
  await playFrequencySweep(200, 2000, 200, 0.45);
  // Bekleme
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Sweep 2: 2500 Hz'den 400 Hz'e, 250ms
  await playFrequencySweep(2500, 400, 250, 0.4);
}

/**
 * GhostTube tarzı EMF algılama sesi
 * Hızlı, sinister pulsing
 */
export async function playGhostTubeEMFSound(): Promise<void> {
  for (let i = 0; i < 4; i++) {
    // Derin: 120 Hz, 60ms
    await synthesizeFrequency(120, 60, 0.55);
    // Bekleme
    await new Promise((resolve) => setTimeout(resolve, 40));
    // Yüksek: 1800 Hz, 40ms
    await synthesizeFrequency(1800, 40, 0.35);
    // Bekleme
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}

/**
 * GhostTube tarzı frekans tarama sesi
 * Yumuşak ve sinister sweep
 */
export async function playGhostTubeScanSound(): Promise<void> {
  // Başlangıç: 150 Hz'den 3000 Hz'e, 400ms
  await playFrequencySweep(150, 3000, 400, 0.4);
}

/**
 * GhostTube tarzı sinyal güçlendirme sesi
 * Artan intensity
 */
export async function playGhostTubeSignalBoost(): Promise<void> {
  const frequencies = [200, 400, 600, 800, 1000, 1200];
  const durations = [80, 70, 60, 50, 40, 30];

  for (let i = 0; i < frequencies.length; i++) {
    await synthesizeFrequency(frequencies[i], durations[i], 0.4);
    if (i < frequencies.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}

/**
 * GhostTube tarzı uyarı sesi
 * Tehlike sinyal
 */
export async function playGhostTubeAlertSound(): Promise<void> {
  // Sweep 1: 100 Hz'den 2500 Hz'e, 150ms
  await playFrequencySweep(100, 2500, 150, 0.5);
  // Bekleme
  await new Promise((resolve) => setTimeout(resolve, 80));
  // Sweep 2: 2500 Hz'den 100 Hz'e, 150ms
  await playFrequencySweep(2500, 100, 150, 0.5);
}

/**
 * GhostTube tarzı kayıt başlama sesi
 * Derin ve belirgin
 */
export async function playGhostTubeRecordStart(): Promise<void> {
  // Derin: 100 Hz, 150ms
  await synthesizeFrequency(100, 150, 0.6);
  // Bekleme
  await new Promise((resolve) => setTimeout(resolve, 50));
  // Orta: 400 Hz, 100ms
  await synthesizeFrequency(400, 100, 0.45);
}

/**
 * GhostTube tarzı kayıt durdurma sesi
 * Yüksek ve belirgin
 */
export async function playGhostTubeRecordStop(): Promise<void> {
  // Sweep: 1500 Hz'den 300 Hz'e, 200ms
  await playFrequencySweep(1500, 300, 200, 0.45);
}

/**
 * GhostTube tarzı paranormal aktivite sesi
 * Kaotik ve korkutucu
 */
export async function playGhostTubeParanormalActivity(): Promise<void> {
  const frequencies = [150, 2200, 200, 2500, 180, 2800, 220, 2000, 100, 3000];
  const durations = [40, 30, 45, 25, 50, 20, 40, 30, 55, 25];

  for (let i = 0; i < frequencies.length; i++) {
    await synthesizeFrequency(frequencies[i], durations[i], 0.45);
    if (i < frequencies.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 12));
    }
  }
}

/**
 * GhostTube tarzı statik gürültü
 * Paranormal ortam
 */
export async function playGhostTubeStaticNoise(): Promise<void> {
  // Statik gürültü: 300ms, orta-yüksek volume
  await playStaticNoise(300, 0.35);
}

/**
 * GhostTube tarzı başarı sesi
 * İki sweep kombinasyonu
 */
export async function playGhostTubeSuccessSound(): Promise<void> {
  // Sweep 1: 400 Hz'den 1200 Hz'e, 150ms
  await playFrequencySweep(400, 1200, 150, 0.4);
  // Bekleme
  await new Promise((resolve) => setTimeout(resolve, 60));
  // Sweep 2: 600 Hz'den 1500 Hz'e, 150ms
  await playFrequencySweep(600, 1500, 150, 0.4);
}

/**
 * GhostTube tarzı hata sesi
 * Ters sweep
 */
export async function playGhostTubeErrorSound(): Promise<void> {
  // Sweep: 2000 Hz'den 200 Hz'e, 200ms
  await playFrequencySweep(2000, 200, 200, 0.4);
}

/**
 * GhostTube tarzı seçim sesi
 * Kısa ve belirgin
 */
export async function playGhostTubeSelectSound(): Promise<void> {
  // Derin: 150 Hz, 50ms
  await synthesizeFrequency(150, 50, 0.5);
  // Bekleme
  await new Promise((resolve) => setTimeout(resolve, 30));
  // Yüksek: 1200 Hz, 70ms
  await synthesizeFrequency(1200, 70, 0.4);
}

/**
 * GhostTube tarzı silme sesi
 * Sinister düşüş
 */
export async function playGhostTubeDeleteSound(): Promise<void> {
  // Sweep: 1500 Hz'den 100 Hz'e, 200ms
  await playFrequencySweep(1500, 100, 200, 0.45);
}

/**
 * GhostTube tarzı tarama başlama sesi
 * Tek derin bip
 */
export async function playGhostTubeScanStart(): Promise<void> {
  // Tek derin bip: 150 Hz, 200ms
  await synthesizeFrequency(150, 200, 0.5);
}

/**
 * GhostTube tarzı tarama durdurma sesi
 * Tek yüksek bip
 */
export async function playGhostTubeScanStop(): Promise<void> {
  // Tek yüksek bip: 800 Hz, 150ms
  await synthesizeFrequency(800, 150, 0.45);
}

/**
 * Rastgele GhostTube tarzı paranormal sesi
 */
export async function playRandomGhostTubeSound(): Promise<void> {
  const sounds = [
    playGhostTubeDetectionSound,
    playGhostTubeEMFSound,
    playGhostTubeParanormalActivity,
    playGhostTubeAlertSound,
  ];

  const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
  await randomSound();
}
