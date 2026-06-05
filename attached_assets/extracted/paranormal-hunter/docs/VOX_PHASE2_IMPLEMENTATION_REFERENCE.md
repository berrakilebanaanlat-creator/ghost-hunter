# VOX Kelime Dağarcığı Dinamik Geliştirme — 2. Aşama
## Implementasyon Referans Dokümanı (Gelecek Çağrı İçin Saklanmıştır)

**Oluşturulma Tarihi:** 11 Mayıs 2026  
**Durum:** Bekleme (Await Recall)  
**Versiyon:** 1.0  
**Hedef Release:** v1.0.20.1 (Pilot) → v1.0.21 (Full)

---

## 📌 HIZLI BAŞVURU

### Yapılan İşler
- ✅ Stratejik Analiz (7 aşamalı sistem tasarımı)
- ✅ Kredi vs Başarı Dengesi Analizi (7.9/10 skor)
- ✅ 2. Aşama Teknik Dokümanı (Kapsamlı implementasyon rehberi)
- ✅ Risk Analizi (Seçenek A/B/C karşılaştırması)
- ✅ Entegrasyon Uygunluğu (88% teknik uygunluk)

### Karar Alınan
- ✅ **SEÇENEK B: Minimal Entegrasyon (v1.0.20.1)** ← ÖNERILEN
- ✅ Pilot test: 10% kullanıcı, 1,000-2,000 kredi/ay
- ✅ Implementasyon süresi: 1 hafta
- ✅ Risk seviyesi: 2/10 (Düşük)
- ✅ Başlama tarihi: 13 Mayıs 2026 (Pazartesi)

### Saklanmış Dosyalar
1. `/home/ubuntu/paranormal-hunter/docs/VOX_PHASE2_AI_WORD_ENRICHMENT.md` (Teknik doküman)
2. `/home/ubuntu/paranormal-hunter/docs/VOX_PHASE2_IMPLEMENTATION_REFERENCE.md` (Bu dosya)

---

## 🎯 SEÇENEK B: MINIMAL ENTEGRASYON (v1.0.20.1)

### Neden Bu Seçenek?

| Faktör | Skor | Durum |
|--------|------|-------|
| **Risk Seviyesi** | 2/10 | ✅ Düşük |
| **Teknik Uygunluk** | 9/10 | ✅ Mükemmel |
| **Kredi Maliyeti** | 8/10 | ✅ Makul |
| **Implementasyon Hızı** | 9/10 | ✅ Hızlı |
| **Öğrenme Potansiyeli** | 7/10 | ✅ İyi |
| **Rollback Kolaylığı** | 9/10 | ✅ Kolay |

**GENEL SKOR: 7.9/10 — BAŞLAMAYA UYGUN ✅**

### Kapsamı

```
v1.0.20 → v1.0.20.1 (Hotfix + AI Pilot)
├─ Sadece generateContextualWords() endpoint
├─ Backend: tRPC + LLM + cache
├─ Frontend: Sessiz entegrasyon (backend'de çalışır)
├─ Database: dynamic_words tablosu (minimal)
├─ Testing: 2 gün
└─ Rollout: 10% kullanıcı (A/B test)

Kredi: 1,000-2,000/ay (pilot)
Zaman: 1 hafta
Risk: Düşük (Sınırlı kod, fallback var)
```

---

## 📋 IMPLEMENTASYON FAZI (1 HAFTA)

### FAZA 1: Backend Hazırlık (2 gün)

**Görevler:**
1. `generateContextualWords()` tRPC endpoint'i
2. LLM prompt engineering (paranormal bağlam)
3. Cache layer (Redis)
4. Error handling + fallback stratejisi
5. Rate limiting (10 çağrı/dakika)

**Dosyalar:**
- `server/routers.ts` - tRPC endpoint
- `server/_core/llm.ts` - LLM integration (mevcut)
- `lib/vox-ai-service.ts` - AI service (yeni)
- `lib/prompts/vox-system-prompt.ts` - Prompt templates (yeni)

