/**
 * Paranormal VOX - Ses Analizi ve Kelime Çıkarma Sistemi
 * Kullanıcının ortamdan kaydedilen ses verilerinden
 * paranormal kelimeler çıkartır ve manipüle cevaplar oluşturur
 */

import { PARANORMAL_WORD_ARCHIVE, selectParanormalWords } from "./paranormal-word-archive";

export interface VoiceAnalysisResult {
  detectedWords: string[];
  confidence: number;
  paranormalResponse: string;
  timestamp: number;
}

/**
 * Ses frekans analizi yaparak paranormal kelimeler çıkart
 * Web Audio API'nin AnalyserNode'unu simüle eder
 */
export function analyzeAudioFrequencies(
  frequencyData: Uint8Array
): VoiceAnalysisResult {
  // Frekans verilerini normalize et
  const normalizedData = Array.from(frequencyData).map((v) => v / 255);

  // Frekans bantlarını paranormal kategorilere eşle
  const lowFreq = normalizedData.slice(0, 10).reduce((a, b) => a + b, 0) / 10; // Derin sesler
  const midFreq = normalizedData.slice(10, 20).reduce((a, b) => a + b, 0) / 10; // Orta sesler
  const highFreq = normalizedData.slice(20, 30).reduce((a, b) => a + b, 0) / 10; // Yüksek sesler

  // Frekans desenine göre paranormal kelimeler seç
  const detectedWords: string[] = [];

  // Derin frekanslar = Hayalet/Ruh kelimeleri
  if (lowFreq > 0.5) {
    detectedWords.push(...selectParanormalWords("kim", 2));
  }

  // Orta frekanslar = Duygu kelimeleri
  if (midFreq > 0.5) {
    detectedWords.push(...selectParanormalWords("ne", 2));
  }

  // Yüksek frekanslar = Paranormal kelimeleri
  if (highFreq > 0.5) {
    detectedWords.push(...selectParanormalWords("nasıl", 2));
  }

  // Rastgele ek kelimeler ekle
  if (normalizedData.some((v) => v > 0.7)) {
    detectedWords.push(...selectParanormalWords("", 1));
  }

  // Confidence skoru hesapla
  const confidence = Math.min(
    (lowFreq + midFreq + highFreq) / 3 * 100,
    100
  );

  // Paranormal cevap oluştur
  const paranormalResponse = generateManipulatedResponse(detectedWords);

  return {
    detectedWords: Array.from(new Set(detectedWords)), // Benzersiz kelimeler
    confidence: Math.round(confidence),
    paranormalResponse,
    timestamp: Date.now(),
  };
}

/**
 * Ses dalga verilerinden paranormal kelimeler çıkart
 */
export function extractWordsFromWaveform(
  waveformData: number[]
): VoiceAnalysisResult {
  // Dalga verilerini frekans domenine dönüştür (FFT simülasyonu)
  const frequencyData = performFFT(waveformData);

  return analyzeAudioFrequencies(frequencyData);
}

/**
 * Basit FFT simülasyonu
 * Gerçek FFT yerine frekans bantlarını tahmin eder
 */
function performFFT(waveformData: number[]): Uint8Array {
  const fftSize = 32;
  const frequencyData = new Uint8Array(fftSize);

  // Dalga verisini frekans bantlarına böl
  const bandSize = Math.ceil(waveformData.length / fftSize);

  for (let i = 0; i < fftSize; i++) {
    const bandStart = i * bandSize;
    const bandEnd = Math.min(bandStart + bandSize, waveformData.length);
    const bandData = waveformData.slice(bandStart, bandEnd);

    // Bant için ortalama genlik hesapla
    const avgAmplitude =
      bandData.reduce((a, b) => a + Math.abs(b), 0) / bandData.length;

    frequencyData[i] = Math.min(Math.round(avgAmplitude * 255), 255);
  }

  return frequencyData;
}

/**
 * Manipüle edilmiş paranormal cevap oluştur
 * Çıkartılan kelimelerden tutarlı bir cevap oluştur
 */
function generateManipulatedResponse(detectedWords: string[]): string {
  if (detectedWords.length === 0) {
    return selectParanormalWords("kim", 3).join(" ");
  }

  // Kelimeler arasında bağlantı kur
  const response = detectedWords.slice(0, 5).join(" ");

  return response || "ben burada";
}

