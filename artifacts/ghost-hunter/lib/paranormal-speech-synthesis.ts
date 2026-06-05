/**
 * Paranormal Konuşma Sentezleme
 * Türkçe paranormal kelimelerini konuşma sesine dönüştür
 */

import { synthesizeFrequency } from "./audio-synthesizer";

/**
 * Paranormal kelimeler ve onların frekans karakteristikleri
 */
const PARANORMAL_WORDS = [
  { word: "Ölü", frequencies: [150, 200, 250] },
  { word: "Ruh", frequencies: [180, 220, 280] },
  { word: "Lanet", frequencies: [120, 180, 240] },
  { word: "Korku", frequencies: [140, 200, 260] },
  { word: "Ölüm", frequencies: [160, 210, 270] },
  { word: "Karanlık", frequencies: [130, 190, 250] },
  { word: "Acı", frequencies: [170, 230, 290] },
  { word: "Yalnız", frequencies: [150, 210, 270] },
  { word: "Kötü", frequencies: [140, 200, 260] },
  { word: "Evet", frequencies: [180, 240, 300] },
  { word: "Hayır", frequencies: [120, 170, 220] },
  { word: "Yardım", frequencies: [160, 220, 280] },
  { word: "Bırak", frequencies: [140, 190, 240] },
  { word: "Git", frequencies: [170, 230, 290] },
  { word: "Kal", frequencies: [150, 210, 270] },
];

/**
 * Paranormal kelimeyi konuşma sesine dönüştür
 * @param word - Paranormal kelime
 * @param volume - Ses seviyesi (0-1)
 */
export async function synthesizeParanormalWord(
  word: string,
  volume: number = 0.3
): Promise<void> {
  // Kelimeyi bul
  const wordData = PARANORMAL_WORDS.find(
    (w) => w.word.toLowerCase() === word.toLowerCase()
  );

  if (!wordData) {
    console.warn(`Paranormal kelime bulunamadı: ${word}`);
    return;
  }

  try {
    // Frekansları sırayla çal (konuşma simülasyonu)
    const durationPerFreq = 150; // Her frekans 150ms

    for (const freq of wordData.frequencies) {
      await synthesizeFrequency(freq, durationPerFreq, volume);
      // Sonraki frekansı çalmadan önce bekle
      await new Promise((resolve) => setTimeout(resolve, durationPerFreq + 50));
    }
  } catch (error) {
    console.error("Paranormal kelime sentezleme hatası:", error);
  }
}

/**
 * Rastgele paranormal kelime seç ve çal
 * @param volume - Ses seviyesi (0-1)
 */
export async function playRandomParanormalWord(volume: number = 0.3): Promise<string> {
  const randomWord = PARANORMAL_WORDS[Math.floor(Math.random() * PARANORMAL_WORDS.length)];
  await synthesizeParanormalWord(randomWord.word, volume);
  return randomWord.word;
}

/**
 * Paranormal kelime cümlesi çal
 * @param words - Kelime listesi
 * @param volume - Ses seviyesi (0-1)
 */
export async function synthesizeParanormalPhrase(
  words: string[],
  volume: number = 0.3
): Promise<void> {
  for (const word of words) {
    await synthesizeParanormalWord(word, volume);
    // Kelimeler arasında duraklama
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

/**
 * Mevcut paranormal kelimeleri al
 */
export function getParanormalWords(): string[] {
  return PARANORMAL_WORDS.map((w) => w.word);
}

/**
 * Paranormal kelime ekle (özel kelimeleri desteklemek için)
 */
export function addParanormalWord(word: string, frequencies: number[]): void {
  PARANORMAL_WORDS.push({ word, frequencies });
}