**Kod Şablonu:**
```typescript
// server/routers.ts
export const voxRouter = router({
  generateContextualWords: publicProcedure
    .input(z.object({
      context: z.object({
        location: z.string().optional(),
        timeOfDay: z.enum(["morning", "afternoon", "evening", "night"]),
        previousWords: z.array(z.string()),
      }),
      userQuestion: z.string().optional(),
      count: z.number().default(5).max(10),
    }))
    .query(async ({ input }) => {
      // 1. Cache kontrol
      const cached = await checkCache(input);
      if (cached) return cached;

      // 2. LLM çağrı
      const response = await invokeLLM({
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(input) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "contextual_words",
            strict: true,
            schema: {
              type: "object",
              properties: {
                words: { type: "array", items: { type: "string" } },
                confidence: { type: "number" },
                reasoning: { type: "string" },
                categories: { type: "array", items: { type: "string" } },
              },
              required: ["words", "confidence", "reasoning", "categories"],
            },
          },
        },
      });

      // 3. Filtrele & kaydet
      const result = JSON.parse(response.choices[0].message.content);
      const filtered = await filterParanormalWords(result.words);
      await saveDynamicWords(filtered);
      await cacheResult(input, filtered);

      return { words: filtered, confidence: result.confidence };
    }),
});
```

### FAZA 2: Database Şeması (1 gün)

**Tablolar:**
```sql
-- Dinamik kelimeler (AI tarafından üretilen)
CREATE TABLE dynamic_words (
  id SERIAL PRIMARY KEY,
  word VARCHAR(100) NOT NULL UNIQUE,
  source VARCHAR(50), -- 'contextual'
  category VARCHAR(50),
  confidence FLOAT DEFAULT 0.75,
  paranormal_score FLOAT DEFAULT 0.8,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usage_count INT DEFAULT 0,
  positive_feedback INT DEFAULT 0,
  negative_feedback INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- Bağlamsal kelime cache (performans)
CREATE TABLE contextual_word_cache (
  id SERIAL PRIMARY KEY,
  context_hash VARCHAR(64) NOT NULL UNIQUE,
  context_data JSONB,
  generated_words JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  hit_count INT DEFAULT 0,
  INDEX idx_context_hash (context_hash),
  INDEX idx_expires_at (expires_at)
);
```

**Migration:**
```bash
# Drizzle ORM ile
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### FAZA 3: Frontend Entegrasyonu (1 gün)

**Dosyalar:**
- `app/(tabs)/vox.tsx` - VOX screen (güncellenmiş)
- `hooks/use-contextual-words.ts` - Custom hook (yeni)
- `lib/vox-ai-service.ts` - AI service client (yeni)

**Kod Şablonu:**
```typescript
// hooks/use-contextual-words.ts
export function useContextualWords(sessionContext: SessionContext) {
  const [contextualWords, setContextualWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadWords = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await trpc.vox.generateContextualWords.query({
        context: sessionContext,
        count: 5,
      });
      setContextualWords(result.words);

      // VOX motoruna ekle
      const engine = getITCEngine();
      result.words.forEach((word) => {
        engine.addWordToBuffer(word);
      });
    } catch (error) {
      console.error("[VOX] Contextual words error:", error);
      // Fallback: Statik kelimeler kullan
    } finally {
      setIsLoading(false);
    }
  }, [sessionContext]);

  return { contextualWords, isLoading, loadWords };
}

