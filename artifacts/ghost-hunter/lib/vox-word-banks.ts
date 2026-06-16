// VOX language resolver.
// Returns the active language's word pools used by the ITC voice engine.
// Turkish ("tr") is the default and maps to the original untouched word-bank.ts.

import * as TR from "./word-bank";
import * as EN from "./word-bank-en";
import * as DE from "./word-bank-de";

export type VoxLang = "tr" | "en" | "de";

export interface VoxWordBank {
  DARK_WORDS: string[];
  DARK_PHRASES: string[];
  SPIRIT_NAMES: string[];
  NUMBERS: string[];
  HISTORICAL_WORDS: string[];
  NATURE_WORDS: string[];
  EMOTION_WORDS: string[];
  BODY_WORDS: string[];
  PLACE_WORDS: string[];
  TIME_WORDS: string[];
  ACTION_WORDS: string[];
  LONG_PHRASES: string[];
  MANIPULATIVE_RESPONSES: string[];
  DIALOG_PHRASES: string[];
  WHISPER_PHRASES: string[];
  MYTHOLOGY_WORDS: string[];
  FOLK_BELIEFS: string[];
  HORROR_STORY_WORDS: string[];
  CURSES: string[];
  DREAM_WORDS: string[];
  RESEARCH_JARGON: string[];
  NINE_PHRASES: string[];
  GIRL_CHILD_PHRASES: string[];
  PHANTOM_PHRASES: string[];
  HOME_OBJECT_PHRASES: string[];
}

function bankFrom(m: typeof TR): VoxWordBank {
  return {
    DARK_WORDS: m.DARK_WORDS,
    DARK_PHRASES: m.DARK_PHRASES,
    SPIRIT_NAMES: m.SPIRIT_NAMES,
    NUMBERS: m.NUMBERS,
    HISTORICAL_WORDS: m.HISTORICAL_WORDS,
    NATURE_WORDS: m.NATURE_WORDS,
    EMOTION_WORDS: m.EMOTION_WORDS,
    BODY_WORDS: m.BODY_WORDS,
    PLACE_WORDS: m.PLACE_WORDS,
    TIME_WORDS: m.TIME_WORDS,
    ACTION_WORDS: m.ACTION_WORDS,
    LONG_PHRASES: m.LONG_PHRASES,
    MANIPULATIVE_RESPONSES: m.MANIPULATIVE_RESPONSES,
    DIALOG_PHRASES: m.DIALOG_PHRASES,
    WHISPER_PHRASES: m.WHISPER_PHRASES,
    MYTHOLOGY_WORDS: m.MYTHOLOGY_WORDS,
    FOLK_BELIEFS: m.FOLK_BELIEFS,
    HORROR_STORY_WORDS: m.HORROR_STORY_WORDS,
    CURSES: m.CURSES,
    DREAM_WORDS: m.DREAM_WORDS,
    RESEARCH_JARGON: m.RESEARCH_JARGON,
    NINE_PHRASES: m.NINE_PHRASES,
    GIRL_CHILD_PHRASES: m.GIRL_CHILD_PHRASES,
    PHANTOM_PHRASES: m.PHANTOM_PHRASES,
    HOME_OBJECT_PHRASES: m.HOME_OBJECT_PHRASES,
  };
}

const BANKS: Record<VoxLang, VoxWordBank> = {
  tr: bankFrom(TR),
  en: bankFrom(EN),
  de: bankFrom(DE),
};

// BCP-47 tags for native TTS / voice lookup per VOX language.
export const VOX_BCP47: Record<VoxLang, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
};

export function getVoxWordBank(lang: VoxLang = "tr"): VoxWordBank {
  return BANKS[lang] ?? BANKS.tr;
}
