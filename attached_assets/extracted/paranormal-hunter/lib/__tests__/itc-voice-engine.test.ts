import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// expo-speech mock
vi.mock("expo-speech", () => ({
  speak: vi.fn(),
  stop: vi.fn(),
  getAvailableVoicesAsync: vi.fn().mockResolvedValue([
    { identifier: "com.apple.voice.tr-TR", language: "tr-TR", name: "Yelda", quality: "Enhanced" },
    { identifier: "com.apple.voice.tr-TR.default", language: "tr-TR", name: "Turkish", quality: "Default" },
  ]),
}));

// react-native mock - Web platform
vi.mock("react-native", () => ({
  Platform: { OS: "web" },
}));

// AsyncStorage mock
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

// Web SpeechSynthesis mock - Türkçe ses objesi
const mockTurkishVoice = {
  name: "Google Türkçe",
  lang: "tr-TR",
  localService: false,
  voiceURI: "Google Türkçe",
  default: false,
} as SpeechSynthesisVoice;

const mockEnglishVoice = {
  name: "Google US English",
  lang: "en-US",
  localService: false,
  voiceURI: "Google US English",
  default: true,
} as SpeechSynthesisVoice;

// SpeechSynthesisUtterance mock (echo/reverb için hala kullanılabilir)
const mockUtteranceInstances: any[] = [];
class MockSpeechSynthesisUtterance {
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  lang: string = "";
  pitch: number = 1;
  rate: number = 1;
  volume: number = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
    mockUtteranceInstances.push(this);
  }
}

// Fake mp3 ArrayBuffer (valid enough for mock)
const fakeMp3Buffer = new ArrayBuffer(1024);

// Mock AudioBuffer
const mockAudioBuffer = {
  duration: 0.5,
  length: 22050,
  numberOfChannels: 1,
  sampleRate: 44100,
  getChannelData: vi.fn().mockReturnValue(new Float32Array(22050)),
  copyFromChannel: vi.fn(),
  copyToChannel: vi.fn(),
};

// Mock fetch for TTS endpoint
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  arrayBuffer: vi.fn().mockResolvedValue(fakeMp3Buffer),
});

// Mock AudioBufferSourceNode
const mockSourceNode = {
  buffer: null,
  loop: false,
  detune: { value: 0 },
  playbackRate: { value: 1 },
  connect: vi.fn(),
  disconnect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  onended: null as (() => void) | null,
};

// window.speechSynthesis mock
const mockSpeechSynthesis = {
  getVoices: vi.fn().mockReturnValue([mockTurkishVoice, mockEnglishVoice]),
  speak: vi.fn(),
  cancel: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Global window mock
Object.defineProperty(globalThis, "window", {
  value: {
    speechSynthesis: mockSpeechSynthesis,
    location: {
      protocol: "https:",
      hostname: "8081-test.sg1.manus.computer",
    },
    AudioContext: vi.fn().mockImplementation(() => ({
      createGain: vi.fn().mockReturnValue({
        gain: { value: 0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      }),
      createBiquadFilter: vi.fn().mockReturnValue({
        type: "bandpass",
        frequency: { value: 2000 },
        Q: { value: 0.5 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      }),
      createBuffer: vi.fn().mockReturnValue({
        getChannelData: vi.fn().mockReturnValue(new Float32Array(44100)),
      }),
      createBufferSource: vi.fn().mockReturnValue({ ...mockSourceNode }),
      createOscillator: vi.fn().mockReturnValue({
        frequency: { value: 0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }),
      createAnalyser: vi.fn().mockReturnValue({
        fftSize: 0,
        frequencyBinCount: 128,
        getByteTimeDomainData: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      }),
      createMediaStreamSource: vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn(),
      }),
      decodeAudioData: vi.fn().mockResolvedValue(mockAudioBuffer),
      destination: {},
      sampleRate: 44100,
      state: "running",
      resume: vi.fn().mockResolvedValue(undefined),
    })),
  },
  writable: true,
  configurable: true,
});

// SpeechSynthesisUtterance global mock
Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
  value: MockSpeechSynthesisUtterance,
  writable: true,
  configurable: true,
});

