import { Router } from "express";

const router = Router();

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

const cache = new Map<string, Buffer>();
const MAX_CACHE = 400;

router.get("/tts", async (req, res) => {
  const text = req.query["text"] as string | undefined;
  const character = (req.query["character"] as string | undefined) ?? "male";

  if (!text || text.trim().length === 0) {
    res.status(400).json({ error: "text gerekli" });
    return;
  }

  const apiKey = process.env["ELEVENLABS_API_KEY"];
  if (!apiKey) {
    res.status(503).json({ error: "ELEVENLABS_API_KEY eksik" });
    return;
  }

  const voiceId = VOICE_MAP[character] ?? DEFAULT_VOICE;
  const cacheKey = `${voiceId}:${text.trim()}`;

  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey)!;
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(cached);
    return;
  }

  try {
    const elRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.25,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elRes.ok) {
      const errText = await elRes.text();
      req.log.warn({ status: elRes.status, errText }, "ElevenLabs TTS hatası");
      res.status(502).json({ error: "ElevenLabs API hatası", status: elRes.status });
      return;
    }

    const arrayBuffer = await elRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (cache.size >= MAX_CACHE) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    cache.set(cacheKey, buffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch (err) {
    req.log.error({ err }, "TTS fetch hatası");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router;
