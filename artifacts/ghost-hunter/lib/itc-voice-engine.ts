/**
 * ITC (Instrumental Trans-Communication) Ses Motoru v7
 *
 * GhostTube VOX Klonu - Sunucu Taraflı Türkçe TTS + Web Audio API
 *
 * Android Chrome'da Türkçe TTS sesi BULUNMUYOR (0 adet).
 * Bu yüzden sunucu taraflı Google Translate TTS kullanılıyor:
 * - Sunucuya kelime gönderilir
 * - Sunucu Google Translate TTS'den Türkçe mp3 çeker
 * - mp3 Web Audio API ile çalınır (pitch/rate efektleri ile farklı karakterler)
 * - Radyo efektleri overlay edilir (statik, sweep, crackle)
 * - Echo, Reverb, Distortion efektleri
 *
 * Farklı ses karakterleri = Web Audio API playbackRate + detune + filtre
 */

import { Platform } from "react-native";
import * as Speech from "expo-speech";
import {
  DARK_WORDS as WB_DARK_WORDS,
  DARK_PHRASES as WB_DARK_PHRASES,
  SPIRIT_NAMES as WB_SPIRIT_NAMES,
  NUMBERS as WB_NUMBERS,
  HISTORICAL_WORDS as WB_HISTORICAL_WORDS,
  NATURE_WORDS as WB_NATURE_WORDS,
  EMOTION_WORDS as WB_EMOTION_WORDS,
  BODY_WORDS as WB_BODY_WORDS,
  PLACE_WORDS as WB_PLACE_WORDS,
  TIME_WORDS as WB_TIME_WORDS,
  ACTION_WORDS as WB_ACTION_WORDS,
  LONG_PHRASES,
  MANIPULATIVE_RESPONSES,
  DIALOG_PHRASES,
  WHISPER_PHRASES,
  MYTHOLOGY_WORDS,
  FOLK_BELIEFS,
  HORROR_STORY_WORDS,
  CURSES,
  DREAM_WORDS,
  RESEARCH_JARGON,
  ALL_WORDS as WB_ALL_WORDS,
  WORD_CATEGORIES,
  NINE_PHRASES,
  GIRL_CHILD_PHRASES,
  PHANTOM_PHRASES,
  HOME_OBJECT_PHRASES,
} from "./word-bank";
import { getVoxWordBank, VOX_BCP47, type VoxLang, type VoxWordBank } from "./vox-word-banks";

// ============================================================
// TİPLER
// ============================================================

export type VoiceCharacter =
  | "male"
  | "deep_male"
  | "old_male"
  | "whisper_male"
  | "female"
  | "old_female"
  | "whisper_female"
  | "child"
  | "creepy_child"
  | "girl_child"
  | "nine"
  | "muffled_male"
  | "muffled_female";

export type WhiteNoiseMode = "off" | "slow" | "fast" | "continuous";

export type MicrophoneStatus = "idle" | "requesting" | "granted" | "denied" | "recording" | "error";

export interface MicrophoneState {
  status: MicrophoneStatus;
  audioLevel: number;
  isListening: boolean;
  peakLevel: number;
  voiceDetected: boolean;
}

export interface VoxSettings {
  whiteNoiseMode: WhiteNoiseMode;
  whiteNoiseVolume: number;   // 0-1
  reverbLevel: number;        // 0-1
  echoLevel: number;          // 0-1
  distortionLevel: number;    // 0-1
  sensitivity: number;        // 0-1
}

// ============================================================
// SES KARAKTERİ PARAMETRELERİ
// GhostTube VOX'ta distortion = pitch + speed değişikliği
// Her karakter farklı pitch/rate/filtre parametreleri kullanır
// ============================================================

interface VoiceParams {
  pitch: number;       // TTS pitch (0.1-2.0)
  rate: number;        // TTS rate (0.1-2.0)
  volume: number;      // TTS volume (0-1)
  filterFreq: number;  // Bandpass filter merkez frekansı (Hz)
  filterQ: number;     // Bandpass filter Q değeri
  label: string;
}

const VOICE_PARAMS: Record<VoiceCharacter, VoiceParams> = {
  male:            { pitch: 0.75, rate: 0.80, volume: 0.9,  filterFreq: 800,  filterQ: 1.0, label: "ERKEK" },
  deep_male:       { pitch: 0.50, rate: 0.65, volume: 1.0,  filterFreq: 500,  filterQ: 1.5, label: "DERİN" },
  old_male:        { pitch: 0.60, rate: 0.55, volume: 0.7,  filterFreq: 700,  filterQ: 1.2, label: "YAŞLI" },
  whisper_male:    { pitch: 0.80, rate: 0.60, volume: 0.35, filterFreq: 2000, filterQ: 0.8, label: "FISIL." },
  female:          { pitch: 1.20, rate: 0.85, volume: 0.85, filterFreq: 1500, filterQ: 1.0, label: "KADIN" },
  old_female:      { pitch: 1.05, rate: 0.50, volume: 0.65, filterFreq: 1200, filterQ: 1.3, label: "YAŞLI K." },
  whisper_female:  { pitch: 1.15, rate: 0.55, volume: 0.30, filterFreq: 2500, filterQ: 0.7, label: "FISIL. K." },
  child:           { pitch: 1.50, rate: 0.95, volume: 0.75, filterFreq: 2000, filterQ: 0.9, label: "ÇOCUK" },
  creepy_child:    { pitch: 1.30, rate: 0.45, volume: 0.55, filterFreq: 1800, filterQ: 1.5, label: "ÜRK. ÇOCUK" },
  // Yeni karakterler
  girl_child:      { pitch: 1.70, rate: 0.90, volume: 0.70, filterFreq: 2400, filterQ: 0.8, label: "KIZ ÇOCUK" },
  nine:            { pitch: 0.90, rate: 0.40, volume: 0.60, filterFreq: 900,  filterQ: 1.6, label: "NİNE" },
  muffled_male:    { pitch: 0.60, rate: 0.70, volume: 0.80, filterFreq: 420,  filterQ: 0.4, label: "BOĞUK E." },
  muffled_female:  { pitch: 1.10, rate: 0.70, volume: 0.75, filterFreq: 480,  filterQ: 0.4, label: "BOĞUK K." },
};

// Kelime bankası referansları
const DARK_WORDS = WB_DARK_WORDS;
const DARK_PHRASES = WB_DARK_PHRASES;
const SPIRIT_NAMES = WB_SPIRIT_NAMES;
const NUMBERS = WB_NUMBERS;
const HISTORICAL_WORDS = WB_HISTORICAL_WORDS;
const NATURE_WORDS = WB_NATURE_WORDS;
const EMOTION_WORDS = WB_EMOTION_WORDS;
const BODY_WORDS = WB_BODY_WORDS;
const PLACE_WORDS = WB_PLACE_WORDS;
const TIME_WORDS = WB_TIME_WORDS;
const ACTION_WORDS = WB_ACTION_WORDS;
const ALL_WORDS = WB_ALL_WORDS;

