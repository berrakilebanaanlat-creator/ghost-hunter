/**
 * UI Ses Efektleri
 * Tuş basma, tarama, başarı ve hata sesleri
 */

import {
  synthesizeFrequency,
  playStaticNoise,
  playFrequencySweep,
} from "./audio-synthesizer";

/**
 * Tuş basma sesi (profesyonel ve sinister)
 * Derin, kat manlı frekans atlaması
 */
export async function playButtonSound(): Promise<void> {
  // Derin bas ton: 150 Hz, 80ms
  await synthesizeFrequency(150, 80, 0.5);
  // Kısa bekleme
  await new Promise((resolve) => setTimeout(resolve, 30));
  // Orta frekans: 400 Hz, 60ms
  await synthesizeFrequency(400, 60, 0.4);
  // Kısa bekleme
  await new Promise((resolve) => setTimeout(resolve, 20));
  // Yüksek frekans: 800 Hz, 40ms
  await synthesizeFrequency(800, 40, 0.3);
}

/**
 * Tarama başlama sesi
 * Yükselen frekans sweep
 */
export async function playScanStartSound(): Promise<void> {
  // 1000 Hz'den 2500 Hz'e sweep, 300ms
  await playFrequencySweep(1000, 2500, 300, 0.35);
}

/**
 * Tarama durdurma sesi
 * Alçalan frekans sweep
 */
export async function playScanStopSound(): Promise<void> {
  // 2500 Hz'den 1000 Hz'e sweep, 300ms
  await playFrequencySweep(2500, 1000, 300, 0.35);
}

/**
 * Tarama sırasında sürekli ses (loop için)
 * Statik gürültü + düşük frekans
 */
export async function playScanningLoopSound(): Promise<void> {
  // Statik gürültü, 150ms, düşük ses
  await playStaticNoise(150, 0.15);
}

/**
 * Başarı sesi (paranormal algılandı)
 * İki tono sesi
 */
export async function playSuccessSound(): Promise<void> {
  // İlk ton: 1200 Hz, 100ms
  await synthesizeFrequency(1200, 100, 0.35);
  // Kısa bekleme
  await new Promise((resolve) => setTimeout(resolve, 50));
  // İkinci ton: 1600 Hz, 100ms
  await synthesizeFrequency(1600, 100, 0.35);
}

/**
 * Hata sesi
 * Alçalan iki tono
 */
export async function playErrorSound(): Promise<void> {
  // İlk ton: 800 Hz, 100ms
  await synthesizeFrequency(800, 100, 0.35);
  // Kısa bekleme
  await new Promise((resolve) => setTimeout(resolve, 50));
  // İkinci ton: 600 Hz, 100ms
  await synthesizeFrequency(600, 100, 0.35);
}

/**
 * Uyarı sesi (güçlü sinyal)
 * Hızlı beep beep
 */
export async function playWarningSound(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await synthesizeFrequency(1000, 80, 0.4);
    if (i < 2) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

/**
 * Kayıt başlama sesi
 * Düşük frekans başlangıç
 */
export async function playRecordStartSound(): Promise<void> {
  // 400 Hz, 150ms
  await synthesizeFrequency(400, 150, 0.3);
}

/**
 * Kayıt durdurma sesi
 * Yüksek frekans bitiş
 */
export async function playRecordStopSound(): Promise<void> {
  // 1200 Hz, 150ms
  await synthesizeFrequency(1200, 150, 0.3);
}

/**
 * Silme sesi (paranormal olay silindi)
 * Sinister frekans atlaması
 */
export async function playDeleteSound(): Promise<void> {
  // Yüksek başlangıç: 1000 Hz, 50ms
  await synthesizeFrequency(1000, 50, 0.35);
  // Kısa bekleme
  await new Promise((resolve) => setTimeout(resolve, 25));
  // Derin düşüş: 150 Hz, 100ms
  await synthesizeFrequency(150, 100, 0.4);
}

/**
 * Seçim sesi (item seçildi)
 * Frekans atlaması ile paranormal efekt
 */
export async function playSelectSound(): Promise<void> {
  // Derin başlangıç: 200 Hz, 60ms
  await synthesizeFrequency(200, 60, 0.4);
  // Kısa bekleme
  await new Promise((resolve) => setTimeout(resolve, 20));
  // Yüksek zıplama: 1200 Hz, 80ms
  await synthesizeFrequency(1200, 80, 0.35);
  // Kısa bekleme
  await new Promise((resolve) => setTimeout(resolve, 15));
  // Orta frekans: 600 Hz, 50ms
  await synthesizeFrequency(600, 50, 0.3);
}

/**
 * Tarama hızı değişikliği sesi
 * Kısa sweep
 */
export async function plasScanSpeedChangeSound(): Promise<void> {
  // 1500 Hz'den 2000 Hz'e, 150ms
  await playFrequencySweep(1500, 2000, 150, 0.3);
}

/**
 * Frekans ayarı sesi (Vox)
 * Yumuşak sweep
 */
export async function playFrequencyAdjustSound(): Promise<void> {
  // 1000 Hz'den 1500 Hz'e, 200ms
  await playFrequencySweep(1000, 1500, 200, 0.3);
}

/**
 * Sinyal güçü arttı sesi
 * Yükselen ton
 */
export async function playSignalIncreaseSound(): Promise<void> {
  // 1000 Hz'den 1800 Hz'e, 250ms
  await playFrequencySweep(1000, 1800, 250, 0.3);
}

/**
 * Sinyal güçü azaldı sesi
 * Alçalan ton
 */
export async function playSignalDecreaseSound(): Promise<void> {
  // 1800 Hz'den 1000 Hz'e, 250ms
  await playFrequencySweep(1800, 1000, 250, 0.3);
}

/**
 * Tüm UI ses efektlerini test et
 */
export async function testAllUISounds(): Promise<void> {
  const sounds = [
    { name: "Button", fn: playButtonSound },
    { name: "Scan Start", fn: playScanStartSound },
    { name: "Scan Stop", fn: playScanStopSound },
    { name: "Success", fn: playSuccessSound },
    { name: "Error", fn: playErrorSound },
    { name: "Warning", fn: playWarningSound },
    { name: "Record Start", fn: playRecordStartSound },
    { name: "Record Stop", fn: playRecordStopSound },
    { name: "Delete", fn: playDeleteSound },
    { name: "Select", fn: playSelectSound },
  ];

  for (const sound of sounds) {
    console.log(`Playing ${sound.name}...`);
    await sound.fn();
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}
