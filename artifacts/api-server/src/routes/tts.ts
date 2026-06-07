import { Router } from "express";

const router = Router();

// ElevenLabs ses karakteri → voice ID eşleştirmesi
const VOICE_MAP: Record<string, string> = {
  male:           "yoZ06aMxZJJ28mfd3POQ",
  deep_male:      "pNInz6obpgDQGcFmaJgB",
  old_male:       "VR6AewLTigWG4xSOukaG",
  whisper_male:   "N2lVS1w4EtoT3dr4eOWO",
  female:         "21m00Tcm4TlvDq8ikWAM",
  old_female:     "AZnzlk1XvdvUeBnXmlld",
  whisper_female: "EXAVITQu4vr4xnSDxMaL",
  child:          "MF3mGyEYCl7XYWbV9V6O",
  creepy_child:   "MF3mGyEYCl7XYWbV9V6O",
};

const DEFAULT_VOICE = "N2lVS1w4EtoT3dr4eOWO";

// Önbellek (ElevenLabs + Google TTS yanıtları)
const cache = new Map<string, Buffer>();
const MAX_CACHE = 400;

function addToCache(key: string, buf: Buffer): void {
  if (cache.size >= MAX_CACHE) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, buf);
}

async function fetchElevenLabs(text: string, voiceId: string, apiKey: string): Promise<Buffer | null> {
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.25,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function fetchGoogleTTS(text: string): Promise<Buffer | null> {
  try {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=tr&client=tw-ob&ttsspeed=0.6`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) return null;
    return buf;
  } catch {
    return null;
  }
}

router.get("/tts", async (req, res) => {
  const text = (req.query["text"] as string | undefined)?.trim();
  const character = (req.query["character"] as string | undefined) ?? "male";

  if (!text) {
    res.status(400).json({ error: "text gerekli" });
    return;
  }

  const apiKey = process.env["ELEVENLABS_API_KEY"];
  const voiceId = VOICE_MAP[character] ?? DEFAULT_VOICE;
  const cacheKey = `${apiKey ? voiceId : "gtts"}:${text}`;

  // Önbellekten döndür
  if (cache.has(cacheKey)) {
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(cache.get(cacheKey)!);
    return;
  }

  let buffer: Buffer | null = null;
  let source = "none";

  // 1. ElevenLabs dene (key varsa)
  if (apiKey) {
    buffer = await fetchElevenLabs(text, voiceId, apiKey);
    if (buffer) source = "elevenlabs";
  }

  // 2. Yedek: Google Translate TTS
  if (!buffer) {
    buffer = await fetchGoogleTTS(text);
    if (buffer) source = "google";
  }

  if (!buffer) {
    req.log.warn({ text, character }, "TTS tüm kaynaklar başarısız");
    res.status(502).json({ error: "Ses üretilemedi" });
    return;
  }

  req.log.info({ source, chars: text.length, character }, "TTS üretildi");
  addToCache(cacheKey, buffer);

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("X-TTS-Source", source);
  res.send(buffer);
});

export default router;