// ============================================================
// WEB TÜRKÇE SES BULUCU
// ============================================================

function findWebVoice(prefix: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const langVoices = voices.filter(v => (v.lang || "").toLowerCase().startsWith(prefix));
  if (langVoices.length === 0) return null;

  // Google > Microsoft > local > herhangi
  return (
    langVoices.find(v => v.name.toLowerCase().includes("google")) ||
    langVoices.find(v => v.name.toLowerCase().includes("microsoft")) ||
    langVoices.find(v => v.localService) ||
    langVoices[0]
  );
}

async function findNativeVoice(prefix: string): Promise<string | null> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const langVoices = voices.filter(v => (v.language || "").toLowerCase().startsWith(prefix));
    if (langVoices.length === 0) return null;
    const enhanced = langVoices.find(v => v.quality === "Enhanced");
    return (enhanced || langVoices[0]).identifier;
  } catch {
    return null;
  }
}

function waitForWebVoices(): Promise<void> {
  return new Promise((resolve) => {
    if (Platform.OS !== "web" || typeof window === "undefined" || !window.speechSynthesis) {
      resolve();
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) { resolve(); return; }

    const handler = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve();
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve();
    }, 5000);
  });
}

// ============================================================
// RADYO EFEKTLERİ MOTORU (Web Audio API)
// GhostTube VOX'un radyo stream efektlerini simüle eder
// ============================================================

class RadioEffectsEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;

  // Beyaz gürültü
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode;
  private noiseFilter: BiquadFilterNode;
  private sweepLFO: OscillatorNode | null = null;
  private sweepGain: GainNode | null = null;

  // Radyo statik overlay (kelime söylenirken)
  private staticSource: AudioBufferSourceNode | null = null;
  private staticGain: GainNode;
  private staticFilter: BiquadFilterNode;

  // Crackle efekti
  private crackleInterval: ReturnType<typeof setInterval> | null = null;

  // ── Ses efekti zinciri (Reverb / Echo / Distortion) ──────────────────────
  private distortionNode: WaveShaperNode;
  private echoDelay: DelayNode;
  private echoFeedback: GainNode;
  private echoWetGain: GainNode;
  private reverbConvolver: ConvolverNode;
  private reverbWetGain: GainNode;
  // Mevcut efekt seviyeleri (0–1)
  private _voiceReverbLevel = 0;
  private _voiceEchoLevel = 0;
  private _voiceDistortionAmount = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Master gain
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(ctx.destination);

    // Beyaz gürültü zinciri
    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = "bandpass";
    this.noiseFilter.frequency.value = 2000;
    this.noiseFilter.Q.value = 0.5;

    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0;
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);

    // Statik overlay zinciri
    this.staticFilter = ctx.createBiquadFilter();
    this.staticFilter.type = "bandpass";
    this.staticFilter.frequency.value = 1500;
    this.staticFilter.Q.value = 2.0;

    this.staticGain = ctx.createGain();
    this.staticGain.gain.value = 0;
    this.staticFilter.connect(this.staticGain);
    this.staticGain.connect(this.masterGain);

    // ── Distortion (WaveShaper) ──────────────────────────────────────────
    this.distortionNode = ctx.createWaveShaper();
    this.distortionNode.curve = this._makeDistortionCurve(0);
    this.distortionNode.oversample = "4x";

    // ── Echo (Delay + feedback loop) ────────────────────────────────────
    this.echoDelay = ctx.createDelay(1.5);
    this.echoDelay.delayTime.value = 0.38;
    this.echoFeedback = ctx.createGain();
    this.echoFeedback.gain.value = 0;
    this.echoWetGain = ctx.createGain();
    this.echoWetGain.gain.value = 0;
    this.echoDelay.connect(this.echoFeedback);
    this.echoFeedback.connect(this.echoDelay);
    this.echoDelay.connect(this.echoWetGain);
    this.echoWetGain.connect(this.masterGain);

    // ── Reverb (Convolver + yapay impulse response) ─────────────────────
    this.reverbConvolver = ctx.createConvolver();
    this.reverbConvolver.buffer = this._generateImpulseResponse(2.5, 3.0);
    this.reverbWetGain = ctx.createGain();
    this.reverbWetGain.gain.value = 0;
    this.reverbConvolver.connect(this.reverbWetGain);
    this.reverbWetGain.connect(this.masterGain);

    // Distortion çıkışı → echo + reverb girdilerine bağla
    this.distortionNode.connect(this.echoDelay);
    this.distortionNode.connect(this.reverbConvolver);
    // Distortion çıkışı → doğrudan master (distorted dry yol)
    this.distortionNode.connect(this.masterGain);
  }

  // ── Yapay impulse response (oda yankısı simülasyonu) ─────────────────────
  private _generateImpulseResponse(duration: number, decay: number): AudioBuffer {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const buf = this.ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buf;
  }

  // ── Distortion eğrisi ────────────────────────────────────────────────────
  private _makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const n = 256;
    const curve = new Float32Array(new ArrayBuffer(n * Float32Array.BYTES_PER_ELEMENT));
    const k = amount * 150;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = k > 0
        ? ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x))
        : x;
    }
    return curve as Float32Array<ArrayBuffer>;
  }

  // ── Efekt seviyesi güncelleme metodları (dışarıdan çağrılır) ─────────────
  setVoiceReverbLevel(level: number): void {
    this._voiceReverbLevel = Math.max(0, Math.min(1, level));
    this.reverbWetGain.gain.setTargetAtTime(
      this._voiceReverbLevel * 0.65,
      this.ctx.currentTime,
      0.08,
    );
  }

  setVoiceEchoLevel(level: number): void {
    this._voiceEchoLevel = Math.max(0, Math.min(1, level));
    this.echoFeedback.gain.setTargetAtTime(
      this._voiceEchoLevel * 0.42,
      this.ctx.currentTime,
      0.08,
    );
    this.echoWetGain.gain.setTargetAtTime(
      this._voiceEchoLevel * 0.55,
      this.ctx.currentTime,
      0.08,
    );
  }

  setVoiceDistortionLevel(level: number): void {
    this._voiceDistortionAmount = Math.max(0, Math.min(1, level));
    this.distortionNode.curve = this._makeDistortionCurve(this._voiceDistortionAmount);
  }

  // --- Beyaz Gürültü ---

  startWhiteNoise(mode: WhiteNoiseMode, volume: number): void {
    this.stopWhiteNoise();
    if (mode === "off") return;

    // Gürültü buffer oluştur
    const duration = 10;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = buffer;
    this.noiseSource.loop = true;
    this.noiseSource.connect(this.noiseFilter);

    // Sweep LFO (frekans taraması - radyo dial efekti)
    this.sweepLFO = this.ctx.createOscillator();
    this.sweepGain = this.ctx.createGain();

    switch (mode) {
      case "slow":
        this.sweepLFO.frequency.value = 0.15;
        this.sweepGain.gain.value = 1500;
        break;
      case "fast":
        this.sweepLFO.frequency.value = 2.0;
        this.sweepGain.gain.value = 2000;
        break;
      case "continuous":
        this.sweepLFO.frequency.value = 0.5;
        this.sweepGain.gain.value = 1000;
        break;
    }

    this.sweepLFO.connect(this.sweepGain);
    this.sweepGain.connect(this.noiseFilter.frequency);
    this.noiseGain.gain.value = volume * 0.15;

    this.noiseSource.start();
    this.sweepLFO.start();
  }

  stopWhiteNoise(): void {
    try {
      this.noiseSource?.stop();
      this.noiseSource?.disconnect();
      this.sweepLFO?.stop();
      this.sweepLFO?.disconnect();
      this.sweepGain?.disconnect();
    } catch { /* */ }
    this.noiseSource = null;
    this.sweepLFO = null;
    this.sweepGain = null;
    this.noiseGain.gain.value = 0;
  }

  setWhiteNoiseVolume(vol: number): void {
    this.noiseGain.gain.value = vol * 0.15;
  }

  // --- Radyo Statik Overlay (kelime söylenirken) ---

  /**
   * Kelime söylenmeden önce kısa statik burst çal.
   * GhostTube'daki "radyodan kelime yakalandı" hissini verir.
   */
  playRadioBurst(filterFreq: number, intensity: number): void {
    try {
      // Kısa statik burst (200-400ms)
      const burstDuration = 0.2 + Math.random() * 0.2;
      const bufferSize = Math.floor(this.ctx.sampleRate * burstDuration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        // Radyo statik: beyaz gürültü + crackle
        const noise = (Math.random() * 2 - 1);
        const crackle = Math.random() < 0.02 ? (Math.random() * 2 - 1) * 3 : 0;
        // Fade in/out envelope
        const env = Math.min(1, i / (bufferSize * 0.1), (bufferSize - i) / (bufferSize * 0.1));
        data[i] = (noise * 0.3 + crackle * 0.2) * env * intensity;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = filterFreq;
      filter.Q.value = 2.0;

      const gain = this.ctx.createGain();
      gain.gain.value = 0.4 * intensity;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      source.start();
      source.onended = () => {
        try {
          source.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch { /* */ }
      };
    } catch { /* */ }
  }

  /**
   * Kelime söylenirken arka planda hafif statik overlay çal.
   * Radyodan geliyormuş hissi verir.
   */
  startStaticOverlay(filterFreq: number, volume: number, durationMs: number): void {
    this.stopStaticOverlay();

    try {
      const duration = durationMs / 1000;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const noise = (Math.random() * 2 - 1) * 0.15;
        // Rastgele crackle tıkırtıları
        const crackle = Math.random() < 0.005 ? (Math.random() * 2 - 1) * 0.8 : 0;
        // Hafif fade in/out
        const env = Math.min(1, i / (this.ctx.sampleRate * 0.05), (bufferSize - i) / (this.ctx.sampleRate * 0.1));
        data[i] = (noise + crackle) * env;
      }

      this.staticSource = this.ctx.createBufferSource();
      this.staticSource.buffer = buffer;
      this.staticSource.connect(this.staticFilter);

      this.staticFilter.frequency.value = filterFreq;
      this.staticGain.gain.value = volume * 0.3;

      this.staticSource.start();
      this.staticSource.onended = () => {
        this.staticGain.gain.value = 0;
      };
    } catch { /* */ }
  }

  stopStaticOverlay(): void {
    try {
      this.staticSource?.stop();
      this.staticSource?.disconnect();
    } catch { /* */ }
    this.staticSource = null;
    this.staticGain.gain.value = 0;
  }

  /**
   * Crackle efekti - rastgele tıkırtılar (radyo paraziti)
   */
  startCrackle(intensity: number): void {
    this.stopCrackle();
    if (intensity < 0.05) return;

    this.crackleInterval = setInterval(() => {
      if (Math.random() < intensity * 0.3) {
        this.playCrackle(intensity);
      }
    }, 200 + Math.random() * 300);
  }

  private playCrackle(intensity: number): void {
    try {
      const duration = 0.01 + Math.random() * 0.03;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * intensity * 0.5;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const gain = this.ctx.createGain();
      gain.gain.value = intensity * 0.15;

      source.connect(gain);
      gain.connect(this.masterGain);
      source.start();

      source.onended = () => {
        try { source.disconnect(); gain.disconnect(); } catch { /* */ }
      };
    } catch { /* */ }
  }

  stopCrackle(): void {
    if (this.crackleInterval) {
      clearInterval(this.crackleInterval);
      this.crackleInterval = null;
    }
  }

  /**
   * Echo efekti - kelime söylendikten sonra gecikmiş tekrar
   */
  playEcho(word: string, echoLevel: number, voiceParams: VoiceParams, _webVoice: SpeechSynthesisVoice | null, nativeVoiceId: string | null, isWeb: boolean, nativeLang: string = "tr-TR", webLang: string = "tr"): void {
    if (echoLevel < 0.1) return;

    const echoDelay = 400 + echoLevel * 600;
    setTimeout(() => {
      const echoPitch = voiceParams.pitch * 0.85;
      const echoRate = voiceParams.rate * 0.7;
      const echoVol = voiceParams.volume * echoLevel * 0.35;

      if (isWeb) {
        this.speakWebViaTTS(word, echoPitch, echoRate, echoVol, webLang);
      } else {
        this.speakNativeDirect(word, echoPitch, echoRate, echoVol, nativeVoiceId, nativeLang);
      }

      // İkinci echo (reverb efekti)
      if (echoLevel > 0.3) {
        setTimeout(() => {
          const revPitch = voiceParams.pitch * 0.75;
          const revRate = voiceParams.rate * 0.55;
          const revVol = voiceParams.volume * echoLevel * 0.15;

          if (isWeb) {
            this.speakWebViaTTS(word, revPitch, revRate, revVol, webLang);
          } else {
            this.speakNativeDirect(word, revPitch, revRate, revVol, nativeVoiceId, nativeLang);
          }
        }, 300 + echoLevel * 400);
      }
    }, echoDelay);
  }

  /**
   * Web'de sunucu TTS endpoint'inden mp3 çekip Web Audio API ile çal
   * (Echo/reverb için kullanılır)
   */
  private async speakWebViaTTS(word: string, pitch: number, rate: number, volume: number, lang: string = "tr"): Promise<void> {
    try {
      const apiBase = this.getApiBaseUrlStatic();
      const url = `${apiBase}/api/tts?text=${encodeURIComponent(word)}&language=${encodeURIComponent(lang)}`;
      const response = await fetch(url);
      if (!response.ok) return;

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

      const source = this.ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.detune.value = Math.log2(pitch) * 12 * 100;
      source.playbackRate.value = Math.max(0.25, Math.min(4.0, rate));

      const gainNode = this.ctx.createGain();
      gainNode.gain.value = Math.max(0.0, Math.min(1.0, volume));

      // Ses efekti zinciri üzerinden yönlendir:
      // source → gainNode → distortionNode → (echo / reverb / dry master)
      // Distortion node yokken (level=0) eğri linear → ses bozulmadan geçer
      source.connect(gainNode);
      gainNode.connect(this.distortionNode);
      source.start();

      source.onended = () => {
        try { source.disconnect(); gainNode.disconnect(); } catch { /* */ }
      };
    } catch { /* Echo hatası sessizce geç */ }
  }

  private getApiBaseUrlStatic(): string {
    if (typeof window !== "undefined" && window.location) {
      const { protocol, hostname } = window.location;
      const apiHostname = hostname.replace(/^8081-/, "3000-");
      if (apiHostname !== hostname) return `${protocol}//${apiHostname}`;
    }
    return "http://127.0.0.1:3000";
  }

  private speakNativeDirect(word: string, pitch: number, rate: number, volume: number, voiceId: string | null, language: string = "tr-TR"): void {
    const opts: Speech.SpeechOptions = {
      language,
      pitch: Math.max(0.1, Math.min(2.0, pitch)),
      rate: Math.max(0.1, Math.min(2.0, rate)),
      volume: Math.max(0.0, Math.min(1.0, volume)),
    };
    if (voiceId) opts.voice = voiceId;
    Speech.speak(word, opts);
  }

  // --- Temizlik ---

  dispose(): void {
    this.stopWhiteNoise();
    this.stopStaticOverlay();
    this.stopCrackle();
    try {
      this.noiseGain.disconnect();
      this.noiseFilter.disconnect();
      this.staticGain.disconnect();
      this.staticFilter.disconnect();
      this.distortionNode.disconnect();
      this.echoDelay.disconnect();
      this.echoFeedback.disconnect();
      this.echoWetGain.disconnect();
      this.reverbConvolver.disconnect();
      this.reverbWetGain.disconnect();
      this.masterGain.disconnect();
    } catch { /* */ }
  }
}