/**
 * Kullanıcı sorusuna göre paranormal cevap oluştur
 * Ses analizi sonuçlarını kullanarak
 */
export function generateResponseToQuestion(
  userQuestion: string,
  analysisResult: VoiceAnalysisResult
): string {
  const questionLower = userQuestion.toLowerCase();

  // Soru türüne göre cevap şekli belirle
  if (
    questionLower.includes("kim") ||
    questionLower.includes("kimsin") ||
    questionLower.includes("adı")
  ) {
    // Kimlik sorusu
    return `ben ${analysisResult.detectedWords[0] || "ben burada"}`;
  } else if (
    questionLower.includes("ne") ||
    questionLower.includes("nedir") ||
    questionLower.includes("ne yapıyorsun")
  ) {
    // Faaliyet sorusu
    return analysisResult.detectedWords.slice(0, 3).join(" ") || "ben acı çekiyorum";
  } else if (
    questionLower.includes("neden") ||
    questionLower.includes("niçin") ||
    questionLower.includes("sebep")
  ) {
    // Sebep sorusu
    return analysisResult.detectedWords.slice(0, 2).join(" ") || "ben lanetliyim";
  } else if (
    questionLower.includes("nerede") ||
    questionLower.includes("yer") ||
    questionLower.includes("konum")
  ) {
    // Konum sorusu
    return "ben burada, her yerde, karanlıkta";
  } else if (
    questionLower.includes("ne zaman") ||
    questionLower.includes("zaman") ||
    questionLower.includes("saat")
  ) {
    // Zaman sorusu
    return "ben daima, gece, ölümden beri";
  } else {
    // Genel cevap
    return analysisResult.paranormalResponse;
  }
}

/**
 * Ses kalitesine göre paranormal aktivite seviyesi belirle
 */
export function calculateParanormalActivityLevel(
  analysisResult: VoiceAnalysisResult
): number {
  const baseLevel = analysisResult.confidence;
  const wordCount = analysisResult.detectedWords.length;

  // Kelime sayısı ve confidence'a göre aktivite seviyesi
  const activityLevel = Math.min(
    baseLevel * (1 + wordCount * 0.1),
    100
  );

  return Math.round(activityLevel);
}

/**
 * Paranormal ses kaydı arşivine ekle
 */
export interface ParanormalRecord {
  id: string;
  timestamp: number;
  userQuestion: string;
  detectedWords: string[];
  paranormalResponse: string;
  activityLevel: number;
  confidence: number;
}

export function createParanormalRecord(
  userQuestion: string,
  analysisResult: VoiceAnalysisResult
): ParanormalRecord {
  return {
    id: Math.random().toString(36).substring(7),
    timestamp: analysisResult.timestamp,
    userQuestion,
    detectedWords: analysisResult.detectedWords,
    paranormalResponse: analysisResult.paranormalResponse,
    activityLevel: calculateParanormalActivityLevel(analysisResult),
    confidence: analysisResult.confidence,
  };
}

/**
 * Paranormal arşivini analiz et ve istatistikler oluştur
 */
export interface ArchiveStatistics {
  totalRecords: number;
  averageActivityLevel: number;
  mostCommonWords: string[];
  highestActivityRecord: ParanormalRecord | null;
}

export function analyzeParanormalArchive(
  records: ParanormalRecord[]
): ArchiveStatistics {
  if (records.length === 0) {
    return {
      totalRecords: 0,
      averageActivityLevel: 0,
      mostCommonWords: [],
      highestActivityRecord: null,
    };
  }

  // Ortalama aktivite seviyesi
  const averageActivityLevel =
    records.reduce((sum, r) => sum + r.activityLevel, 0) / records.length;

  // En sık kullanılan kelimeler
  const wordFrequency: { [key: string]: number } = {};
  records.forEach((record) => {
    record.detectedWords.forEach((word) => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
  });

  const mostCommonWords = Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  // En yüksek aktivite kaydı
  const highestActivityRecord = records.reduce((max, record) =>
    record.activityLevel > (max?.activityLevel || 0) ? record : max
  );

  return {
    totalRecords: records.length,
    averageActivityLevel: Math.round(averageActivityLevel),
    mostCommonWords,
    highestActivityRecord,
  };
}
