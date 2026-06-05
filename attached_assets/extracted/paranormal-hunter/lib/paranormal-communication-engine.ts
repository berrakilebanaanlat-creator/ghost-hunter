/**
 * Paranormal VOX - İletişim Motoru
 * GhostTube VOX'tan esinlenerek oluşturulmuş
 * Gerçek paranormal iletişim simülasyonu
 */

import {
  analyzeAudioFrequencies,
  extractWordsFromWaveform,
  generateResponseToQuestion,
  createParanormalRecord,
  ParanormalRecord,
  VoiceAnalysisResult,
} from "./paranormal-voice-analyzer";
import { PARANORMAL_WORD_ARCHIVE } from "./paranormal-word-archive";

/**
 * Paranormal iletişim oturumu
 */
export interface CommunicationSession {
  id: string;
  startTime: number;
  endTime?: number;
  isActive: boolean;
  messages: CommunicationMessage[];
  activityLevel: number;
  recordedAudio?: Uint8Array;
}

/**
 * Paranormal iletişim mesajı
 */
export interface CommunicationMessage {
  id: string;
  timestamp: number;
  type: "user_question" | "paranormal_response" | "system_event";
  content: string;
  confidence?: number;
  detectedWords?: string[];
  activityLevel?: number;
}

/**
 * Paranormal iletişim motoru
 */
export class ParanormalCommunicationEngine {
  private currentSession: CommunicationSession | null = null;
  private sessionHistory: CommunicationSession[] = [];
  private paranormalArchive: ParanormalRecord[] = [];

  /**
   * Yeni iletişim oturumu başlat
   */
  startSession(): CommunicationSession {
    this.currentSession = {
      id: Math.random().toString(36).substring(7),
      startTime: Date.now(),
      isActive: true,
      messages: [],
      activityLevel: 0,
    };

    // Sistem mesajı ekle
    this.addSystemMessage("Paranormal iletişim oturumu başladı");

    return this.currentSession;
  }

  /**
   * İletişim oturumunu sonlandır
   */
  endSession(): CommunicationSession | null {
    if (!this.currentSession) return null;

    this.currentSession.isActive = false;
    this.currentSession.endTime = Date.now();

    this.sessionHistory.push(this.currentSession);
    const session = this.currentSession;
    this.currentSession = null;

    return session;
  }

  /**
   * Kullanıcı sorusunu işle
   */
  processUserQuestion(question: string, audioData?: Uint8Array): CommunicationMessage {
    if (!this.currentSession) {
      this.startSession();
    }

    // Kullanıcı sorusunu mesaj olarak ekle
    const userMessage: CommunicationMessage = {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      type: "user_question",
      content: question,
    };

    this.currentSession!.messages.push(userMessage);

    // Ses analizi yap (eğer ses verisi varsa)
    let analysisResult: VoiceAnalysisResult;

    if (audioData) {
      analysisResult = analyzeAudioFrequencies(audioData);
    } else {
      // Ses verisi yoksa rastgele analiz sonucu oluştur
      analysisResult = {
        detectedWords: this.selectRandomWords(3),
        confidence: Math.random() * 100,
        paranormalResponse: this.generateRandomResponse(),
        timestamp: Date.now(),
      };
    }

    // Paranormal cevap oluştur
    const paranormalResponse = generateResponseToQuestion(
      question,
      analysisResult
    );

    // Paranormal cevap mesajını ekle
    const responseMessage: CommunicationMessage = {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      type: "paranormal_response",
      content: paranormalResponse,
      confidence: analysisResult.confidence,
      detectedWords: analysisResult.detectedWords,
      activityLevel: Math.round(analysisResult.confidence),
    };

    this.currentSession!.messages.push(responseMessage);

    // Aktivite seviyesini güncelle
    this.currentSession!.activityLevel = Math.max(
      this.currentSession!.activityLevel,
      analysisResult.confidence
    );

    // Paranormal arşivine ekle
    const record = createParanormalRecord(question, analysisResult);
    this.paranormalArchive.push(record);

    return responseMessage;
  }