// ============================================================
// ANA ITC SES MOTORU
// ============================================================

class ITCVoiceEngine {
  private isActive: boolean = false;
  private audioContext: AudioContext | null = null;
  private radioEffects: RadioEffectsEngine | null = null;
  private speakTimeout: ReturnType<typeof setTimeout> | null = null;
  private onWordSpoken: ((word: string, character: VoiceCharacter) => void) | null = null;
  private isSpeaking: boolean = false;

  // Türkçe ses bilgisi (aktif dile göre — TR varsayılan)
  private webTurkishVoice: SpeechSynthesisVoice | null = null;
  private nativeTurkishVoiceId: string | null = null;
  private voiceSearchDone: boolean = false;
  private isWebPlatform: boolean = Platform.OS === "web";

  // VOX dil seçimi — Türkçe varsayılan, mevcut davranış korunur (no-op)
  private voxLang: VoxLang = "tr";
  private voiceBcp47: string = "tr-TR";
  private pools: VoxWordBank = getVoxWordBank("tr");

  // Ayarlar
  private settings: VoxSettings = {
    whiteNoiseMode: "slow",
    whiteNoiseVolume: 0.3,
    reverbLevel: 0.25,
    echoLevel: 0.3,
    distortionLevel: 0.5,
    sensitivity: 0.5,
  };

  // Türkçe TTS başarısızlık bayrağı (ses yok sorunu için fallback)
  private turkishTTSFailed: boolean = false;

  // Aktif karakter (speakOnWeb'e geçirmek için)
  private _currentCharacter: VoiceCharacter = "male";

  // Son kullanılan kelimeler — tekrar önleme (son 20)
  private recentWords: string[] = [];

  // Mikrofon
  private microphoneEnabled: boolean = false;
  private micAnalyserNode: AnalyserNode | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private micStream: MediaStream | null = null;
  private micMonitorInterval: ReturnType<typeof setInterval> | null = null;
  private currentAudioLevel: number = 0;
  private peakAudioLevel: number = 0;
  private voiceDetected: boolean = false;
  private voiceResponseCooldown: number = 0;
  private onMicStateChange: ((state: MicrophoneState) => void) | null = null;
  private micStatus: MicrophoneStatus = "idle";
  private audioLevelHistory: number[] = [];
  private audioRecorder: any = null;

  private readonly LEVEL_HISTORY_SIZE = 10;
  private readonly VOICE_THRESHOLD = 0.15;
  private readonly VOICE_RESPONSE_MIN = 4000;
  private readonly VOICE_RESPONSE_MAX = 12000;
  private readonly VOICE_COOLDOWN = 10000;

  // ============================================================
  // TÜRKÇE SES BAŞLATMA
  // ============================================================

  async initTurkishVoice(): Promise<void> {
    if (this.voiceSearchDone) return;

    if (this.isWebPlatform) {
      await waitForWebVoices();
      this.webTurkishVoice = findWebVoice(this.voxLang);
      if (this.webTurkishVoice) {
        console.log(`[ITC v6] Web Türkçe ses: "${this.webTurkishVoice.name}" (${this.webTurkishVoice.lang})`);
      } else {
        console.log("[ITC v6] Web Türkçe ses bulunamadı, lang=tr-TR kullanılacak");
        if (typeof window !== "undefined" && window.speechSynthesis) {
          const all = window.speechSynthesis.getVoices();
          console.log(`[ITC v6] Mevcut ${all.length} ses, diller: ${[...new Set(all.map(v => v.lang))].sort().join(", ")}`);
        }
      }
    } else {
      this.nativeTurkishVoiceId = await findNativeVoice(this.voxLang);
      console.log(this.nativeTurkishVoiceId
        ? `[ITC v6] Native Türkçe ses: ${this.nativeTurkishVoiceId}`
        : "[ITC v6] Native Türkçe ses bulunamadı");
    }

    this.voiceSearchDone = true;
  }

