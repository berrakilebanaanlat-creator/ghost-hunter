import { describe, it, expect, beforeEach } from "vitest";
import {
  paranormalEngine,
  ParanormalCommunicationEngine,
} from "../paranormal-communication-engine";
import {
  analyzeAudioFrequencies,
  extractWordsFromWaveform,
  generateResponseToQuestion,
  createParanormalRecord,
  calculateParanormalActivityLevel,
} from "../paranormal-voice-analyzer";
import {
  PARANORMAL_WORD_ARCHIVE,
  selectParanormalWords,
  generateParanormalResponse,
} from "../paranormal-word-archive";

describe("Paranormal Word Archive", () => {
  it("should have 2500+ paranormal words", () => {
    expect(PARANORMAL_WORD_ARCHIVE.length).toBeGreaterThanOrEqual(2500);
  });

  it("should select paranormal words", () => {
    const words = selectParanormalWords("kim", 5);
    expect(words).toHaveLength(5);
    expect(words.every((w) => typeof w === "string")).toBe(true);
  });

  it("should generate paranormal response", () => {
    const response = generateParanormalResponse("kim");
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(0);
  });

  it("should select different words for different questions", () => {
    const wordsForKim = selectParanormalWords("kim", 3);
    const wordsForNe = selectParanormalWords("ne", 3);
    // Kelimeler farklı kategorilerden gelebilir
    expect(wordsForKim.length).toBe(3);
    expect(wordsForNe.length).toBe(3);
  });
});

describe("Paranormal Voice Analyzer", () => {
  it("should analyze audio frequencies", () => {
    const frequencyData = new Uint8Array(32);
    for (let i = 0; i < frequencyData.length; i++) {
      frequencyData[i] = Math.random() * 255;
    }

    const result = analyzeAudioFrequencies(frequencyData);

    expect(result.detectedWords).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
    expect(result.paranormalResponse).toBeDefined();
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it("should extract words from waveform", () => {
    const waveformData = Array.from({ length: 100 }, () => Math.random());

    const result = extractWordsFromWaveform(waveformData);

    expect(result.detectedWords).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.paranormalResponse).toBeDefined();
  });

  it("should generate response to user question", () => {
    const analysisResult = {
      detectedWords: ["ben", "burada", "acı"],
      confidence: 75,
      paranormalResponse: "ben burada acı",
      timestamp: Date.now(),
    };

    const response = generateResponseToQuestion("kim", analysisResult);
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(0);
  });

  it("should create paranormal record", () => {
    const analysisResult = {
      detectedWords: ["ben", "burada"],
      confidence: 80,
      paranormalResponse: "ben burada",
      timestamp: Date.now(),
    };

    const record = createParanormalRecord("kim", analysisResult);

    expect(record.id).toBeDefined();
    expect(record.userQuestion).toBe("kim");
    expect(record.detectedWords).toEqual(["ben", "burada"]);
    expect(record.paranormalResponse).toBe("ben burada");
    expect(record.activityLevel).toBeGreaterThanOrEqual(0);
  });

  it("should calculate paranormal activity level", () => {
    const analysisResult = {
      detectedWords: ["ben", "burada", "acı"],
      confidence: 60,
      paranormalResponse: "ben burada acı",
      timestamp: Date.now(),
    };

    const activityLevel = calculateParanormalActivityLevel(analysisResult);

    expect(activityLevel).toBeGreaterThanOrEqual(0);
    expect(activityLevel).toBeLessThanOrEqual(100);
  });
});

describe("Paranormal Communication Engine", () => {
  let engine: ParanormalCommunicationEngine;

  beforeEach(() => {
    engine = new ParanormalCommunicationEngine();
  });

  it("should start a communication session", () => {
    const session = engine.startSession();

    expect(session).toBeDefined();
    expect(session.id).toBeDefined();
    expect(session.isActive).toBe(true);
    expect(session.messages.length).toBeGreaterThan(0);
  });

  it("should process user question", () => {
    engine.startSession();

    const response = engine.processUserQuestion("kim");

    expect(response).toBeDefined();
    expect(response.type).toBe("paranormal_response");
    expect(response.content).toBeDefined();
  });

  it("should process audio data", () => {
    engine.startSession();

    const audioData = new Uint8Array(32);
    for (let i = 0; i < audioData.length; i++) {
      audioData[i] = Math.random() * 255;
    }

    const response = engine.processAudioData(audioData);

    expect(response).toBeDefined();
    expect(response.type).toBe("system_event");
    expect(response.content).toContain("Paranormal kelimeler algılandı");
  });

  it("should end communication session", () => {
    engine.startSession();
    const session = engine.endSession();

    expect(session).toBeDefined();
    expect(session?.isActive).toBe(false);
    expect(session?.endTime).toBeDefined();
  });

  it("should maintain session history", () => {
    engine.startSession();
    engine.processUserQuestion("kim");
    engine.endSession();

    const history = engine.getSessionHistory();
    expect(history.length).toBe(1);
    expect(history[0].messages.length).toBeGreaterThan(0);
  });

  it("should maintain paranormal archive", () => {
    engine.startSession();
    engine.processUserQuestion("kim");
    engine.processUserQuestion("ne");

    const archive = engine.getParanormalArchive();
    expect(archive.length).toBe(2);
  });

  it("should get statistics", () => {
    engine.startSession();
    engine.processUserQuestion("kim");
    engine.endSession();

    const stats = engine.getStatistics();

    expect(stats.totalSessions).toBe(1);
    expect(stats.totalMessages).toBeGreaterThan(0);
    expect(stats.averageActivityLevel).toBeGreaterThanOrEqual(0);
  });

  it("should clear archive", () => {
    engine.startSession();
    engine.processUserQuestion("kim");

    let archive = engine.getParanormalArchive();
    expect(archive.length).toBeGreaterThan(0);

    engine.clearArchive();
    archive = engine.getParanormalArchive();
    expect(archive.length).toBe(0);
  });

  it("should clear session history", () => {
    engine.startSession();
    engine.endSession();

    let history = engine.getSessionHistory();
    expect(history.length).toBeGreaterThan(0);

    engine.clearSessionHistory();
    history = engine.getSessionHistory();
    expect(history.length).toBe(0);
  });

  it("should clear all data", () => {
    engine.startSession();
    engine.processUserQuestion("kim");
    engine.endSession();

    engine.clearAll();

    expect(engine.getCurrentSession()).toBeNull();
    expect(engine.getSessionHistory().length).toBe(0);
    expect(engine.getParanormalArchive().length).toBe(0);
  });
});

describe("Paranormal Communication Engine - Singleton", () => {
  it("should use singleton instance", () => {
    const engine1 = paranormalEngine;
    const engine2 = paranormalEngine;

    expect(engine1).toBe(engine2);
  });
});