// app/(tabs)/vox.tsx
export default function VoxScreen() {
  const [sessionContext, setSessionContext] = useState({
    location: "unknown",
    timeOfDay: "night" as const,
    previousWords: [] as string[],
  });

  const { contextualWords, isLoading, loadWords } = useContextualWords(sessionContext);

  // 30 saniye sonra yeni kelimeler yükle
  useEffect(() => {
    if (isActive) {
      const timer = setInterval(loadWords, 30000);
      return () => clearInterval(timer);
    }
  }, [isActive, loadWords]);

  return (
    <ScreenContainer>
      {/* ... Mevcut VOX UI ... */}

      {/* AI Kelime Yükleme Göstergesi */}
      {isLoading && (
        <View style={styles.aiLoadingIndicator}>
          <ActivityIndicator color="#9B4FDE" size="small" />
          <Text style={styles.aiLoadingText}>AI kelimeleri yükleniyor...</Text>
        </View>
      )}

      {/* AI Kelimeleri Göster */}
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
```

### FAZA 4: Testing (2 gün)

**Unit Tests:**
```typescript
// lib/__tests__/vox-ai-service.test.ts
describe("VoxAIService", () => {
  it("should generate paranormal words for cemetery context", async () => {
    const result = await service.generateContextualWords({
      context: {
        location: "Mezarlık",
        timeOfDay: "night",
        previousWords: ["ölüm", "ruh"],
      },
      userQuestion: "Adın ne?",
    });

    expect(result.words).toBeDefined();
    expect(result.words.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it("should return cached results for same context", async () => {
    const result1 = await service.generateContextualWords(input);
    const result2 = await service.generateContextualWords(input);
    expect(result1.words).toEqual(result2.words);
  });

  it("should handle LLM errors gracefully", async () => {
    vi.spyOn(service as any, "callLLM").mockRejectedValueOnce(
      new Error("LLM timeout")
    );
    const result = await service.generateContextualWords(input);
    expect(result.words).toBeDefined(); // Fallback kelimeleri
  });
});
```

**Integration Tests:**
```typescript
// server/__tests__/vox-router.test.ts
describe("VOX Router", () => {
  it("should generate and cache contextual words", async () => {
    const result = await caller.vox.generateContextualWords(input);
    expect(result.words).toBeDefined();

    // Cache kontrol
    const cachedResult = await caller.vox.generateContextualWords(input);
    expect(cachedResult.words).toEqual(result.words);
  });

  it("should save new words to database", async () => {
    const result = await caller.vox.generateContextualWords(input);
    for (const word of result.words) {
      const dbWord = await db.query.dynamicWords.findFirst({
        where: (table, { eq }) => eq(table.word, word),
      });
      expect(dbWord).toBeDefined();
    }
  });
});
```

**Manual Testing:**
- [ ] VOX oturumu başlat
- [ ] AI kelimeleri yükleniyor göstergesi görünsün
- [ ] 30 saniye sonra yeni kelimeler eklensin
- [ ] Fallback kelimeleri test et (LLM kapalı)
- [ ] Cache hit oranını kontrol et
- [ ] Kredi kullanımını monitör et

### FAZA 5: Deployment (1 gün)

**Staging Test:**
```bash
# 1. Staging'e deploy et
pnpm build
npm run start

# 2. Test et
- LLM response time < 2 saniye
- Cache hit rate > 70%
- Error rate < 2%
- Kredi kullanımı < 2,000/ay
```

**Production Rollout:**
```
1. 10% kullanıcı (A/B test)
2. Monitoring aktif
3. Hata oranı < 2% ise devam
4. 48 saat sonra 50% kullanıcı
5. 100% kullanıcı (v1.0.20.1 stable)
```

---

## 🔧 LLM PROMPT TEMPLATES

### System Prompt

```
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
```

### User Prompt Template

```
CURRENT SESSION CONTEXT:
- Location: {location}
- Time: {timeOfDay}
- Previously Spoken Words: {previousWords.join(", ")}
- User Question: "{userQuestion}"

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
```

---

## ⚠️ RİSK MİTİGASYON

### Olası Hatalar & Çözümleri

| Hata | Sebep | Çözüm | Fallback |
|------|-------|-------|----------|
| **LLM Timeout** | Ağ gecikme | Retry (3x) | Statik kelimeler |
| **JSON Parse Error** | Geçersiz format | Validate schema | Önceki cache |
| **Paranormal Score Düşük** | Uygunsuz kelime | Filter (>0.6) | Kategori zenginleştirme |
| **Duplikat Kelime** | Tekrar seçim | String normalization | Skip |
| **Cache Miss** | İlk kez bağlam | LLM çağrı | Statik + kategori |
| **Rate Limit** | Çok çağrı | Queue + backoff | Cached words |

### Error Handling

```typescript
// lib/vox-ai-service.ts
async generateContextualWordsWithFallback(input: ContextInput) {
  try {
    // 1. Cache kontrol
    const cached = await this.checkCache(input);
    if (cached) return cached;

    // 2. LLM çağrı (retry ile)
    const result = await this.retryWithBackoff(
      () => this.callLLM(input),
      { maxRetries: 3, initialDelay: 1000, backoffMultiplier: 2 }
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
    return this.getFallbackWords(input); // Statik kelimeler
  }
}
```

---

## 📊 MONITORING & KPIs

### Haftalık Takip

```
✓ Yeni Kelime Ekleme Hızı: 1,000+ kelime/hafta
✓ Beğeni Oranı: %70+
✓ Kredi Verimlilik: <1.2 kredi/kelime
✓ Sistem Uptime: %99.5+
✓ Kullanıcı Feedback Oranı: %40+
```

### Aylık Takip

```
✓ Dağarcık Büyümesi: +4,000 kelime
✓ Memnuniyet Artışı: +5%
✓ Kredi Maliyeti: <2,000 kredi (pilot)
✓ Yeni Kullanıcı Tutma: %85+
```

### Alert Eşikleri

```
⚠️ LLM error rate > 5%
⚠️ Cache hit rate < 50%
⚠️ Kredi kullanımı > 3,000/ay (pilot)
⚠️ System uptime < 95%
⚠️ Kullanıcı şikayeti > 10%
```

---

## 📅 ZAMAN ÇİZELGESİ

### v1.0.20 (Mevcut)
- **Tarih:** 11 Mayıs 2026
- **Özellikler:** Billing Sync, Restore Button, ANR fixes
- **Durum:** ✅ Hazır

### v1.0.20.1 Pilot (Gelecek)
- **Tarih:** 20 Mayıs 2026
- **Özellikler:** AI Contextual Words (1 endpoint)
- **Kullanıcı:** 10% (A/B test)
- **Kredi:** 1,000-2,000/ay
- **Durum:** ⏳ Bekleme (Await Recall)

### v1.0.21 Full (Sonra)
- **Tarih:** 1 Haziran 2026
- **Özellikler:** Tüm 5 AI endpoint'i
- **Kullanıcı:** 100%
- **Kredi:** 4,000-5,000/ay
- **Durum:** 📋 Planlama

---

## 🎯 BAŞLAMA KOŞULLARI

### ✅ YEŞIL IŞIK (Başla)
1. ✅ Backend altyapısı hazır (tRPC, LLM, DB)
2. ✅ Teknik uygunluk %88+
3. ✅ Risk seviyesi düşük (2/10)
4. ✅ Kredi maliyeti makul (<2,000/ay pilot)
5. ✅ 1 hafta implementasyon yeterli
6. ✅ Rollback stratejisi hazır

### ⚠️ UYARILAR
1. ⚠️ Redis cache kontrol et
2. ⚠️ Rate limiting implement et
3. ⚠️ LLM prompt'ları optimize et
4. ⚠️ Error handling kapsamlı yap
5. ⚠️ Monitoring dashboard hazırla

### ❌ DURDURMA KRİTERLERİ
1. ❌ LLM response time > 3 saniye
2. ❌ Cache hit rate < 50%
3. ❌ Error rate > 5%
4. ❌ Kredi kullanımı > 3,000/ay (pilot)
5. ❌ Kullanıcı şikayeti > 10%

---

## 📁 DOSYA REFERANSLARI

### Teknik Dokümanlar
- `/home/ubuntu/paranormal-hunter/docs/VOX_PHASE2_AI_WORD_ENRICHMENT.md` - Kapsamlı implementasyon rehberi
- `/home/ubuntu/paranormal-hunter/docs/VOX_PHASE2_IMPLEMENTATION_REFERENCE.md` - Bu dosya

### Implementasyon Dosyaları (Oluşturulacak)
- `server/routers.ts` - tRPC endpoint'ler
- `lib/vox-ai-service.ts` - AI service
- `lib/prompts/vox-system-prompt.ts` - Prompt templates
- `hooks/use-contextual-words.ts` - Custom hook
- `app/(tabs)/vox.tsx` - VOX screen (güncellenmiş)
- `drizzle/schema.ts` - Database schema (güncellenmiş)

### Test Dosyaları (Oluşturulacak)
- `lib/__tests__/vox-ai-service.test.ts` - Unit tests
- `server/__tests__/vox-router.test.ts` - Integration tests

---

## 🔄 ÇAĞRI KOMUTU

Gelecekte bu implementasyona devam etmek için:

```
"VOX Phase 2 AI Word Enrichment v1.0.20.1 pilot implementasyonuna başla.
Referans: /home/ubuntu/paranormal-hunter/docs/VOX_PHASE2_IMPLEMENTATION_REFERENCE.md
Teknik Doküman: /home/ubuntu/paranormal-hunter/docs/VOX_PHASE2_AI_WORD_ENRICHMENT.md"
```

---

**Doküman Sürümü:** 1.0  
**Son Güncelleme:** 11 Mayıs 2026  
**Durum:** ✅ Bekleme (Await Recall)  
**Sonraki Adım:** Çağrıldığında v1.0.20.1 pilot implementasyonuna başla
