/**
 * Word Bank Test Suite
 * Kelime bankasının bütünlüğünü ve doğruluğunu test eder
 */
import { describe, it, expect } from "vitest";
import {
  PHONEMES,
  DARK_WORDS,
  DARK_PHRASES,
  SPIRIT_NAMES,
  NUMBERS,
  HISTORICAL_WORDS,
  NATURE_WORDS,
  EMOTION_WORDS,
  BODY_WORDS,
  PLACE_WORDS,
  TIME_WORDS,
  ACTION_WORDS,
  RELIGIOUS_WORDS,
  PARANORMAL_TERMS,
  OBJECT_WORDS,
  ADJECTIVE_WORDS,
  MANIPULATIVE_RESPONSES,
  LONG_PHRASES,
  MYTHOLOGY_WORDS,
  FOLK_BELIEFS,
  HORROR_STORY_WORDS,
  DIALOG_PHRASES,
  PROVERBS,
  COLOR_LIGHT_WORDS,
  WEATHER_WORDS,
  SOUND_WORDS,
  QUANTITY_WORDS,
  COMMUNICATION_WORDS,
  RELATIONSHIP_WORDS,
  WHISPER_PHRASES,
  DETAILED_PLACES,
  DETAILED_TIME,
  CURSES,
  DREAM_WORDS,
  RESEARCH_JARGON,
  ALL_WORDS,
  WORD_CATEGORIES,
} from "../word-bank";

describe("Word Bank - Kelime Bankası", () => {
  it("toplam kelime sayısı 3000'den fazla olmalı", () => {
    expect(ALL_WORDS.length).toBeGreaterThan(3000);
  });

  it("WORD_CATEGORIES.total ALL_WORDS.length ile eşleşmeli", () => {
    expect(WORD_CATEGORIES.total).toBe(ALL_WORDS.length);
  });

  it("tüm kategoriler en az 10 kelime içermeli", () => {
    const categories = [
      { name: "PHONEMES", arr: PHONEMES },
      { name: "DARK_WORDS", arr: DARK_WORDS },
      { name: "DARK_PHRASES", arr: DARK_PHRASES },
      { name: "SPIRIT_NAMES", arr: SPIRIT_NAMES },
      { name: "NUMBERS", arr: NUMBERS },
      { name: "HISTORICAL_WORDS", arr: HISTORICAL_WORDS },
      { name: "NATURE_WORDS", arr: NATURE_WORDS },
      { name: "EMOTION_WORDS", arr: EMOTION_WORDS },
      { name: "BODY_WORDS", arr: BODY_WORDS },
      { name: "PLACE_WORDS", arr: PLACE_WORDS },
      { name: "TIME_WORDS", arr: TIME_WORDS },
      { name: "ACTION_WORDS", arr: ACTION_WORDS },
      { name: "RELIGIOUS_WORDS", arr: RELIGIOUS_WORDS },
      { name: "PARANORMAL_TERMS", arr: PARANORMAL_TERMS },
      { name: "OBJECT_WORDS", arr: OBJECT_WORDS },
      { name: "ADJECTIVE_WORDS", arr: ADJECTIVE_WORDS },
      { name: "MANIPULATIVE_RESPONSES", arr: MANIPULATIVE_RESPONSES },
      { name: "LONG_PHRASES", arr: LONG_PHRASES },
      { name: "MYTHOLOGY_WORDS", arr: MYTHOLOGY_WORDS },
      { name: "FOLK_BELIEFS", arr: FOLK_BELIEFS },
      { name: "HORROR_STORY_WORDS", arr: HORROR_STORY_WORDS },
      { name: "DIALOG_PHRASES", arr: DIALOG_PHRASES },
      { name: "PROVERBS", arr: PROVERBS },
      { name: "COLOR_LIGHT_WORDS", arr: COLOR_LIGHT_WORDS },
      { name: "WEATHER_WORDS", arr: WEATHER_WORDS },
      { name: "SOUND_WORDS", arr: SOUND_WORDS },
      { name: "QUANTITY_WORDS", arr: QUANTITY_WORDS },
      { name: "COMMUNICATION_WORDS", arr: COMMUNICATION_WORDS },
      { name: "RELATIONSHIP_WORDS", arr: RELATIONSHIP_WORDS },
      { name: "WHISPER_PHRASES", arr: WHISPER_PHRASES },
      { name: "DETAILED_PLACES", arr: DETAILED_PLACES },
      { name: "DETAILED_TIME", arr: DETAILED_TIME },
      { name: "CURSES", arr: CURSES },
      { name: "DREAM_WORDS", arr: DREAM_WORDS },
      { name: "RESEARCH_JARGON", arr: RESEARCH_JARGON },
    ];

    for (const cat of categories) {
      expect(cat.arr.length, `${cat.name} en az 10 kelime içermeli`).toBeGreaterThanOrEqual(10);
    }
  });

  it("tüm kelimeler string tipinde olmalı", () => {
    for (const word of ALL_WORDS) {
      expect(typeof word).toBe("string");
    }
  });

  it("hiçbir kelime boş olmamalı", () => {
    for (const word of ALL_WORDS) {
      expect(word.trim().length).toBeGreaterThan(0);
    }
  });

  it("en az 28 farklı kategori olmalı", () => {
    const categoryCount = Object.keys(WORD_CATEGORIES).length - 1; // total hariç
    expect(categoryCount).toBeGreaterThanOrEqual(28);
  });

  it("Türk mitolojisi kelimeleri içermeli", () => {
    expect(MYTHOLOGY_WORDS).toContain("karabasan");
    expect(MYTHOLOGY_WORDS).toContain("gulyabani");
    expect(MYTHOLOGY_WORDS).toContain("şahmeran");
  });

  it("halk inanışları kelimeleri içermeli", () => {
    expect(FOLK_BELIEFS).toContain("nazar boncuğu");
    expect(FOLK_BELIEFS).toContain("kurşun dökme");
    expect(FOLK_BELIEFS).toContain("ruh çağırma");
  });

  it("ürkütücü uzun cümleler içermeli", () => {
    expect(LONG_PHRASES.some(p => p.length > 20)).toBe(true);
    expect(LONG_PHRASES.length).toBeGreaterThan(50);
  });

  it("manipülatif cevaplar evet/hayır içermeli", () => {
    expect(MANIPULATIVE_RESPONSES).toContain("evet");
    expect(MANIPULATIVE_RESPONSES).toContain("hayır");
    expect(MANIPULATIVE_RESPONSES).toContain("belki");
  });

  it("ruh isimleri Türk isimleri içermeli", () => {
    expect(SPIRIT_NAMES).toContain("Ahmet");
    expect(SPIRIT_NAMES).toContain("Fatma");
    expect(SPIRIT_NAMES).toContain("Zeynep");
  });

  it("beddualar ve lanetler içermeli", () => {
    expect(CURSES.length).toBeGreaterThan(20);
    expect(CURSES).toContain("lanet olsun");
  });

  it("rüya kelimeleri içermeli", () => {
    expect(DREAM_WORDS).toContain("kabus");
    expect(DREAM_WORDS).toContain("uyku felci");
  });

  it("paranormal araştırma jargonu içermeli", () => {
    expect(RESEARCH_JARGON).toContain("SLS tarama");
    expect(RESEARCH_JARGON).toContain("EMF okuma");
    expect(RESEARCH_JARGON).toContain("EVP kaydı");
  });
});