  /**
   * Ses verilerini işle ve paranormal cevap oluştur
   */
  processAudioData(audioData: Uint8Array): CommunicationMessage {
    if (!this.currentSession) {
      this.startSession();
    }

    // Ses verilerini kaydet
    this.currentSession!.recordedAudio = audioData;

    // Ses analizi yap
    const analysisResult = analyzeAudioFrequencies(audioData);

    // Sistem mesajı olarak algılanan kelimeleri ekle
    const systemMessage: CommunicationMessage = {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      type: "system_event",
      content: `Paranormal kelimeler algılandı: ${analysisResult.detectedWords.join(", ")}`,
      confidence: analysisResult.confidence,
      detectedWords: analysisResult.detectedWords,
      activityLevel: Math.round(analysisResult.confidence),
    };

    this.currentSession!.messages.push(systemMessage);

    // Aktivite seviyesini güncelle
    this.currentSession!.activityLevel = Math.max(
      this.currentSession!.activityLevel,
      analysisResult.confidence
    );

    return systemMessage;
  }

  /**
   * Sistem mesajı ekle
   */
  private addSystemMessage(content: string): void {
    if (!this.currentSession) return;

    const message: CommunicationMessage = {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      type: "system_event",
      content,
    };

    this.currentSession.messages.push(message);
  }

  /**
   * Rastgele paranormal kelimeler seç
   */
  private selectRandomWords(count: number): string[] {
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(
        Math.random() * PARANORMAL_WORD_ARCHIVE.length
      );
      result.push(PARANORMAL_WORD_ARCHIVE[randomIndex]);
    }
    return result;
  }

  /**
   * Rastgele paranormal cevap oluştur
   */
  private generateRandomResponse(): string {
    const words = this.selectRandomWords(5);
    return words.join(" ");
  }

  /**
   * Mevcut oturumu al
   */
  getCurrentSession(): CommunicationSession | null {
    return this.currentSession;
  }

  /**
   * Oturum geçmişini al
   */
  getSessionHistory(): CommunicationSession[] {
    return this.sessionHistory;
  }

  /**
   * Paranormal arşivini al
   */
  getParanormalArchive(): ParanormalRecord[] {
    return this.paranormalArchive;
  }

  /**
   * Paranormal arşivini temizle
   */
  clearArchive(): void {
    this.paranormalArchive = [];
  }

  /**
   * Oturum geçmişini temizle
   */
  clearSessionHistory(): void {
    this.sessionHistory = [];
  }

  /**
   * Tüm verileri temizle
   */
  clearAll(): void {
    this.currentSession = null;
    this.sessionHistory = [];
    this.paranormalArchive = [];
  }

  /**
   * İstatistikler al
   */
  getStatistics(): {
    totalSessions: number;
    totalMessages: number;
    averageActivityLevel: number;
    mostCommonWords: string[];
  } {
    const totalSessions = this.sessionHistory.length;
    const totalMessages = this.sessionHistory.reduce(
      (sum, session) => sum + session.messages.length,
      0
    );
    const averageActivityLevel =
      this.sessionHistory.length > 0
        ? this.sessionHistory.reduce(
            (sum, session) => sum + session.activityLevel,
            0
          ) / this.sessionHistory.length
        : 0;

    // En sık kullanılan kelimeler
    const wordFrequency: { [key: string]: number } = {};
    this.paranormalArchive.forEach((record) => {
      record.detectedWords.forEach((word) => {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      });
    });

    const mostCommonWords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    return {
      totalSessions,
      totalMessages,
      averageActivityLevel: Math.round(averageActivityLevel),
      mostCommonWords,
    };
  }
}

// Singleton instance
export const paranormalEngine = new ParanormalCommunicationEngine();
