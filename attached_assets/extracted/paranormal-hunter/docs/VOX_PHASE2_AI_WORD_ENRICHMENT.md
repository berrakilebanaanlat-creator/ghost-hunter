# VOX Kelime Dağarcığı Dinamik Geliştirme — 2. Aşama
## AI Destekli Kelime Zenginleştirme (Contextual & Dynamic Word Generation)

**Versiyon:** 1.0  
**Tarih:** 11 Mayıs 2026  
**Durum:** Implementation Ready  
**Kredi Maliyeti:** 4,300 kredi/ay  
**Başarı Oranı:** %70-80%

---

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Mimarı & Akış](#mimarı--akış)
3. [Backend Implementasyonu](#backend-implementasyonu)
4. [Frontend Entegrasyonu](#frontend-entegrasyonu)
5. [Database Şeması](#database-şeması)
6. [LLM Prompt Engineering](#llm-prompt-engineering)
7. [API Endpoints](#api-endpoints)

---

## Genel Bakış

### Amaç

VOX Spirit Box'ın kelime dağarcığını **bağlamsal olarak zenginleştirmek** ve **dinamik olarak genişletmek** için AI kullanarak:
- Oturum bağlamına uygun kelimeler üretme
- Kullanıcı sorusu ve önceki kelimelerden yeni kelimeler çıkarma
- Paranormal araştırma bağlamında uygun kelimeleri seçme
- Sistem öğrenmesi ile kaliteyi zaman içinde iyileştirme

### Temel Özellikler

| Özellik | Açıklama | Kredi Maliyeti |
|---------|----------|----------------|
| **Bağlamsal Kelime Üretimi** | Lokasyon, zaman, önceki kelimeler → yeni kelimeler | 0.5 kredi/çağrı |
| **Soru Analizi** | Kullanıcı sorusu → ilgili kelimeler | 0.4 kredi/çağrı |
| **Kategori Zenginleştirmesi** | Bir kelimeden benzer kelimeleri üret | 0.3 kredi/çağrı |
| **Paranormal Uygunluk Filtresi** | Kelimeleri paranormal bağlamda değerlendir | 0.2 kredi/çağrı |
| **Trend Analizi** | Popüler kelimeleri tespit et | 0.1 kredi/çağrı |

### Başarı Metrikleri

```
Başarı Oranı Tanımı:
- Kelime Uygunluğu: %75+ (paranormal bağlamda uygun)
- Kullanıcı Memnuniyeti: %70+ (feedback)
- Sistem Kalitesi: %80+ (duplikat, hata oranı)
- Kredi Verimlilik: <1.2 kredi/kelime
```

---

## Mimarı & Akış

### Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                    VOX FRONTEND (React Native)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ VOX Screen (vox.tsx)                                 │   │
│  │ - Oturum başlat/durdur                               │   │
│  │ - Bağlam bilgisi topla (lokasyon, zaman)             │   │
│  │ - Kullanıcı sorusu kaydet                            │   │
│  │ - Kelime feedback (👍👎)                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ VOX Motor (itc-voice-engine.ts)                      │   │
│  │ - Dinamik kelimeleri yükle                           │   │
│  │ - Bağlamsal kelimeleri buffer'a ekle                 │   │
│  │ - Kelime seçim algoritması                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓ tRPC
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/tRPC)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ VOX Router (server/routers.ts)                       │   │
│  │ - generateContextualWords()                          │   │
│  │ - analyzeUserQuestion()                              │   │
│  │ - enrichWordCategory()                               │   │
│  │ - filterParanormalWords()                            │   │
│  │ - getTrendingWords()                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ LLM Service (server/_core/llm.ts)                    │   │
│  │ - invokeLLM() with custom prompts                    │   │
│  │ - Structured JSON responses                          │   │
│  │ - Error handling & retries                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Database (PostgreSQL + Drizzle ORM)                  │   │
│  │ - dynamic_words                                      │   │
│  │ - contextual_word_cache                              │   │
│  │ - word_usage_stats                                   │   │
│  │ - vox_sessions                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Veri Akışı (Oturum Sırasında)

```
1. OTURUM BAŞLADI
   ├─ Lokasyon: "Mezarlık"
   ├─ Zaman: "Gece"
   ├─ Kullanıcı Sorusu: "Adın ne?"
   └─ Önceki Kelimeler: ["ölüm", "ruh", "lanet"]

2. BACKEND'E İSTEK
   └─ generateContextualWords({
       context: { location: "mezarlık", time: "night" },
       previousWords: ["ölüm", "ruh", "lanet"],
       userQuestion: "Adın ne?"
     })

3. LLM ÇAĞRISI
   ├─ System Prompt: Paranormal araştırma bağlamı
   ├─ User Prompt: Bağlam + önceki kelimeler + soru
   └─ Response Format: JSON (words[], confidence, reasoning)

4. YANIT İŞLEME
   ├─ Paranormal uygunluk filtresi
   ├─ Duplikat kontrol
   ├─ Confidence skoru kontrol
   └─ Database'e kaydet

5. FRONTEND'E GÖNDER
   └─ Yeni kelimeler VOX buffer'ına eklenir

6. VOX ÇALAR
   └─ Kelimeleri sırasıyla seslendir
```

---

## Backend Implementasyonu

### 1. Database Şeması

```sql
-- Dinamik kelimeler (AI tarafından üretilen)
CREATE TABLE dynamic_words (
  id SERIAL PRIMARY KEY,
  word VARCHAR(100) NOT NULL UNIQUE,
  source VARCHAR(50) NOT NULL, -- 'contextual', 'question_analysis', 'category_enrichment'
  category VARCHAR(50), -- 'dark', 'emotion', 'place', 'action', etc.
  confidence FLOAT DEFAULT 0.75, -- 0-1 (LLM confidence)
  paranormal_score FLOAT DEFAULT 0.8, -- 0-1 (paranormal uygunluğu)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  first_used_at TIMESTAMP,
  usage_count INT DEFAULT 0,
  positive_feedback INT DEFAULT 0,
  negative_feedback INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by_llm_model VARCHAR(50) -- 'gpt-4', 'claude-3', etc.
);

-- Bağlamsal kelime cache (performans için)
CREATE TABLE contextual_word_cache (
  id SERIAL PRIMARY KEY,
  context_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA256(location+time+previousWords)
  context_data JSONB, -- { location, time, previousWords, userQuestion }
  generated_words JSONB, -- { words[], confidence, reasoning }
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- 24 saat sonra expire
  hit_count INT DEFAULT 0,
  INDEX idx_context_hash (context_hash),
  INDEX idx_expires_at (expires_at)
);

-- Kelime kullanım istatistikleri
CREATE TABLE word_usage_stats (
  id SERIAL PRIMARY KEY,
  word_id INT REFERENCES dynamic_words(id),
  session_id INT,
  spoken_at TIMESTAMP,
  user_feedback ENUM('like', 'dislike', 'neutral') DEFAULT 'neutral',
  context JSONB, -- { location, time, userQuestion }
  INDEX idx_word_id (word_id),
  INDEX idx_session_id (session_id)
);

-- VOX oturum metadatası
CREATE TABLE vox_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT,
  location VARCHAR(100),
  time_of_day ENUM('morning', 'afternoon', 'evening', 'night'),
  user_questions JSONB, -- [{ question, timestamp }]
  words_spoken JSONB, -- [{ word, character, timestamp }]
  feedback_given JSONB, -- [{ word, feedback, timestamp }]
  total_words_count INT,
  session_duration INT, -- saniye
  ai_words_count INT, -- AI tarafından üretilen kelime sayısı
  ai_words_liked INT, -- Beğenilen AI kelimeleri
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_started_at (started_at)
);
```

### 2. tRPC Router Implementasyonu

```typescript
// server/routers.ts
import { router, publicProcedure } from "@/server/_core/trpc";
import { z } from "zod";
import { invokeLLM } from "@/server/_core/llm";
import { db } from "@/server/db";

export const voxRouter = router({
  // 1. Bağlamsal Kelime Üretimi
  generateContextualWords: publicProcedure
    .input(
      z.object({
        context: z.object({
          location: z.string().optional(),
          timeOfDay: z.enum(["morning", "afternoon", "evening", "night"]),
          previousWords: z.array(z.string()),
        }),
        userQuestion: z.string().optional(),
        count: z.number().default(5).max(10),
      })
    )
    .query(async ({ input }) => {
      const { context, userQuestion, count } = input;

      // 1. Cache'i kontrol et
      const cacheKey = generateContextHash(context);
      const cached = await db.query.contextualWordCache.findFirst({
        where: (table, { eq, gt }) => [
          eq(table.contextHash, cacheKey),
          gt(table.expiresAt, new Date()),
        ],
      });

      if (cached) {
        console.log("[VOX] Cache hit for context:", cacheKey);
        return JSON.parse(cached.generatedWords);
      }

      // 2. LLM'i çağır
      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(context, userQuestion, count);

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "contextual_words",
            strict: true,
            schema: {
              type: "object",
              properties: {
                words: {
                  type: "array",
                  items: { type: "string" },
                  description: "Generated paranormal words",
                },
                confidence: {
                  type: "number",
                  description: "Overall confidence (0-1)",
                },
                reasoning: {
                  type: "string",
                  description: "Why these words were chosen",
                },
                categories: {
                  type: "array",
                  items: { type: "string" },
                  description: "Word categories",
                },
              },
              required: ["words", "confidence", "reasoning", "categories"],
            },
          },
        },
      });

      const result = JSON.parse(response.choices[0].message.content);

      // 3. Kelime uygunluğunu filtrele
      const filteredWords = await filterParanormalWords(result.words);

      // 4. Cache'e kaydet
      await db.insert(contextualWordCache).values({
        contextHash: cacheKey,
        contextData: context,
        generatedWords: JSON.stringify({
          words: filteredWords,
          confidence: result.confidence,
          reasoning: result.reasoning,
          categories: result.categories,
        }),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 saat
      });

      // 5. Yeni kelimeleri database'e kaydet
      for (const word of filteredWords) {
        await saveDynamicWord({
          word,
          source: "contextual",
          confidence: result.confidence,
          category: result.categories[0] || "unknown",
        });
      }

      return {
        words: filteredWords,
        confidence: result.confidence,
        reasoning: result.reasoning,
        source: "ai_contextual",
      };
    }),

  // 2. Kullanıcı Sorusu Analizi
  analyzeUserQuestion: publicProcedure
    .input(
      z.object({
        question: z.string(),
        previousWords: z.array(z.string()).optional(),
        context: z.object({
          location: z.string().optional(),
          timeOfDay: z.enum(["morning", "afternoon", "evening", "night"]),
        }),
      })
    )
    .query(async ({ input }) => {
      const { question, previousWords = [], context } = input;

      const systemPrompt = `
        You are a paranormal research assistant analyzing user questions.
        Extract relevant paranormal keywords and suggest related words.
        Focus on: names, emotions, locations, actions, supernatural entities.
      `;

      const userPrompt = `
        User Question: "${question}"
        Previous Words Spoken: ${previousWords.join(", ")}
        Location: ${context.location || "unknown"}
        Time: ${context.timeOfDay}

        Extract 3-5 paranormal keywords from the question and suggest related words.
        Return JSON with: keywords, relatedWords, confidence, reasoning
      `;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "question_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                keywords: {
                  type: "array",
                  items: { type: "string" },
                },
                relatedWords: {
                  type: "array",
                  items: { type: "string" },
                },
                confidence: { type: "number" },
                reasoning: { type: "string" },
              },
              required: ["keywords", "relatedWords", "confidence", "reasoning"],
            },
          },
        },
      });

      const result = JSON.parse(response.choices[0].message.content);
      const filteredWords = await filterParanormalWords(result.relatedWords);

      return {
        keywords: result.keywords,
        suggestedWords: filteredWords,
        confidence: result.confidence,
        reasoning: result.reasoning,
      };
    }),

  // 3. Kategori Zenginleştirmesi
  enrichWordCategory: publicProcedure
    .input(
      z.object({
        word: z.string(),
        category: z.string(),
        count: z.number().default(5).max(10),
      })
    )
    .query(async ({ input }) => {
      const { word, category, count } = input;

      const systemPrompt = `
        You are a paranormal vocabulary expert.
        Given a word and category, generate similar paranormal words.
        Maintain thematic consistency and paranormal relevance.
      `;

      const userPrompt = `
        Base Word: "${word}"
        Category: "${category}"
        Generate ${count} similar paranormal words in the same category.
        Return JSON with: words, category, confidence, reasoning
      `;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "category_enrichment",
            strict: true,
            schema: {
              type: "object",
              properties: {
                words: {
                  type: "array",
                  items: { type: "string" },
                },
                category: { type: "string" },
                confidence: { type: "number" },
                reasoning: { type: "string" },
              },
              required: ["words", "category", "confidence", "reasoning"],
            },
          },
        },
      });

      const result = JSON.parse(response.choices[0].message.content);
      const filteredWords = await filterParanormalWords(result.words);

      return {
        baseWord: word,
        enrichedWords: filteredWords,
        category: result.category,
        confidence: result.confidence,
      };
    }),

  // 4. Paranormal Uygunluk Filtresi
  filterParanormalWords: publicProcedure
    .input(
      z.object({
        words: z.array(z.string()),
        context: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { words, context = "paranormal research" } = input;

      const systemPrompt = `
        You are a paranormal vocabulary quality control expert.
        Evaluate words for paranormal context relevance.
        Score each word: 0-1 (0=not paranormal, 1=highly paranormal)
      `;

      const userPrompt = `
        Context: "${context}"
        Words to evaluate: ${words.join(", ")}

        For each word, provide:
        - paranormal_score: 0-1
        - reasoning: why this score
        - should_include: boolean

        Return JSON array with evaluations.
      `;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      // Parse ve filtrele
      const evaluations = JSON.parse(response.choices[0].message.content);
      const filtered = words.filter((word, idx) => {
        const eval = evaluations[idx];
        return eval.paranormal_score >= 0.6 && eval.should_include;
      });

      return {
        originalCount: words.length,
        filteredCount: filtered.length,
        filteredWords: filtered,
        evaluations,
      };
    }),

  // 5. Trend Kelimeleri
  getTrendingWords: publicProcedure
    .input(
      z.object({
        timeRange: z.enum(["day", "week", "month"]).default("week"),
        limit: z.number().default(10).max(50),
      })
    )
    .query(async ({ input }) => {
      const { timeRange, limit } = input;

      const days = {
        day: 1,
        week: 7,
        month: 30,
      }[timeRange];

      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const trending = await db.query.wordUsageStats.findMany({
        where: (table, { gte, eq }) => [
          gte(table.spokenAt, cutoffDate),
          eq(table.userFeedback, "like"),
        ],
        orderBy: (table) => [desc(table.id)],
        limit,
      });

      return {
        timeRange,
        words: trending,
        count: trending.length,
      };
    }),
});
```

---

## Frontend Entegrasyonu

### VOX Screen Güncellemeleri

```typescript
// app/(tabs)/vox.tsx (Güncellenmiş Bölümler)

import { trpc } from "@/lib/trpc";

export default function VoxScreen() {
  const [sessionContext, setSessionContext] = useState({
    location: "unknown",
    timeOfDay: "night" as const,
    previousWords: [] as string[],
  });

  const [userQuestion, setUserQuestion] = useState("");
  const [contextualWords, setContextualWords] = useState<string[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Bağlamsal kelimeler yükle
  const loadContextualWords = async () => {
    if (!isActive) return;

    setIsLoadingAI(true);
    try {
      const result = await trpc.vox.generateContextualWords.query({
        context: sessionContext,
        userQuestion,
        count: 5,
      });

      setContextualWords(result.words);

      // VOX motoruna ekle
      const engine = getITCEngine();
      result.words.forEach((word) => {
        engine.addWordToBuffer(word);
      });
    } catch (error) {
      console.error("[VOX] AI kelime yükleme hatası:", error);
      // Fallback: Statik kelimeler kullan
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Kullanıcı sorusu analiz et
  const analyzeQuestion = async () => {
    if (!userQuestion) return;

    try {
      const result = await trpc.vox.analyzeUserQuestion.query({
        question: userQuestion,
        previousWords: wordLog.map((w) => w.word),
        context: sessionContext,
      });

      setContextualWords((prev) => [...prev, ...result.suggestedWords]);

      // VOX motoruna ekle
      const engine = getITCEngine();
      result.suggestedWords.forEach((word) => {
        engine.addWordToBuffer(word);
      });
    } catch (error) {
      console.error("[VOX] Soru analizi hatası:", error);
    }
  };

  // Oturum başladığında bağlamsal kelimeleri yükle
  useEffect(() => {
    if (isActive) {
      // 30 saniye sonra yeni bağlamsal kelimeler yükle
      const timer = setInterval(() => {
        loadContextualWords();
      }, 30000);

      return () => clearInterval(timer);
    }
  }, [isActive, sessionContext, userQuestion]);

  return (
    <ScreenContainer containerClassName="bg-[#060609]">
      {/* ... Mevcut VOX UI ... */}

      {/* Yeni: AI Kelime Yükleme Göstergesi */}
      {isLoadingAI && (
        <View style={styles.aiLoadingIndicator}>
          <ActivityIndicator color="#9B4FDE" size="small" />
          <Text style={styles.aiLoadingText}>AI kelimeleri yükleniyor...</Text>
        </View>
      )}

      {/* Yeni: Soru Giriş Alanı */}
      {isActive && (
        <View style={styles.questionInputSection}>
          <TextInput
            style={styles.questionInput}
            placeholder="Soru sor... (VOX cevaplar)"
            placeholderTextColor="#5A5A70"
            value={userQuestion}
            onChangeText={setUserQuestion}
            onSubmitEditing={analyzeQuestion}
            returnKeyType="send"
          />
          <Pressable
            onPress={analyzeQuestion}
            style={({ pressed }) => [
              styles.analyzeBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol size={16} name="paperplane.fill" color="#9B4FDE" />
          </Pressable>
        </View>
      )}

      {/* Yeni: AI Kelimeleri Göster */}
      {contextualWords.length > 0 && (
        <View style={styles.aiWordsSection}>
          <Text style={styles.aiWordsTitle}>AI Kelimeleri</Text>
          <View style={styles.aiWordsList}>
            {contextualWords.slice(0, 5).map((word, idx) => (
              <View key={idx} style={styles.aiWordBadge}>
                <Text style={styles.aiWordText}>{word}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  aiLoadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#9B4FDE15",
    borderRadius: 8,
    padding: 8,
    marginVertical: 8,
  },
  aiLoadingText: {
    fontSize: 11,
    color: "#9B4FDE",
    fontWeight: "600",
  },
  questionInputSection: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 8,
  },
  questionInput: {
    flex: 1,
    backgroundColor: "#0A0A12",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#9B4FDE30",
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#D0D0E0",
    fontSize: 12,
  },
  analyzeBtn: {
    backgroundColor: "#9B4FDE15",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#9B4FDE30",
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  aiWordsSection: {
    marginVertical: 8,
  },
  aiWordsTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9B4FDE",
    letterSpacing: 1,
    marginBottom: 6,
  },
  aiWordsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  aiWordBadge: {
    backgroundColor: "#9B4FDE15",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#9B4FDE30",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  aiWordText: {
    fontSize: 10,
    color: "#9B4FDE",
    fontWeight: "600",
  },
});
```

---

## LLM Prompt Engineering

### System Prompt Şablonu

```typescript
// lib/prompts/vox-system-prompt.ts

export const VOX_SYSTEM_PROMPT = `
You are an expert paranormal research assistant for the VOX Spirit Box application.
Your role is to generate authentic paranormal vocabulary in Turkish.

CONTEXT:
- This is a paranormal investigation tool for entertainment purposes
- Users are conducting spirit communication sessions
- The app uses ITC (Instrumental Trans-Communication) methodology
- Words should evoke paranormal atmosphere and authenticity

VOCABULARY GUIDELINES:
1. Focus on paranormal themes: death, spirits, supernatural, mystical
2. Include Turkish cultural/historical paranormal references
3. Mix emotional words (fear, sadness, longing) with paranormal terms
4. Avoid modern/technical words (computer, phone, internet)
5. Prefer atmospheric and mysterious vocabulary
6. Include names (Turkish spirits, historical figures)
7. Add action verbs related to supernatural phenomena

QUALITY CRITERIA:
- Paranormal relevance: 0-1 score
- Cultural authenticity: Turkish paranormal traditions
- Emotional impact: Should evoke mystery/unease
- Vocabulary diversity: Avoid repetition
- Contextual appropriateness: Match location/time

OUTPUT FORMAT:
Always respond with valid JSON matching the requested schema.
Include confidence scores and reasoning for all suggestions.
`;

export const buildContextualPrompt = (
  location: string,
  timeOfDay: string,
  previousWords: string[],
  userQuestion: string
) => {
  return `
CURRENT SESSION CONTEXT:
- Location: ${location}
- Time: ${timeOfDay}
- Previously Spoken Words: ${previousWords.join(", ")}
- User Question: "${userQuestion}"

TASK:
Generate 5-7 paranormal words appropriate for this context.
Consider the location (e.g., cemetery → death/burial words)
Consider the time (e.g., night → darkness/mystery words)
Build on previous words to maintain conversation flow
Respond to the user's question thematically

CONSTRAINTS:
- All words must be in Turkish
- Words should be 1-3 syllables (for clarity in audio)
- Avoid words already spoken
- Confidence score should reflect paranormal relevance
- Reasoning should explain contextual appropriateness
`;
};
```



---

## Hata Yönetimi & Fallback Stratejisi

### Olası Hatalar ve Çözümleri

| Hata | Sebep | Çözüm | Fallback |
|------|-------|-------|----------|
| **LLM Timeout** | Ağ gecikme | Retry (3x) | Statik kelimeler |
| **JSON Parse Error** | Geçersiz format | Validate schema | Önceki cache |
| **Paranormal Score Düşük** | Uygunsuz kelime | Filter (>0.6) | Kategori zenginleştirme |
| **Duplikat Kelime** | Tekrar seçim | String normalization | Skip |
| **Cache Miss** | İlk kez bağlam | LLM çağrı | Statik + kategori |
| **Rate Limit** | Çok çağrı | Queue + backoff | Cached words |

### Error Handling Implementasyonu

```typescript
// lib/vox-ai-service.ts

class VoxAIService {
  private retryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  };

  async generateContextualWordsWithFallback(input: ContextInput) {
    try {
      // 1. Cache kontrol
      const cached = await this.checkCache(input);
      if (cached) return cached;

      // 2. LLM çağrı (retry ile)
      const result = await this.retryWithBackoff(
        () => this.callLLM(input),
        this.retryConfig
      );

      // 3. Validasyon
      const validated = await this.validateResult(result);

      // 4. Filtrele
      const filtered = await this.filterParanormalWords(validated.words);

      // 5. Cache'e kaydet
      await this.cacheResult(input, filtered);

      return filtered;
    } catch (error) {
      console.error("[VOX AI] Error:", error);
      return this.getFallbackWords(input);
    }
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = config.initialDelay;

    for (let i = 0; i < config.maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < config.maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
        }
      }
    }

    throw lastError;
  }

  private async getFallbackWords(input: ContextInput): Promise<string[]> {
    // 1. Cache'den eski sonuçları al
    const cachedOld = await this.getOldCachedResult(input);
    if (cachedOld) return cachedOld;

    // 2. Statik kelimelerden bağlama uygun olanları seç
    const staticWords = this.selectStaticWordsByContext(input.context);
    if (staticWords.length > 0) return staticWords;

    // 3. Kategori zenginleştirmesi
    if (input.previousWords.length > 0) {
      const enriched = await this.enrichFromCategory(
        input.previousWords[0]
      );
      if (enriched.length > 0) return enriched;
    }

    // 4. Son çare: Random statik kelimeler
    return this.getRandomStaticWords(5);
  }

  private selectStaticWordsByContext(context: SessionContext): string[] {
    const { location, timeOfDay } = context;

    // Bağlama göre statik kelime kategorisi seç
    let category = "dark_words"; // default

    if (location?.toLowerCase().includes("mezar")) {
      category = "death_words";
    } else if (location?.toLowerCase().includes("eski")) {
      category = "historical_words";
    }

    if (timeOfDay === "night") {
      category = "dark_words";
    }

    return this.getStaticWordsByCategory(category, 5);
  }
}
```

---

## Performans Optimizasyonu

### 1. Caching Stratejisi

```typescript
// lib/cache-strategy.ts

class VoxCacheStrategy {
  // Context Hash: Hızlı lookup
  private generateContextHash(context: SessionContext): string {
    const key = `${context.location}|${context.timeOfDay}|${context.previousWords.join(",")}`;
    return crypto.createHash("sha256").update(key).digest("hex");
  }

  // Multi-level Cache
  async getOrGenerate(input: ContextInput): Promise<string[]> {
    // Level 1: Memory cache (en hızlı)
    const memCached = this.memoryCache.get(input.contextHash);
    if (memCached && !this.isExpired(memCached)) {
      return memCached.words;
    }

    // Level 2: Redis cache (orta)
    const redisCached = await this.redis.get(input.contextHash);
    if (redisCached) {
      this.memoryCache.set(input.contextHash, redisCached);
      return redisCached.words;
    }

    // Level 3: Database cache (yavaş ama persistent)
    const dbCached = await db.query.contextualWordCache.findFirst({
      where: (table, { eq, gt }) => [
        eq(table.contextHash, input.contextHash),
        gt(table.expiresAt, new Date()),
      ],
    });

    if (dbCached) {
      const result = JSON.parse(dbCached.generatedWords);
      this.memoryCache.set(input.contextHash, result);
      await this.redis.set(input.contextHash, result, 3600); // 1 saat
      return result.words;
    }

    // Level 4: LLM çağrı (en yavaş)
    const generated = await this.generateWithLLM(input);
    await this.cacheAtAllLevels(input.contextHash, generated);
    return generated.words;
  }

  private async cacheAtAllLevels(hash: string, data: any) {
    // Memory
    this.memoryCache.set(hash, data);

    // Redis
    await this.redis.set(hash, data, 3600);

    // Database
    await db.insert(contextualWordCache).values({
      contextHash: hash,
      generatedWords: JSON.stringify(data),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  }
}
```

### 2. Batch Processing

```typescript
// server/batch-processor.ts

class VoxBatchProcessor {
  // Oturum sonunda batch feedback işle
  async processBatchFeedback(sessionId: number) {
    const session = await db.query.voxSessions.findFirst({
      where: (table, { eq }) => eq(table.id, sessionId),
    });

    if (!session) return;

    const feedbackData = JSON.parse(session.feedbackGiven);

    // Batch insert
    const feedbackRecords = feedbackData.map((fb: any) => ({
      wordId: fb.wordId,
      sessionId,
      spokenAt: new Date(fb.timestamp),
      userFeedback: fb.feedback,
      context: session.location,
    }));

    await db.insert(wordUsageStats).values(feedbackRecords);

    // Batch update word stats
    const likedWords = feedbackData
      .filter((fb: any) => fb.feedback === "like")
      .map((fb: any) => fb.wordId);

    if (likedWords.length > 0) {
      await db.update(dynamicWords).set({
        positiveFeedback: sql`${dynamicWords.positiveFeedback} + 1`,
      });
    }
  }

  // Haftalık trend analizi
  async computeWeeklyTrends() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const trends = await db.query.wordUsageStats.findMany({
      where: (table, { gte, eq }) => [
        gte(table.spokenAt, sevenDaysAgo),
        eq(table.userFeedback, "like"),
      ],
      groupBy: (table) => [table.wordId],
      orderBy: (table) => [desc(count(table.id))],
      limit: 100,
    });

    // Cache'e kaydet
    await this.redis.set("trending_words_week", trends, 86400);
  }
}
```

### 3. Rate Limiting

```typescript
// server/rate-limiter.ts

class VoxRateLimiter {
  private limiter = new Map<string, { count: number; resetAt: number }>();

  async checkLimit(userId: string, action: string): Promise<boolean> {
    const key = `${userId}:${action}`;
    const now = Date.now();

    const current = this.limiter.get(key);

    if (!current || now > current.resetAt) {
      this.limiter.set(key, { count: 1, resetAt: now + 60000 }); // 1 dakika
      return true;
    }

    if (current.count < 10) {
      current.count++;
      return true;
    }

    return false;
  }

  async enforceLimit(userId: string, action: string) {
    const allowed = await this.checkLimit(userId, action);

    if (!allowed) {
      throw new Error(`Rate limit exceeded for ${action}`);
    }
  }
}

// tRPC middleware
export const withRateLimit = (action: string) => {
  return async ({ ctx }: any) => {
    const userId = ctx.userId || "anonymous";
    await rateLimiter.enforceLimit(userId, action);
  };
};
```

---

## Test Stratejisi

### Unit Tests

```typescript
// lib/__tests__/vox-ai-service.test.ts

import { describe, it, expect, beforeEach, vi } from "vitest";
import { VoxAIService } from "@/lib/vox-ai-service";
import { trpc } from "@/lib/trpc";

describe("VoxAIService", () => {
  let service: VoxAIService;

  beforeEach(() => {
    service = new VoxAIService();
    vi.clearAllMocks();
  });

  describe("generateContextualWords", () => {
    it("should generate paranormal words for cemetery context", async () => {
      const input = {
        context: {
          location: "Mezarlık",
          timeOfDay: "night" as const,
          previousWords: ["ölüm", "ruh"],
        },
        userQuestion: "Adın ne?",
      };

      const result = await service.generateContextualWords(input);

      expect(result).toBeDefined();
      expect(result.words).toBeInstanceOf(Array);
      expect(result.words.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should return cached results for same context", async () => {
      const input = {
        context: {
          location: "Mezarlık",
          timeOfDay: "night" as const,
          previousWords: ["ölüm"],
        },
        userQuestion: "Burada mısın?",
      };

      const result1 = await service.generateContextualWords(input);
      const result2 = await service.generateContextualWords(input);

      expect(result1.words).toEqual(result2.words);
    });

    it("should filter out non-paranormal words", async () => {
      const input = {
        context: {
          location: "Mezarlık",
          timeOfDay: "night" as const,
          previousWords: [],
        },
        userQuestion: "",
      };

      const result = await service.generateContextualWords(input);

      // Tüm kelimeler paranormal olmalı
      for (const word of result.words) {
        expect(word).not.toMatch(/bilgisayar|telefon|araba/i);
      }
    });

    it("should handle LLM errors gracefully", async () => {
      vi.spyOn(service as any, "callLLM").mockRejectedValueOnce(
        new Error("LLM timeout")
      );

      const input = {
        context: {
          location: "Mezarlık",
          timeOfDay: "night" as const,
          previousWords: ["ölüm"],
        },
        userQuestion: "",
      };

      const result = await service.generateContextualWords(input);

      // Fallback kelimeler dönmeli
      expect(result.words).toBeDefined();
      expect(result.words.length).toBeGreaterThan(0);
    });
  });

  describe("analyzeUserQuestion", () => {
    it("should extract paranormal keywords from question", async () => {
      const result = await service.analyzeUserQuestion({
        question: "Adın ne? Burada mısın?",
        previousWords: [],
        context: {
          location: "Mezarlık",
          timeOfDay: "night" as const,
        },
      });

      expect(result.keywords).toBeDefined();
      expect(result.suggestedWords).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("filterParanormalWords", () => {
    it("should keep high-confidence paranormal words", async () => {
      const words = ["ölüm", "ruh", "lanet", "korku"];

      const result = await service.filterParanormalWords(words);

      expect(result.filteredWords.length).toBeGreaterThan(0);
      expect(result.filteredWords).toContain("ölüm");
    });

    it("should remove non-paranormal words", async () => {
      const words = ["bilgisayar", "telefon", "araba"];

      const result = await service.filterParanormalWords(words);

      expect(result.filteredWords.length).toBe(0);
    });
  });
});
```

### Integration Tests

```typescript
// server/__tests__/vox-router.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { createCaller } from "@/server/_core/trpc";

describe("VOX Router", () => {
  let caller: any;

  beforeEach(() => {
    caller = createCaller({});
  });

  describe("generateContextualWords", () => {
    it("should generate words and cache them", async () => {
      const input = {
        context: {
          location: "Mezarlık",
          timeOfDay: "night" as const,
          previousWords: ["ölüm", "ruh"],
        },
        userQuestion: "Adın ne?",
        count: 5,
      };

      const result = await caller.vox.generateContextualWords(input);

      expect(result.words).toBeDefined();
      expect(result.words.length).toBeLessThanOrEqual(5);
      expect(result.source).toBe("ai_contextual");

      // Cache kontrol
      const cachedResult = await caller.vox.generateContextualWords(input);
      expect(cachedResult.words).toEqual(result.words);
    });

    it("should save new words to database", async () => {
      const input = {
        context: {
          location: "Eski Ev",
          timeOfDay: "evening" as const,
          previousWords: [],
        },
        userQuestion: "",
        count: 3,
      };

      const result = await caller.vox.generateContextualWords(input);

      // Veritabanında kontrol
      for (const word of result.words) {
        const dbWord = await db.query.dynamicWords.findFirst({
          where: (table, { eq }) => eq(table.word, word),
        });

        expect(dbWord).toBeDefined();
        expect(dbWord?.source).toBe("contextual");
      }
    });
  });

  describe("analyzeUserQuestion", () => {
    it("should analyze question and return suggestions", async () => {
      const result = await caller.vox.analyzeUserQuestion({
        question: "Senin adın ne? Nerede yaşıyordun?",
        previousWords: ["ölüm", "ruh"],
        context: {
          location: "Mezarlık",
          timeOfDay: "night" as const,
        },
      });

      expect(result.keywords).toBeDefined();
      expect(result.suggestedWords).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("getTrendingWords", () => {
    it("should return trending words for time range", async () => {
      const result = await caller.vox.getTrendingWords({
        timeRange: "week",
        limit: 10,
      });

      expect(result.words).toBeDefined();
      expect(result.count).toBeLessThanOrEqual(10);
    });
  });
});
```

---

## Deployment & Monitoring

### Deployment Checklist

```
PRE-DEPLOYMENT:
☐ Tüm unit testler geçti (%100)
☐ Integration testler başarılı
☐ LLM prompt'ları optimize edildi
☐ Cache stratejisi test edildi
☐ Rate limiting konfigürasyonu ayarlandı
☐ Database migrations uygulandı
☐ Error handling kapsamlı
☐ Monitoring dashboard hazırlandı

DEPLOYMENT:
☐ Staging ortamında test et (24 saat)
☐ Kredi kullanımı monitör et
☐ LLM response time ölçümle
☐ Cache hit rate kontrol et
☐ Hata oranını izle

POST-DEPLOYMENT:
☐ Production metrikleri izle
☐ Kullanıcı feedback topla
☐ Paranormal score dağılımını analiz et
☐ Trend kelimeleri gözlemle
☐ Sistem performansını optimize et
```

### Monitoring Metrikleri

```typescript
// lib/monitoring.ts

interface VoxMetrics {
  // LLM Metrikleri
  llmCallsPerHour: number;
  llmAverageResponseTime: number; // ms
  llmErrorRate: number; // %
  llmCreditUsage: number; // kredi/saat

  // Cache Metrikleri
  cacheHitRate: number; // %
  cacheMissRate: number; // %
  cacheSize: number; // MB

  // Kelime Metrikleri
  newWordsPerDay: number;
  averageParanormalScore: number; // 0-1
  wordDuplicateRate: number; // %
  userFeedbackRate: number; // %

  // Sistem Metrikleri
  activeSessionsCount: number;
  averageSessionDuration: number; // dakika
  userSatisfactionScore: number; // 0-100
  systemUptime: number; // %
}

class VoxMonitoring {
  async collectMetrics(): Promise<VoxMetrics> {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    return {
      llmCallsPerHour: await this.countLLMCalls(lastHour),
      llmAverageResponseTime: await this.getAverageLLMResponseTime(lastHour),
      llmErrorRate: await this.getLLMErrorRate(lastHour),
      llmCreditUsage: await this.getCreditUsage(lastHour),

      cacheHitRate: await this.getCacheHitRate(),
      cacheMissRate: await this.getCacheMissRate(),
      cacheSize: await this.getCacheSize(),

      newWordsPerDay: await this.getNewWordsPerDay(),
      averageParanormalScore: await this.getAverageParanormalScore(),
      wordDuplicateRate: await this.getWordDuplicateRate(),
      userFeedbackRate: await this.getUserFeedbackRate(),

      activeSessionsCount: await this.getActiveSessionsCount(),
      averageSessionDuration: await this.getAverageSessionDuration(),
      userSatisfactionScore: await this.getUserSatisfactionScore(),
      systemUptime: await this.getSystemUptime(),
    };
  }

  async reportMetrics() {
    const metrics = await this.collectMetrics();

    console.log("[VOX Metrics]", {
      llm: {
        callsPerHour: metrics.llmCallsPerHour,
        avgResponseTime: `${metrics.llmAverageResponseTime}ms`,
        errorRate: `${metrics.llmErrorRate}%`,
        creditUsage: `${metrics.llmCreditUsage} kredi/saat`,
      },
      cache: {
        hitRate: `${metrics.cacheHitRate}%`,
        size: `${metrics.cacheSize}MB`,
      },
      words: {
        newPerDay: metrics.newWordsPerDay,
        avgParanormalScore: metrics.averageParanormalScore.toFixed(2),
        duplicateRate: `${metrics.wordDuplicateRate}%`,
      },
      system: {
        activeSessions: metrics.activeSessionsCount,
        avgSessionDuration: `${metrics.averageSessionDuration}min`,
        satisfaction: `${metrics.userSatisfactionScore}%`,
        uptime: `${metrics.systemUptime}%`,
      },
    });

    // Alert eşikleri
    if (metrics.llmErrorRate > 5) {
      console.warn("[VOX Alert] LLM error rate yüksek:", metrics.llmErrorRate);
    }

    if (metrics.cacheHitRate < 50) {
      console.warn("[VOX Alert] Cache hit rate düşük:", metrics.cacheHitRate);
    }

    if (metrics.llmCreditUsage > 500) {
      console.warn(
        "[VOX Alert] Kredi kullanımı yüksek:",
        metrics.llmCreditUsage
      );
    }
  }
}
```

---

## Özet & Sonraki Adımlar

### Başarı Kriterleri

✅ **Teknik:**
- LLM response time: <2 saniye
- Cache hit rate: >70%
- Error rate: <2%
- System uptime: >99.5%

✅ **Kullanıcı Deneyimi:**
- Kelime uygunluğu: >75%
- Kullanıcı memnuniyeti: >70%
- Feedback oranı: >40%
- Session duration: +20%

✅ **Ekonomik:**
- Kredi maliyeti: <5,000/ay
- Kredi per kelime: <1.2
- ROI: >8/10

### Sonraki Aşamalar

1. **v1.0.21:** Pilot test (100 kullanıcı, 500 kredi)
2. **v1.0.22:** Ölçek artırma (500 kullanıcı, 2,000 kredi)
3. **v1.0.23:** Tam ölçek (1000+ kullanıcı, 4,300 kredi/ay)
4. **v1.0.24:** Kişiselleştirme & Trend analizi
5. **v1.0.25:** Real-time kelime üretimi

---

**Doküman Sürümü:** 1.0  
**Son Güncelleme:** 11 Mayıs 2026  
**Yazar:** Manus AI  
**Durum:** Implementation Ready ✅
