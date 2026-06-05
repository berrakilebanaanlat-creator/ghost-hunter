/**
 * Paranormal Ses Cevapları
 * Mikrofon verilerinden paranormal sesleri üretir
 */

import { playParanormalEffect, playWhisper, playScreech, playMoan, playDistortion } from "./audio-synthesizer";
import { analyzeAudioFrequencies } from "./paranormal-voice-analyzer";
import { PARANORMAL_WORD_ARCHIVE, selectParanormalWords } from "./paranormal-word-archive";

export interface ParanormalVoiceResponse {
  id: string;
  timestamp: number;
  responseType: "whisper" | "scream" | "moan" | "distortion" | "glitch" | "echo";
  frequency: number;
  duration: number;
  intensity: number;
  words: string[];
}

/**
 * Paranormal ses cevabı türleri
 */
export const PARANORMAL_RESPONSE_TYPES = {
  whisper: {
    name: "Fısıltı",
    frequency: 200,
    duration: 2,
    intensity: 0.3,
  },
  scream: {
    name: "Çığlık",
    frequency: 800,
    duration: 1.5,
    intensity: 0.7,
  },
  moan: {
    name: "İnilti",
    frequency: 150,
    duration: 2.5,
    intensity: 0.5,
  },
  distortion: {
    name: "Bozulma",
    frequency: 500,
    duration: 1,
    intensity: 0.6,
  },
  glitch: {
    name: "Glitch",
    frequency: 400,
    duration: 0.8,
    intensity: 0.4,
  },
  echo: {
    name: "Yankı",
    frequency: 300,
    duration: 3,
    intensity: 0.5,
  },
};

/**
 * Ses verilerinden paranormal cevap oluştur
 */
export function generateParanormalVoiceResponse(
  audioData: Float32Array,
  frequency?: Uint8Array
): ParanormalVoiceResponse {
  // Frekans analizi yap
  let analysisFrequency: Uint8Array;
  if (frequency) {
    analysisFrequency = frequency;
  } else {
    const frequencyArray = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      frequencyArray[i] = Math.min(Math.abs(audioData[i] || 0) * 255, 255);
    }
    const analysis = analyzeAudioFrequencies(frequencyArray);
    analysisFrequency = frequencyArray;
  }
  
  // Frekans verilerinden paranormal cevap türü seç
  const responseType = selectResponseType(analysisFrequency);
  const responseConfig = PARANORMAL_RESPONSE_TYPES[responseType];

  // Ses yoğunluğunu hesapla
  const avgAmplitude = audioData.reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length;
  const intensity = Math.min(avgAmplitude * 2, 1);

  // Paranormal kelimeler seç
  const words = selectParanormalWords("", 3);

  // Paranormal ses cevabı oluştur
  const response: ParanormalVoiceResponse = {
    id: Math.random().toString(36).substring(7),
    timestamp: Date.now(),
    responseType,
    frequency: responseConfig.frequency,
    duration: responseConfig.duration,
    intensity: Math.max(intensity, responseConfig.intensity),
    words,
  };

  return response;
}

/**
 * Frekans verilerinden paranormal cevap türü seç
 */
function selectResponseType(
  frequencyData: Uint8Array
): "whisper" | "scream" | "moan" | "distortion" | "glitch" | "echo" {
  // Frekans bantlarını analiz et
  const lowFreq = frequencyData.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
  const midFreq = frequencyData.slice(8, 16).reduce((a, b) => a + b, 0) / 8;
  const highFreq = frequencyData.slice(16, 24).reduce((a, b) => a + b, 0) / 8;

  // Frekans desenine göre cevap türü seç
  if (highFreq > 150 && highFreq > midFreq) {
    return Math.random() > 0.5 ? "scream" : "glitch";
  } else if (lowFreq > 150 && lowFreq > highFreq) {
    return Math.random() > 0.5 ? "moan" : "echo";
  } else if (midFreq > 150) {
    return Math.random() > 0.5 ? "distortion" : "whisper";
  } else {
    return "whisper";
  }
}

/**
 * Paranormal ses cevabını çal
 */
export async function playParanormalVoiceResponse(
  response: ParanormalVoiceResponse
): Promise<void> {
  switch (response.responseType) {
    case "whisper":
      await playWhisper(response.duration, response.intensity);
      break;
    case "scream":
      await playScreech(response.duration, response.intensity);
      break;
    case "moan":
      await playMoan(response.duration, response.intensity);
      break;
    case "distortion":
      await playDistortion(response.duration, response.intensity);
      break;
    case "glitch":
      // Glitch efekti - hızlı frekans değişimleri
      for (let i = 0; i < 3; i++) {
        const freq = response.frequency + Math.random() * 200 - 100;
        await playParanormalEffect(freq, response.duration / 3, response.intensity);
      }
      break;
    case "echo":
      // Echo efekti - tekrarlanan ses
      for (let i = 0; i < 2; i++) {
        await playParanormalEffect(response.frequency, response.duration / 2, response.intensity * (1 - i * 0.3));
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      break;
  }
}

/**
 * Paranormal ses cevabından metin oluştur
 */
export function generateTextFromVoiceResponse(response: ParanormalVoiceResponse): string {
  return response.words.join(" ");
}

/**
 * Ses verilerinden paranormal aktivite seviyesi hesapla
 */
export function calculateVoiceActivityLevel(audioData: Float32Array): number {
  const avgAmplitude = audioData.reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length;
  const peakAmplitude = Math.max(...audioData.map((v) => Math.abs(v)));

  // Aktivite seviyesi = ortalama + tepe genliğinin etkisi
  const activityLevel = (avgAmplitude * 0.5 + peakAmplitude * 0.5) * 100;

  return Math.min(Math.round(activityLevel), 100);
}

/**
 * Ses verilerinden paranormal kalitesi hesapla
 */
export function calculateVoiceQuality(audioData: Float32Array): number {
  // Ses kalitesi = sinyal-gürültü oranı
  const avgAmplitude = audioData.reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length;
  const variance = audioData.reduce((sum, val) => sum + Math.pow(val - avgAmplitude, 2), 0) / audioData.length;
  const stdDev = Math.sqrt(variance);

  // SNR (Signal-to-Noise Ratio) hesapla
  const snr = avgAmplitude > 0 ? 20 * Math.log10(stdDev / avgAmplitude) : 0;

  // Kaliteyi 0-100 aralığına normalize et
  const quality = Math.max(0, Math.min(100, 50 + snr * 5));

  return Math.round(quality);
}

/**
 * Ses verilerinden paranormal deseni algıla
 */
export function detectParanormalPattern(audioData: Float32Array): string {
  const quality = calculateVoiceQuality(audioData);
  const activity = calculateVoiceActivityLevel(audioData);

  if (quality > 70 && activity > 60) {
    return "Güçlü paranormal aktivite algılandı";
  } else if (quality > 50 && activity > 40) {
    return "Orta seviye paranormal aktivite algılandı";
  } else if (quality > 30 && activity > 20) {
    return "Zayıf paranormal aktivite algılandı";
  } else {
    return "Paranormal aktivite bulunamadı";
  }
}