  // ============================================================
  // VOX DİL SEÇİMİ (TR/EN/DE) — Türkçe varsayılan ve no-op
  // ============================================================

  setLanguage(lang: VoxLang): void {
    if (lang === this.voxLang) return;
    this.voxLang = lang;
    this.voiceBcp47 = VOX_BCP47[lang] ?? "tr-TR";
    this.pools = getVoxWordBank(lang);
    // Yeni dil için ses araması tekrar yapılsın
    this.voiceSearchDone = false;
    this.webTurkishVoice = null;
    this.nativeTurkishVoiceId = null;
    this.turkishTTSFailed = false;
  }

  getLanguage(): VoxLang {
    return this.voxLang;
  }

  // ============================================================
  // AUDIO CONTEXT
  // ============================================================

  private getAudioContext(): AudioContext | null {
    if (!this.isWebPlatform) return null;
    if (!this.audioContext) {
      try {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AC();
      } catch { return null; }
    }
    return this.audioContext;
  }

  // ============================================================
  // MİKROFON
  // ============================================================

  async startMicrophone(onStateChange?: (state: MicrophoneState) => void): Promise<boolean> {
    this.onMicStateChange = onStateChange || null;
    this.updateMicState("requesting");
    return this.isWebPlatform ? this.startWebMicrophone() : this.startNativeMicrophone();
  }

