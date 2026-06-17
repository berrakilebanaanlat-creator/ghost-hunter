import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import app from "../app";
import { coerceLanguage, buildCacheKey, GOOGLE_TL } from "./tts";

// ---------------------------------------------------------------------------
// Unit tests — pure helpers
// ---------------------------------------------------------------------------

describe("coerceLanguage", () => {
  it("passes through recognised language codes", () => {
    expect(coerceLanguage("tr")).toBe("tr");
    expect(coerceLanguage("en")).toBe("en");
    expect(coerceLanguage("de")).toBe("de");
  });

  it("defaults to tr when no language is supplied", () => {
    expect(coerceLanguage(undefined)).toBe("tr");
  });

  it("defaults to tr for an unrecognised language code", () => {
    expect(coerceLanguage("zh")).toBe("tr");
    expect(coerceLanguage("fr")).toBe("tr");
    expect(coerceLanguage("")).toBe("tr");
  });
});

describe("buildCacheKey — cross-language uniqueness", () => {
  const VOICE = "gtts";
  const TEXT  = "hayalet";

  it("produces distinct keys for every supported language", () => {
    const keys = Object.keys(GOOGLE_TL).map((lang) =>
      buildCacheKey(VOICE, lang, TEXT)
    );
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("tr and en keys differ for the same text", () => {
    expect(buildCacheKey(VOICE, "tr", TEXT)).not.toBe(
      buildCacheKey(VOICE, "en", TEXT)
    );
  });

  it("tr and de keys differ for the same text", () => {
    expect(buildCacheKey(VOICE, "tr", TEXT)).not.toBe(
      buildCacheKey(VOICE, "de", TEXT)
    );
  });

  it("en and de keys differ for the same text", () => {
    expect(buildCacheKey(VOICE, "en", TEXT)).not.toBe(
      buildCacheKey(VOICE, "de", TEXT)
    );
  });

  it("same text + same language always produces the same key (cache hit)", () => {
    expect(buildCacheKey(VOICE, "tr", TEXT)).toBe(
      buildCacheKey(VOICE, "tr", TEXT)
    );
  });
});

// ---------------------------------------------------------------------------
// Integration tests — route returns language-specific audio
//
// fetch is stubbed so each language code maps to a unique byte payload.
// No real network calls are made.
// ---------------------------------------------------------------------------

function makeFakeAudio(tag: string): Buffer {
  // 200-byte buffer whose content is derived from the language tag.
  // This simulates distinct TTS audio per language.
  const seed = tag.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return Buffer.alloc(200, seed % 256);
}

function stubFetch(): void {
  vi.stubGlobal(
    "fetch",
    async (url: string | URL): Promise<Response> => {
      const urlStr = url.toString();
      // Extract the tl= query param used by fetchGoogleTTS
      const match = urlStr.match(/[?&]tl=([^&]+)/);
      const tl = match ? decodeURIComponent(match[1]) : "tr";
      const fakeAudio = makeFakeAudio(tl);
      return {
        ok: true,
        arrayBuffer: async () =>
          fakeAudio.buffer.slice(
            fakeAudio.byteOffset,
            fakeAudio.byteOffset + fakeAudio.byteLength
          ) as ArrayBuffer,
      } as Response;
    }
  );
}

describe("GET /api/tts — per-language audio isolation", () => {
  beforeEach(() => {
    // Remove any ElevenLabs key so the Google TTS path is always used,
    // making the stub predictable in every environment.
    delete process.env["ELEVENLABS_API_KEY"];
    stubFetch();
  });

  // -------------------------------------------------------------------------
  // Cross-language collision tests — SAME text, different languages.
  // These are the core regression cases: if language were accidentally dropped
  // from the cache key, all three requests would return identical audio.
  // -------------------------------------------------------------------------

  it("same text in tr and en produces different audio", async () => {
    const text = "hayalet-cross-tr-en";
    const resTr = await supertest(app).get(
      `/api/tts?text=${encodeURIComponent(text)}&language=tr`
    );
    const resEn = await supertest(app).get(
      `/api/tts?text=${encodeURIComponent(text)}&language=en`
    );
    expect(resTr.status).toBe(200);
    expect(resEn.status).toBe(200);
    expect(Buffer.from(resTr.body).equals(Buffer.from(resEn.body))).toBe(false);
  });

  it("same text in tr and de produces different audio", async () => {
    const text = "hayalet-cross-tr-de";
    const resTr = await supertest(app).get(
      `/api/tts?text=${encodeURIComponent(text)}&language=tr`
    );
    const resDe = await supertest(app).get(
      `/api/tts?text=${encodeURIComponent(text)}&language=de`
    );
    expect(resTr.status).toBe(200);
    expect(resDe.status).toBe(200);
    expect(Buffer.from(resTr.body).equals(Buffer.from(resDe.body))).toBe(false);
  });

  it("same text in en and de produces different audio", async () => {
    const text = "hayalet-cross-en-de";
    const resEn = await supertest(app).get(
      `/api/tts?text=${encodeURIComponent(text)}&language=en`
    );
    const resDe = await supertest(app).get(
      `/api/tts?text=${encodeURIComponent(text)}&language=de`
    );
    expect(resEn.status).toBe(200);
    expect(resDe.status).toBe(200);
    expect(Buffer.from(resEn.body).equals(Buffer.from(resDe.body))).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Per-language cache-hit test — same text AND same language should always
  // return byte-identical audio (served from cache on the second call).
  // -------------------------------------------------------------------------

  it("repeated request for same text + language returns identical audio (cache hit)", async () => {
    const text = "hayalet-cache-hit";
    const res1 = await supertest(app).get(
      `/api/tts?text=${encodeURIComponent(text)}&language=tr`
    );
    const res2 = await supertest(app).get(
      `/api/tts?text=${encodeURIComponent(text)}&language=tr`
    );
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(Buffer.from(res1.body).equals(Buffer.from(res2.body))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Default language tests — omitted or unknown language should behave as tr.
  // -------------------------------------------------------------------------

  it("omitting language defaults to tr (same audio as explicit language=tr)", async () => {
    // First call with no language param populates the tr cache entry.
    const text = "hayalet-default-lang";
    const resDefault = await supertest(app).get(
      `/api/tts?text=${encodeURIComponent(text)}`
    );
    // Second call with language=tr hits the cache entry created above.
    const resTr = await supertest(app).get(
      `/api/tts?text=${encodeURIComponent(text)}&language=tr`
    );
    expect(resDefault.status).toBe(200);
    expect(resTr.status).toBe(200);
    expect(Buffer.from(resDefault.body).equals(Buffer.from(resTr.body))).toBe(
      true
    );
  });

  it("unknown language param defaults to tr (same audio as explicit language=tr)", async () => {
    const text = "hayalet-unknown-lang";
    const resUnknown = await supertest(app).get(
      `/api/tts?text=${encodeURIComponent(text)}&language=xx`
    );
    const resTr = await supertest(app).get(
      `/api/tts?text=${encodeURIComponent(text)}&language=tr`
    );
    expect(resUnknown.status).toBe(200);
    expect(resTr.status).toBe(200);
    expect(Buffer.from(resUnknown.body).equals(Buffer.from(resTr.body))).toBe(
      true
    );
  });

  it("returns 400 when text param is missing", async () => {
    const res = await supertest(app).get("/api/tts?language=tr");
    expect(res.status).toBe(400);
  });
});