// Global fetch mock
Object.defineProperty(globalThis, "fetch", {
  value: mockFetch,
  writable: true,
  configurable: true,
});

describe("ITCVoiceEngine v7 - Sunucu TTS", () => {
  let ITCVoiceEngine: any;
  let getITCEngine: any;
  let ALL_WORDS: any;

  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.resetModules();
    mockUtteranceInstances.length = 0;
    mockSpeechSynthesis.speak.mockClear();
    mockSpeechSynthesis.cancel.mockClear();
    mockFetch.mockClear();
    mockSpeechSynthesis.getVoices.mockReturnValue([mockTurkishVoice, mockEnglishVoice]);
    const mod = await import("../itc-voice-engine");
    ITCVoiceEngine = mod.ITCVoiceEngine;
    getITCEngine = mod.getITCEngine;
    ALL_WORDS = mod.ALL_WORDS;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // === Kelime Bankası Testleri ===

  it("kelime bankası en az 500 kelime içermeli", () => {
    expect(ALL_WORDS.length).toBeGreaterThanOrEqual(500);
  });

  it("kelime bankası Türkçe kelimeler içermeli", () => {
    const turkishWords = ALL_WORDS.filter(
      (w: string) =>
        w.includes("ö") || w.includes("ü") || w.includes("ş") ||
        w.includes("ç") || w.includes("ğ") || w.includes("ı")
    );
    expect(turkishWords.length).toBeGreaterThan(50);
  });

  it("kelime bankasında karanlık kelimeler olmalı", () => {
    expect(ALL_WORDS).toContain("ölüm");
    expect(ALL_WORDS).toContain("ruh");
    expect(ALL_WORDS).toContain("hayalet");
    expect(ALL_WORDS).toContain("karanlık");
  });

  it("kelime bankasında cümleler olmalı", () => {
    const phrases = ALL_WORDS.filter((w: string) => w.includes(" "));
    expect(phrases.length).toBeGreaterThan(30);
  });

  it("kelime bankasında isimler olmalı", () => {
    expect(ALL_WORDS).toContain("Ahmet");
    expect(ALL_WORDS).toContain("Fatma");
  });

  it("kelime bankasında fonemler olmalı", () => {
    const hasPhoneme = ALL_WORDS.some((w: string) => w === "ba" || w === "ka");
    expect(hasPhoneme).toBe(true);
  });

  it("toplam kelime sayısı doğru raporlanmalı", () => {
    const count = ITCVoiceEngine.getTotalWordCount();
    expect(count).toBe(ALL_WORDS.length);
    expect(count).toBeGreaterThan(500);
  });

  it("tüm kelimeler boş olmayan string olmalı", () => {
    ALL_WORDS.forEach((word: string) => {
      expect(typeof word).toBe("string");
      expect(word.length).toBeGreaterThan(0);
    });
  });

  // === Temel İşlev Testleri ===

  it("singleton engine döndürmeli", () => {
    const engine1 = getITCEngine();
    const engine2 = getITCEngine();
    expect(engine1).toBe(engine2);
  });

  it("başlangıçta aktif olmamalı", () => {
    const engine = getITCEngine();
    expect(engine.getIsActive()).toBe(false);
  });

  it("start() ile aktif olmalı", async () => {
    const engine = getITCEngine();
    await engine.start();
    expect(engine.getIsActive()).toBe(true);
    engine.stop();
  });

  it("stop() ile pasif olmalı", async () => {
    const engine = getITCEngine();
    await engine.start();
    engine.stop();
    expect(engine.getIsActive()).toBe(false);
  });

  it("çift start() güvenli olmalı", async () => {
    const engine = getITCEngine();
    await engine.start();
    await engine.start();
    expect(engine.getIsActive()).toBe(true);
    engine.stop();
  });

  it("çift stop() güvenli olmalı", () => {
    const engine = getITCEngine();
    engine.stop();
    engine.stop();
    expect(engine.getIsActive()).toBe(false);
  });

  // === Callback Testleri ===

  it("callback ile kelime bildirimi yapmalı", async () => {
    const engine = getITCEngine();
    const callback = vi.fn();
    await engine.start(callback);

    // v7: sunucu TTS fetch + Web Audio API
    vi.advanceTimersByTime(12000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(callback).toHaveBeenCalled();
    if (callback.mock.calls.length > 0) {
      const [word, character] = callback.mock.calls[0];
      expect(typeof word).toBe("string");
      expect(word.length).toBeGreaterThan(0);
      expect(typeof character).toBe("string");
    }

    engine.stop();
  });

  // === Sunucu TTS Testleri ===

  it("Web'de sunucu TTS endpoint'ine fetch yapmalı", async () => {
    const engine = getITCEngine();
    const callback = vi.fn();
    await engine.start(callback);

    vi.advanceTimersByTime(12000);
    await vi.advanceTimersByTimeAsync(1000);

    // fetch çağrılmış olmalı (TTS endpoint'i)
    const ttsCalls = mockFetch.mock.calls.filter((call: any[]) => {
      const url = call[0] as string;
      return url.includes("/api/tts");
    });
    expect(ttsCalls.length).toBeGreaterThan(0);

    // URL'de text parametresi olmalı
    const firstUrl = ttsCalls[0][0] as string;
    expect(firstUrl).toContain("/api/tts?text=");

    engine.stop();
  });

  it("TTS URL doğru API base URL kullanmalı", async () => {
    const engine = getITCEngine();
    const callback = vi.fn();
    await engine.start(callback);

    vi.advanceTimersByTime(12000);
    await vi.advanceTimersByTimeAsync(1000);

    const ttsCalls = mockFetch.mock.calls.filter((call: any[]) => {
      const url = call[0] as string;
      return url.includes("/api/tts");
    });

    if (ttsCalls.length > 0) {
      const url = ttsCalls[0][0] as string;
      // 8081 -> 3000 dönüşümü yapılmış olmalı
      expect(url).toContain("3000-");
      expect(url).not.toContain("8081-");
    }

    engine.stop();
  });

  // === Ayarlar (VoxSettings) Testleri ===

  it("varsayılan ayarlar doğru olmalı", () => {
    const engine = getITCEngine();
    const settings = engine.getSettings();
    expect(settings).toHaveProperty("whiteNoiseMode");
    expect(settings).toHaveProperty("whiteNoiseVolume");
    expect(settings).toHaveProperty("reverbLevel");
    expect(settings).toHaveProperty("echoLevel");
    expect(settings).toHaveProperty("distortionLevel");
    expect(settings).toHaveProperty("sensitivity");
    expect(settings.whiteNoiseMode).toBe("slow");
    expect(settings.whiteNoiseVolume).toBeGreaterThan(0);
    expect(settings.sensitivity).toBeGreaterThan(0);
  });

  it("white noise modu değiştirilebilmeli", () => {
    const engine = getITCEngine();
    engine.setWhiteNoiseMode("fast");
    expect(engine.getSettings().whiteNoiseMode).toBe("fast");
    engine.setWhiteNoiseMode("off");
    expect(engine.getSettings().whiteNoiseMode).toBe("off");
    engine.setWhiteNoiseMode("continuous");
    expect(engine.getSettings().whiteNoiseMode).toBe("continuous");
    engine.setWhiteNoiseMode("slow");
    expect(engine.getSettings().whiteNoiseMode).toBe("slow");
  });

  it("white noise volume 0-1 arasında sınırlanmalı", () => {
    const engine = getITCEngine();
    engine.setWhiteNoiseVolume(0.5);
    expect(engine.getSettings().whiteNoiseVolume).toBe(0.5);
    engine.setWhiteNoiseVolume(1.5);
    expect(engine.getSettings().whiteNoiseVolume).toBeLessThanOrEqual(1);
    engine.setWhiteNoiseVolume(-0.5);
    expect(engine.getSettings().whiteNoiseVolume).toBeGreaterThanOrEqual(0);
  });

  it("reverb level 0-1 arasında sınırlanmalı", () => {
    const engine = getITCEngine();
    engine.setReverbLevel(0.7);
    expect(engine.getSettings().reverbLevel).toBe(0.7);
    engine.setReverbLevel(2.0);
    expect(engine.getSettings().reverbLevel).toBeLessThanOrEqual(1);
    engine.setReverbLevel(-1);
    expect(engine.getSettings().reverbLevel).toBeGreaterThanOrEqual(0);
  });

  it("echo level 0-1 arasında sınırlanmalı", () => {
    const engine = getITCEngine();
    engine.setEchoLevel(0.5);
    expect(engine.getSettings().echoLevel).toBe(0.5);
    engine.setEchoLevel(3.0);
    expect(engine.getSettings().echoLevel).toBeLessThanOrEqual(1);
    engine.setEchoLevel(-2);
    expect(engine.getSettings().echoLevel).toBeGreaterThanOrEqual(0);
  });

  it("distortion level 0-1 arasında sınırlanmalı", () => {
    const engine = getITCEngine();
    engine.setDistortionLevel(0.8);
    expect(engine.getSettings().distortionLevel).toBe(0.8);
    engine.setDistortionLevel(5);
    expect(engine.getSettings().distortionLevel).toBeLessThanOrEqual(1);
    engine.setDistortionLevel(-1);
    expect(engine.getSettings().distortionLevel).toBeGreaterThanOrEqual(0);
  });

  it("sensitivity 0-1 arasında sınırlanmalı", () => {
    const engine = getITCEngine();
    engine.setSensitivity(0.9);
    expect(engine.getSettings().sensitivity).toBe(0.9);
    engine.setSensitivity(5);
    expect(engine.getSettings().sensitivity).toBeLessThanOrEqual(1);
    engine.setSensitivity(-1);
    expect(engine.getSettings().sensitivity).toBeGreaterThanOrEqual(0);
  });

  // === Eski API Uyumluluğu ===

  it("setWhiteNoiseEnabled eski API çalışmalı", () => {
    const engine = getITCEngine();
    engine.setWhiteNoiseEnabled(true);
    expect(engine.getSettings().whiteNoiseMode).not.toBe("off");
    engine.setWhiteNoiseEnabled(false);
    expect(engine.getSettings().whiteNoiseMode).toBe("off");
  });

  it("setEchoEnabled eski API çalışmalı", () => {
    const engine = getITCEngine();
    engine.setEchoEnabled(true);
    expect(engine.getSettings().echoLevel).toBeGreaterThan(0);
    engine.setEchoEnabled(false);
    expect(engine.getSettings().echoLevel).toBe(0);
  });

  it("setEchoVolume eski API çalışmalı", () => {
    const engine = getITCEngine();
    engine.setEchoVolume(0.5);
    // Hata fırlatmamalı
  });

  it("beyaz gürültü ses seviyesi ayarlanabilmeli", () => {
    const engine = getITCEngine();
    engine.setWhiteNoiseVolume(0.5);
    engine.setWhiteNoiseEnabled(true);
    engine.setWhiteNoiseEnabled(false);
    // Hata fırlatmamalı
  });

  // === Çalışma Sırasında Ayar Değişikliği ===

  it("aktifken ayar değiştirilebilmeli", async () => {
    const engine = getITCEngine();
    await engine.start();

    engine.setReverbLevel(0.8);
    expect(engine.getSettings().reverbLevel).toBe(0.8);

    engine.setEchoLevel(0.6);
    expect(engine.getSettings().echoLevel).toBe(0.6);

    engine.setDistortionLevel(0.3);
    expect(engine.getSettings().distortionLevel).toBe(0.3);

    engine.setSensitivity(0.1);
    expect(engine.getSettings().sensitivity).toBe(0.1);

    engine.setWhiteNoiseMode("fast");
    expect(engine.getSettings().whiteNoiseMode).toBe("fast");

    engine.stop();
  });

  // === Mikrofon Entegrasyonu Testleri ===

  it("başlangıçta mikrofon aktif olmamalı", () => {
    const engine = getITCEngine();
    expect(engine.isMicrophoneActive()).toBe(false);
  });

  it("mikrofon durumu idle olmalı", () => {
    const engine = getITCEngine();
    expect(engine.getMicrophoneStatus()).toBe("idle");
  });

  it("ses seviyesi başlangıçta 0 olmalı", () => {
    const engine = getITCEngine();
    expect(engine.getCurrentAudioLevel()).toBe(0);
  });

  it("peak seviyesi başlangıçta 0 olmalı", () => {
    const engine = getITCEngine();
    expect(engine.getPeakAudioLevel()).toBe(0);
  });

  it("ses algılanmamış olmalı", () => {
    const engine = getITCEngine();
    expect(engine.isVoiceDetected()).toBe(false);
  });

  it("stopMicrophone başlatılmamışken güvenli olmalı", () => {
    const engine = getITCEngine();
    engine.stopMicrophone();
    expect(engine.isMicrophoneActive()).toBe(false);
    expect(engine.getMicrophoneStatus()).toBe("idle");
  });

  it("stop() mikrofonu da durdurmalı", async () => {
    const engine = getITCEngine();
    await engine.start();
    engine.stop();
    expect(engine.isMicrophoneActive()).toBe(false);
    expect(engine.getMicrophoneStatus()).toBe("idle");
  });

  it("stopMicrophone sonrası tüm değerler sıfırlanmalı", () => {
    const engine = getITCEngine();
    engine.stopMicrophone();
    expect(engine.getCurrentAudioLevel()).toBe(0);
    expect(engine.getPeakAudioLevel()).toBe(0);
    expect(engine.isVoiceDetected()).toBe(false);
    expect(engine.getMicrophoneStatus()).toBe("idle");
    expect(engine.isMicrophoneActive()).toBe(false);
  });

  // === Türkçe Ses Seçimi Testleri (Web Platform) ===

  it("Web'de Türkçe SpeechSynthesisVoice objesi bulunmalı", async () => {
    const engine = getITCEngine();
    await engine.initTurkishVoice();
    expect(engine.isVoiceReady()).toBe(true);

    const webVoice = engine.getWebTurkishVoice();
    expect(webVoice).not.toBeNull();
    expect(webVoice?.lang).toBe("tr-TR");
    expect(webVoice?.name).toBe("Google Türkçe");
  });

  it("start() sonrası Türkçe ses hazır olmalı", async () => {
    const engine = getITCEngine();
    await engine.start();
    expect(engine.isVoiceReady()).toBe(true);
    engine.stop();
  });

  it("getTurkishVoiceId() Web'de ses adını döndürmeli", async () => {
    const engine = getITCEngine();
    await engine.initTurkishVoice();
    const voiceId = engine.getTurkishVoiceId();
    expect(voiceId).toBe("Google Türkçe");
  });

  it("Web'de stop() speechSynthesis.cancel() çağırmalı", async () => {
    const engine = getITCEngine();
    await engine.start();
    engine.stop();
    expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
  });

  it("Google Türkçe sesi öncelikli seçilmeli", async () => {
    const msVoice = {
      name: "Microsoft Tolga",
      lang: "tr-TR",
      localService: false,
      voiceURI: "Microsoft Tolga",
      default: false,
    } as SpeechSynthesisVoice;

    mockSpeechSynthesis.getVoices.mockReturnValue([msVoice, mockTurkishVoice, mockEnglishVoice]);

    vi.resetModules();
    const mod = await import("../itc-voice-engine");
    const engine = mod.getITCEngine();
    await engine.initTurkishVoice();

    const webVoice = engine.getWebTurkishVoice();
    expect(webVoice?.name).toBe("Google Türkçe");
  });

  // === Sunucu TTS fetch hata yönetimi ===

  it("TTS fetch hatası durumunda sessizce devam etmeli", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      arrayBuffer: vi.fn(),
    });

    const engine = getITCEngine();
    const callback = vi.fn();
    await engine.start(callback);

    vi.advanceTimersByTime(12000);
    await vi.advanceTimersByTimeAsync(1000);

    // Hata fırlatmamalı, engine hala aktif olmalı
    expect(engine.getIsActive()).toBe(true);
    engine.stop();
  });

  it("TTS fetch network hatası durumunda sessizce devam etmeli", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const engine = getITCEngine();
    const callback = vi.fn();
    await engine.start(callback);

    vi.advanceTimersByTime(12000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(engine.getIsActive()).toBe(true);
    engine.stop();
  });
});