  private async startWebMicrophone(): Promise<boolean> {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        this.updateMicState("error");
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      this.micStream = stream;
      const ctx = this.getAudioContext();
      if (!ctx) { this.updateMicState("error"); return false; }
      if (ctx.state === "suspended") await ctx.resume();

      this.micSourceNode = ctx.createMediaStreamSource(stream);
      this.micAnalyserNode = ctx.createAnalyser();
      this.micAnalyserNode.fftSize = 256;
      this.micAnalyserNode.smoothingTimeConstant = 0.8;
      this.micSourceNode.connect(this.micAnalyserNode);

      this.microphoneEnabled = true;
      this.updateMicState("recording");
      this.startMicMonitoring();
      return true;
    } catch {
      this.updateMicState("denied");
      return false;
    }
  }

  private async startNativeMicrophone(): Promise<boolean> {
    try {
      // Native'de mikrofon izni kontrolü
      try {
        const { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } = require('expo-audio');
        const currentPerm = await getRecordingPermissionsAsync();
        if (!currentPerm.granted) {
          const { granted } = await requestRecordingPermissionsAsync();
          if (!granted) {
            console.warn('[ITC v6] Mikrofon izni verilmedi');
            this.updateMicState("denied");
            return false;
          }
        }
      } catch (permErr) {
        console.warn('[ITC v6] İzin kontrolü atlandı:', permErr);
        // İzin kontrolü başarısız olsa bile devam et (simülasyon modu)
      }

      this.microphoneEnabled = true;
      this.updateMicState("recording");
      this.micMonitorInterval = setInterval(() => {
        this.processAudioLevel(Math.random() * 0.3);
      }, 100);
      return true;
    } catch (error) {
      console.error('[ITC v6] Native mikrofon başlatma hatası:', error);
      this.updateMicState("error");
      return false;
    }
  }

  private startMicMonitoring(): void {
    if (this.micMonitorInterval) clearInterval(this.micMonitorInterval);
    this.micMonitorInterval = setInterval(() => {
      if (!this.micAnalyserNode) return;
      const dataArray = new Uint8Array(this.micAnalyserNode.frequencyBinCount);
      this.micAnalyserNode.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      this.processAudioLevel(sum / dataArray.length / 255);
    }, 100);
  }

  private processAudioLevel(level: number): void {
    this.currentAudioLevel = level;
    if (level > this.peakAudioLevel) this.peakAudioLevel = level;

    this.audioLevelHistory.push(level);
    if (this.audioLevelHistory.length > this.LEVEL_HISTORY_SIZE) this.audioLevelHistory.shift();

    const avgLevel = this.audioLevelHistory.reduce((a, b) => a + b, 0) / this.audioLevelHistory.length;
    const threshold = this.VOICE_THRESHOLD * (1 - this.settings.sensitivity * 0.5);

    const wasVoiceDetected = this.voiceDetected;
    this.voiceDetected = avgLevel > threshold;

    if (this.voiceDetected && !wasVoiceDetected && this.isActive) {
      const now = Date.now();
      if (now > this.voiceResponseCooldown) {
        this.voiceResponseCooldown = now + this.VOICE_COOLDOWN;
        const delay = this.VOICE_RESPONSE_MIN + Math.random() * (this.VOICE_RESPONSE_MAX - this.VOICE_RESPONSE_MIN);
        setTimeout(() => {
          if (!this.isActive) return;
          const { word, character } = this.getRandomWord();
          this.speakWord(word, character);
        }, delay);
      }
    }
    this.emitMicState();
  }

  private updateMicState(status: MicrophoneStatus): void {
    this.micStatus = status;
    this.emitMicState();
  }

  private emitMicState(): void {
    this.onMicStateChange?.({
      status: this.micStatus,
      audioLevel: this.currentAudioLevel,
      isListening: this.microphoneEnabled,
      peakLevel: this.peakAudioLevel,
      voiceDetected: this.voiceDetected,
    });
  }

  stopMicrophone(): void {
    try {
      this.microphoneEnabled = false;
      if (this.micMonitorInterval) { clearInterval(this.micMonitorInterval); this.micMonitorInterval = null; }
      if (this.micSourceNode) { try { this.micSourceNode.disconnect(); } catch { /* */ } this.micSourceNode = null; }
      this.micAnalyserNode = null;
      if (this.micStream) {
        try { this.micStream.getTracks().forEach(t => t.stop()); } catch { /* */ }
        this.micStream = null;
      }
      if (this.audioRecorder) {
        try {
          // Native state kontrolü - zaten durmuşsa stop() çağırma
          if (typeof this.audioRecorder.isRecording !== 'undefined' && !this.audioRecorder.isRecording) {
            console.warn('[ITC v6] audioRecorder zaten durmuş, stop() atlanıyor');
          } else {
            this.audioRecorder.stop?.();
          }
        } catch (stopErr) {
          console.warn('[ITC v6] audioRecorder stop hatası (güvenli):', stopErr);
        }
        this.audioRecorder = null;
      }
      this.currentAudioLevel = 0;
      this.peakAudioLevel = 0;
      this.voiceDetected = false;
      this.audioLevelHistory = [];
      this.updateMicState("idle");
    } catch (error) {
      // stopMicrophone hiçbir zaman çökmemeli
      console.error('[ITC v6] stopMicrophone genel hatası (güvenli):', error);
      this.microphoneEnabled = false;
      this.currentAudioLevel = 0;
      this.peakAudioLevel = 0;
      this.voiceDetected = false;
      this.audioLevelHistory = [];
      try { this.updateMicState("idle"); } catch { /* */ }
    }
  }

  // ============================================================
  // KELİME SEÇİMİ
  // ============================================================

  private getRandomWord(): { word: string; character: VoiceCharacter } {
    // Karakter seçimi — genişletilmiş çeşitlilik
    const characterRoll = Math.random();
    let character: VoiceCharacter;
    if (characterRoll < 0.12)      character = "male";
    else if (characterRoll < 0.22) character = "deep_male";
    else if (characterRoll < 0.30) character = "old_male";
    else if (characterRoll < 0.38) character = "whisper_male";
    else if (characterRoll < 0.50) character = "female";
    else if (characterRoll < 0.58) character = "old_female";
    else if (characterRoll < 0.66) character = "whisper_female";
    else if (characterRoll < 0.74) character = "child";
    else if (characterRoll < 0.80) character = "creepy_child";
    else if (characterRoll < 0.86) character = "girl_child";
    else if (characterRoll < 0.92) character = "nine";
    else                            character = "male";

    // Karaktere özel kelime havuzu (aktif dile göre)
    const p = this.pools;
    let word: string;
    if (character === "nine") {
      word = p.NINE_PHRASES[Math.floor(Math.random() * p.NINE_PHRASES.length)];
      return { word, character };
    }
    if (character === "girl_child") {
      word = p.GIRL_CHILD_PHRASES[Math.floor(Math.random() * p.GIRL_CHILD_PHRASES.length)];
      return { word, character };
    }

    // Genel kelime seçimi
    const roll = Math.random();
    if (roll < 0.35) {
      word = p.DARK_WORDS[Math.floor(Math.random() * p.DARK_WORDS.length)];
    } else if (roll < 0.55) {
      word = p.DARK_PHRASES[Math.floor(Math.random() * p.DARK_PHRASES.length)];
    } else if (roll < 0.65) {
      const ext = [...p.LONG_PHRASES, ...p.MANIPULATIVE_RESPONSES, ...p.DIALOG_PHRASES, ...p.WHISPER_PHRASES, ...p.HORROR_STORY_WORDS, ...p.CURSES, ...p.HOME_OBJECT_PHRASES];
      word = ext[Math.floor(Math.random() * ext.length)];
    } else if (roll < 0.80) {
      const cultural = [...p.MYTHOLOGY_WORDS, ...p.FOLK_BELIEFS, ...p.DREAM_WORDS, ...p.RESEARCH_JARGON];
      word = cultural[Math.floor(Math.random() * cultural.length)];
    } else {
      const other = [...p.SPIRIT_NAMES, ...p.NUMBERS, ...p.HISTORICAL_WORDS, ...p.NATURE_WORDS, ...p.EMOTION_WORDS, ...p.BODY_WORDS, ...p.PLACE_WORDS, ...p.TIME_WORDS, ...p.ACTION_WORDS];
      word = other[Math.floor(Math.random() * other.length)];
    }

    // Tekrar önleme — son 20 kelimeden biri geldiyse 2 kez daha dene
    for (let retry = 0; retry < 2 && this.recentWords.includes(word); retry++) {
      const pool = [...this.pools.DARK_WORDS, ...this.pools.DARK_PHRASES, ...this.pools.SPIRIT_NAMES, ...this.pools.PLACE_WORDS, ...this.pools.TIME_WORDS];
      word = pool[Math.floor(Math.random() * pool.length)];
    }
    this.recentWords.push(word);
    if (this.recentWords.length > 20) this.recentWords.shift();

    return { word, character };
  }

  // ============================================================
  // PHANTOM EVENT (Boğuk/Fısıltı - ~3 kez / 10 dakika)
  // ============================================================

  private phantomTimeout: ReturnType<typeof setTimeout> | null = null;

  private schedulePhantomEvent(): void {
    if (!this.isActive) return;
    // 100-300 saniye arası random → ortalama 200sn → 10 dk'da ~3 kez
    const delayMs = (100 + Math.random() * 200) * 1000;
    this.phantomTimeout = setTimeout(() => {
      if (!this.isActive) return;
      this.triggerPhantomEvent();
      this.schedulePhantomEvent();
    }, delayMs);
  }

  private triggerPhantomEvent(): void {
    if (this.isSpeaking) return;
    const roll = Math.random();
    const p = this.pools;
    let character: VoiceCharacter;
    let wordPool: string[];

    if (roll < 0.30) {
      character = "muffled_male";
      wordPool = p.PHANTOM_PHRASES;
    } else if (roll < 0.55) {
      character = "muffled_female";
      wordPool = p.PHANTOM_PHRASES;
    } else if (roll < 0.68) {
      character = "whisper_male";
      wordPool = [...p.WHISPER_PHRASES, ...p.PHANTOM_PHRASES, ...p.HOME_OBJECT_PHRASES];
    } else if (roll < 0.80) {
      character = "whisper_female";
      wordPool = [...p.WHISPER_PHRASES, ...p.PHANTOM_PHRASES, ...p.HOME_OBJECT_PHRASES];
    } else if (roll < 0.90) {
      character = "nine";
      wordPool = p.NINE_PHRASES;
    } else {
      character = "girl_child";
      wordPool = p.GIRL_CHILD_PHRASES;
    }

    const word = wordPool[Math.floor(Math.random() * wordPool.length)];
    this.speakWord(word, character);
  }

  // ============================================================
  // KONUŞMA - GhostTube VOX Tarzı
  // ============================================================

  /**
   * Kelimeyi GhostTube VOX tarzında seslendir:
   * 1. Radyo burst efekti (statik gürültü)
   * 2. TTS ile kelime söyle
   * 3. Arka planda statik overlay
   * 4. Echo/reverb efektleri
   * 5. Radyo burst efekti (kapanış)
   */
  private async speakWord(word: string, character: VoiceCharacter): Promise<void> {
    if (this.isSpeaking) return;
    this.isSpeaking = true;

    const voiceParams = VOICE_PARAMS[character];

    // Distortion efekti: pitch ve rate'i rastgele boz (GhostTube gibi)
    let pitch = voiceParams.pitch;
    let rate = voiceParams.rate;
    if (this.settings.distortionLevel > 0.05) {
      const d = this.settings.distortionLevel;
      pitch += (Math.random() - 0.5) * d * 0.6;
      rate += (Math.random() - 0.5) * d * 0.4;
      pitch = Math.max(0.2, Math.min(2.0, pitch));
      rate = Math.max(0.2, Math.min(2.0, rate));
    }

    try {
      // 1. Radyo burst (kelime öncesi)
      if (this.radioEffects && this.isWebPlatform) {
        this.radioEffects.playRadioBurst(voiceParams.filterFreq, 0.5 + this.settings.distortionLevel * 0.5);
      }

      // 2. Kısa gecikme (burst sonrası)
      await new Promise(r => setTimeout(r, 150 + Math.random() * 100));

      if (!this.isActive) { this.isSpeaking = false; return; }

      // 3. TTS ile kelime söyle (Web: ElevenLabs API + Web Audio API)
      this._currentCharacter = character;
      if (this.isWebPlatform) {
        await this.speakOnWeb(word, pitch, rate, voiceParams.volume);
      } else {
        this.speakOnNative(word, pitch, rate, voiceParams.volume);
      }

      // 4. Statik overlay (kelime söylenirken)
      if (this.radioEffects && this.isWebPlatform) {
        const overlayDuration = 1000 + word.length * 150;
        this.radioEffects.startStaticOverlay(
          voiceParams.filterFreq,
          0.2 + this.settings.distortionLevel * 0.3,
          overlayDuration
        );
      }

      // 5. Echo efekti
      if (this.radioEffects && this.settings.echoLevel > 0.1) {
        this.radioEffects.playEcho(
          word,
          this.settings.echoLevel,
          { ...voiceParams, pitch, rate },
          this.webTurkishVoice,
          this.nativeTurkishVoiceId,
          this.isWebPlatform,
          this.voiceBcp47,
          this.voxLang
        );
      }

      // 6. Kapanış burst (kelime sonrası)
      if (this.radioEffects && this.isWebPlatform) {
        const closingDelay = 800 + word.length * 100;
        setTimeout(() => {
          if (!this.isActive) return;
          this.radioEffects?.playRadioBurst(voiceParams.filterFreq * 0.8, 0.3);
        }, closingDelay);
      }
    } catch {
      // Hata durumunda sessizce devam et
    }

    // Callback
    this.onWordSpoken?.(word, character);

    // isSpeaking'i kelime bittikten sonra sıfırla
    const speakDuration = 1500 + word.length * 200;
    setTimeout(() => { this.isSpeaking = false; }, speakDuration);
  }

  private async speakOnWeb(word: string, pitch: number, rate: number, volume: number): Promise<void> {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();

    try {
      // Sunucu TTS endpoint'inden Türkçe mp3 çek (ElevenLabs)
      const apiBase = this.getApiBaseUrl();
      const url = `${apiBase}/api/tts?text=${encodeURIComponent(word)}&character=${encodeURIComponent(this._currentCharacter ?? "male")}&language=${encodeURIComponent(this.voxLang)}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[ITC v7] TTS fetch hata: ${response.status}`);
        this.isSpeaking = false;
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // AudioBufferSourceNode oluştur
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Pitch değiştirme: detune (cent cinsinden, 100 cent = 1 yarım ton)
      // pitch 1.0 = normal, 0.5 = 1 oktav aşağı, 2.0 = 1 oktav yukarı
      const semitones = Math.log2(pitch) * 12;
      source.detune.value = semitones * 100;

      // Rate değiştirme: playbackRate
      source.playbackRate.value = Math.max(0.25, Math.min(4.0, rate));

      // Ses karakteri filtresi — muffled/boğuk için lowpass, diğerleri bandpass
      const isMuffled = this._currentCharacter === "muffled_male" || this._currentCharacter === "muffled_female";
      const filter = ctx.createBiquadFilter();
      if (isMuffled) {
        // Boğuk: duvar/mezar arkasından geliyor hissi
        filter.type = "lowpass";
        filter.frequency.value = 420 + Math.random() * 80; // 420-500 Hz
        filter.Q.value = 0.3 + Math.random() * 0.2;
      } else {
        filter.type = "bandpass";
        filter.frequency.value = 800 + (pitch - 0.5) * 1000;
        filter.Q.value = 0.7;
      }

      // Gain (volume) — muffled'da hafif ekstra azalt
      const gainNode = ctx.createGain();
      const volumeMult = isMuffled ? 0.65 : 1.0;
      gainNode.gain.value = Math.max(0.0, Math.min(1.5, volume * volumeMult));

      // Bağlantı zinciri: source -> filter -> gain -> destination
      source.connect(filter);
      filter.connect(gainNode);
      
      // RadioEffects varsa masterGain'e bağla, yoksa doğrudan destination'a
      if (this.radioEffects) {
        gainNode.connect((this.radioEffects as any).masterGain || ctx.destination);
      } else {
        gainNode.connect(ctx.destination);
      }

      source.onended = () => {
        this.isSpeaking = false;
        try {
          source.disconnect();
          filter.disconnect();
          gainNode.disconnect();
        } catch { /* */ }
      };

      source.start();
    } catch (err) {
      console.warn("[ITC v7] Web ses çalma hatası:", err);
      this.isSpeaking = false;
    }
  }

  private getApiBaseUrl(): string {
    // Web'de hostname'den API base URL türet
    if (typeof window !== "undefined" && window.location) {
      const { protocol, hostname } = window.location;
      const apiHostname = hostname.replace(/^8081-/, "3000-");
      if (apiHostname !== hostname) {
        return `${protocol}//${apiHostname}`;
      }
    }
    return "http://127.0.0.1:3000";
  }

  private speakOnNative(word: string, pitch: number, rate: number, volume: number): void {
    try { Speech.stop(); } catch { /* */ }

    const trySpeak = (useTurkish: boolean) => {
      try {
        const opts: Speech.SpeechOptions = {
          pitch: Math.max(0.1, Math.min(2.0, pitch)),
          rate: Math.max(0.1, Math.min(2.0, rate)),
          volume: Math.max(0.0, Math.min(1.0, volume)),
          onDone: () => { this.isSpeaking = false; },
          onError: (err) => {
            console.warn("[ITC] Speech.speak onError:", err);
            if (useTurkish) {
              // Türkçe TTS bu cihazda çalışmıyor — dil kısıtı olmadan tekrar dene
              this.turkishTTSFailed = true;
              trySpeak(false);
            } else {
              this.isSpeaking = false;
            }
          },
          onStopped: () => { this.isSpeaking = false; },
        };
        if (useTurkish) {
          opts.language = this.voiceBcp47;
          if (this.nativeTurkishVoiceId) opts.voice = this.nativeTurkishVoiceId;
        }
        Speech.speak(word, opts);
      } catch (e) {
        console.warn("[ITC] speakOnNative hatası:", e);
        this.isSpeaking = false;
      }
    };

    // Türkçe TTS daha önce başarısız olduysa direkt varsayılan sesle devam et
    trySpeak(!this.turkishTTSFailed);
  }

  // ============================================================
  // ZAMANLAMA
  // ============================================================

  private getRandomDelay(): number {
    // GhostTube VOX tarzı: minimum 20sn, maximum 50sn rastgele bekleme
    // Her çağrıda yeniden hesaplanır — loop içinde sabit kalmaz
    const min = 20000;
    const max = 50000;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private scheduleNextWord(): void {
    if (!this.isActive) return;
    const delay = this.getRandomDelay();
    this.speakTimeout = setTimeout(() => {
      if (!this.isActive) return;
      try {
        const { word, character } = this.getRandomWord();
        this.speakWord(word, character);
      } catch (e) {
        console.warn("[ITC] scheduleNextWord hatası:", e);
      }
      this.scheduleNextWord();
    }, delay);
  }

  // ============================================================
  // ANA KONTROL
  // ============================================================

  async start(onWordSpoken?: (word: string, character: VoiceCharacter) => void): Promise<void> {
    if (this.isActive) return;
    this.isActive = true;
    this.onWordSpoken = onWordSpoken || null;

    try {
      // Türkçe ses motorunu bul
      await this.initTurkishVoice();
    } catch (e) {
      console.warn("[ITC] initTurkishVoice hatası:", e);
    }

    // Web Audio API efektleri başlat
    try {
      const ctx = this.getAudioContext();
      if (ctx) {
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        this.radioEffects = new RadioEffectsEngine(ctx);
        this.radioEffects.startWhiteNoise(this.settings.whiteNoiseMode, this.settings.whiteNoiseVolume);
        this.radioEffects.startCrackle(this.settings.distortionLevel * 0.5);
      }
    } catch (e) {
      console.warn("[ITC] Audio context hatası:", e);
    }

    // İlk kelime (20-50 saniye sonra - getRandomDelay ile tutarlı aralık)
    this.speakTimeout = setTimeout(() => {
      if (!this.isActive) return;
      try {
        const { word, character } = this.getRandomWord();
        this.speakWord(word, character);
        this.scheduleNextWord();
      } catch (e) {
        console.warn("[ITC] İlk kelime hatası:", e);
        this.scheduleNextWord();
      }
    }, this.getRandomDelay());

    // Phantom event scheduler (boğuk/fısıltı/nine/kız çocuk — bağımsız zamanlayıcı)
    // İlk phantom 60-120 saniye sonra, sonrakiler 100-300 saniye arası
    setTimeout(() => {
      if (this.isActive) this.schedulePhantomEvent();
    }, 60000 + Math.random() * 60000);
  }

  stop(): void {
    this.isActive = false;
    this.onWordSpoken = null;
    this.isSpeaking = false;

    // TTS durdur
    try {
      if (this.isWebPlatform && typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      Speech.stop();
    } catch { /* */ }

    if (this.speakTimeout) { clearTimeout(this.speakTimeout); this.speakTimeout = null; }
    if (this.phantomTimeout) { clearTimeout(this.phantomTimeout); this.phantomTimeout = null; }

    // Efektleri durdur
    this.radioEffects?.dispose();
    this.radioEffects = null;

    // Mikrofon durdur
    this.stopMicrophone();
  }

  // ============================================================
  // AYARLAR
  // ============================================================

  getSettings(): VoxSettings { return { ...this.settings }; }

  getTurkishTTSFailed(): boolean { return this.turkishTTSFailed; }

  setWhiteNoiseMode(mode: WhiteNoiseMode): void {
    this.settings.whiteNoiseMode = mode;
    if (this.radioEffects) {
      this.radioEffects.stopWhiteNoise();
      this.radioEffects.startWhiteNoise(mode, this.settings.whiteNoiseVolume);
    }
  }

  setWhiteNoiseVolume(volume: number): void {
    this.settings.whiteNoiseVolume = Math.max(0, Math.min(1, volume));
    this.radioEffects?.setWhiteNoiseVolume(this.settings.whiteNoiseVolume);
  }

  setReverbLevel(level: number): void {
    this.settings.reverbLevel = Math.max(0, Math.min(1, level));
    this.radioEffects?.setVoiceReverbLevel(this.settings.reverbLevel);
  }

  setEchoLevel(level: number): void {
    this.settings.echoLevel = Math.max(0, Math.min(1, level));
    this.radioEffects?.setVoiceEchoLevel(this.settings.echoLevel);
  }

  setDistortionLevel(level: number): void {
    this.settings.distortionLevel = Math.max(0, Math.min(1, level));
    this.radioEffects?.setVoiceDistortionLevel(this.settings.distortionLevel);
    // Crackle yoğunluğunu güncelle
    if (this.radioEffects) {
      this.radioEffects.stopCrackle();
      this.radioEffects.startCrackle(this.settings.distortionLevel * 0.5);
    }
  }

  setSensitivity(level: number): void {
    this.settings.sensitivity = Math.max(0, Math.min(1, level));
  }

  // Eski API uyumluluğu
  setWhiteNoiseEnabled(enabled: boolean): void {
    this.settings.whiteNoiseMode = enabled ? "slow" : "off";
    this.setWhiteNoiseMode(this.settings.whiteNoiseMode);
  }

  setEchoEnabled(enabled: boolean): void {
    this.settings.echoLevel = enabled ? 0.3 : 0;
  }

  setEchoVolume(volume: number): void {
    this.settings.echoLevel = Math.max(0, Math.min(1, volume));
  }

  // ============================================================
  // DURUM SORGULAMA
  // ============================================================

  getIsActive(): boolean { return this.isActive; }
  isMicrophoneActive(): boolean { return this.microphoneEnabled; }
  getCurrentAudioLevel(): number { return this.currentAudioLevel; }
  getPeakAudioLevel(): number { return this.peakAudioLevel; }
  isVoiceDetected(): boolean { return this.voiceDetected; }
  getMicrophoneStatus(): MicrophoneStatus { return this.micStatus; }

  getTurkishVoiceId(): string | null {
    return this.isWebPlatform ? (this.webTurkishVoice?.name || null) : this.nativeTurkishVoiceId;
  }

  isVoiceReady(): boolean { return this.voiceSearchDone; }

  getWebTurkishVoice(): SpeechSynthesisVoice | null { return this.webTurkishVoice; }

  static getTotalWordCount(): number { return ALL_WORDS.length; }
}

// Singleton
let itcEngine: ITCVoiceEngine | null = null;

export function getITCEngine(): ITCVoiceEngine {
  if (!itcEngine) itcEngine = new ITCVoiceEngine();
  return itcEngine;
}

export { ITCVoiceEngine, ALL_WORDS };
export type { VoxSettings as ITCSettings };
