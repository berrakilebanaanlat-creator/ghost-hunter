# Antik Ghost App — Sosyal Özellikler Maliyet ve Süre Analizi

**Hazırlayan:** Manus AI
**Tarih:** 11 Mayıs 2026
**Sürüm:** v1.0.20 Baz Alınarak

---

## 1. Yönetici Özeti

Bu rapor, Antik Ghost App (Paranormal Hunter) uygulamasına **Kanıt Duvarı sosyal paylaşım, oylama ve yorum** özelliklerinin eklenmesinin teknik, mali ve hukuki boyutlarını analiz etmektedir. Analiz, mevcut altyapı (Expo + tRPC + MySQL + S3), Google Play politikaları ve piyasa fiyatlandırması temel alınarak hazırlanmıştır.

Sonuç olarak **üç farklı senaryo** sunulmaktadır: Minimum Uygulanabilir Sosyal (MVP), Orta Seviye Topluluk ve Tam Kapsamlı Sosyal Platform. Her senaryo için geliştirme süresi, aylık işletme maliyeti ve risk değerlendirmesi ayrı ayrı verilmektedir.

---

## 2. Mevcut Altyapı Değerlendirmesi

Antik Ghost App'in mevcut backend altyapısı sosyal özellikler için önemli bir avantaj sağlamaktadır. Projenin `server/` dizininde halihazırda aşağıdaki bileşenler mevcuttur:

| Bileşen | Mevcut Durum | Sosyal Özellik İçin Yeterliliği |
|---------|-------------|-------------------------------|
| **Veritabanı (MySQL + Drizzle ORM)** | Aktif, users tablosu mevcut | Yeni tablolar eklenmeli (posts, comments, votes) |
| **Kullanıcı Kimlik Doğrulama (Manus OAuth)** | Aktif, protectedProcedure mevcut | Yeterli, ek geliştirme gerekmez |
| **tRPC API** | Aktif, router yapısı hazır | Yeni router'lar eklenmeli |
| **S3 Depolama** | Aktif, dosya yükleme altyapısı mevcut | Görüntü/ses dosyaları için kullanılabilir |
| **LLM Entegrasyonu** | Aktif, multimodal AI mevcut | İçerik moderasyonu için kullanılabilir |

Bu altyapı sayesinde sıfırdan bir backend kurmak yerine mevcut sisteme ekleme yapılabilir, bu da maliyeti ve süreyi önemli ölçüde düşürmektedir.

---

## 3. Google Play Politika Gereksinimleri

Google Play, kullanıcı tarafından oluşturulan içerik (UGC) barındıran uygulamalar için belirli zorunluluklar getirmektedir. Bu gereksinimler karşılanmazsa uygulama mağazadan kaldırılabilir [1].

### Zorunlu Gereksinimler

| Gereksinim | Açıklama | Geliştirme Etkisi |
|-----------|---------|-------------------|
| **İçerik Raporlama** | Kullanıcılar uygunsuz içeriği bildirebilmeli | Her paylaşımda "Raporla" butonu |
| **İçerik Moderasyonu** | Uygunsuz içerikler tespit edilip kaldırılmalı | Otomatik + manuel moderasyon sistemi |
| **Kullanıcı Engelleme** | Kullanıcılar birbirini engelleyebilmeli | Block/mute sistemi |
| **Topluluk Kuralları** | Uygulama içi kullanım koşulları gösterilmeli | Kurallar ekranı |
| **Veri Güvenliği Beyanı** | Google Play'deki form güncellenmeli | Toplanan veri türleri beyanı |
| **Gizlilik Politikası** | Sosyal verileri kapsayacak şekilde güncellenmeli | Hukuki metin güncellemesi |

### Ek Gereksinimler (Android 14/15)

Nisan 2026 itibarıyla Google Play, AI tarafından oluşturulan içeriklerin etiketlenmesini de zorunlu kılmaktadır [2]. Antik Ghost App'in SLS görüntüleri ve EVP kayıtları simüle edilmiş içerik olduğundan, paylaşım sırasında bu durumun açıkça belirtilmesi gerekmektedir.

---

## 4. Senaryo Analizi

### Senaryo A: Minimum Uygulanabilir Sosyal (MVP)

Bu senaryo, en düşük maliyetle Google Play politikalarına uyumlu bir sosyal özellik seti sunar. Kullanıcılar kanıtlarını paylaşabilir, başkalarının kanıtlarını görebilir ve beğenebilir. Yorum özelliği bu aşamada eklenmez.

**Kapsam:**
- Kanıt paylaşma (fotoğraf + metin, ses hariç)
- Genel kanıt akışı (feed) — en yeni ve en çok beğenilen sıralama
- Beğeni (upvote) sistemi
- İçerik raporlama butonu
- Kullanıcı engelleme
- Topluluk kuralları ekranı
- Otomatik içerik moderasyonu (mevcut LLM ile)

**Geliştirme Süresi:** 3-4 hafta

| Görev | Tahmini Süre |
|-------|-------------|
| Veritabanı şeması (posts, votes, reports, blocks) | 2 gün |
| tRPC API endpoint'leri (CRUD + feed + vote) | 3 gün |
| S3'e görüntü yükleme pipeline'ı | 2 gün |
| Feed ekranı (FlatList + infinite scroll) | 3 gün |
| Paylaşım ekranı (kanıt seçimi + açıklama) | 2 gün |
| Beğeni/raporlama/engelleme UI | 2 gün |
| LLM tabanlı otomatik moderasyon | 2 gün |
| Topluluk kuralları + gizlilik politikası güncellemesi | 1 gün |
| Google Play veri güvenliği formu güncellemesi | 1 gün |
| Test ve hata düzeltme | 3 gün |
| **Toplam** | **~21 iş günü (3-4 hafta)** |

**Aylık İşletme Maliyeti (1.000 aktif kullanıcı tahmini):**

| Kalem | Tahmini Maliyet |
|-------|----------------|
| Veritabanı (mevcut MySQL) | $0 (mevcut altyapıda) |
| S3 Depolama (10 GB görüntü) | ~$0.23/ay [3] |
| S3 Veri Transferi (50 GB/ay) | ~$4.50/ay |
| LLM Moderasyon (günde ~100 paylaşım) | ~$3-5/ay |
| CDN (isteğe bağlı) | $0-10/ay |
| **Toplam** | **~$5-20/ay** |

**Risk Seviyesi:** Düşük-Orta. Yorum özelliği olmadığı için moderasyon yükü minimumdur. Ancak görüntü moderasyonu hala gereklidir.

---

### Senaryo B: Orta Seviye Topluluk

Bu senaryo, MVP'ye ek olarak yorum sistemi, kullanıcı profilleri ve basit bir sıralama/rozet sistemi ekler. Kullanıcılar arasında daha fazla etkileşim sağlanır.

**Kapsam (MVP'ye ek olarak):**
- Yorum sistemi (paylaşımlara yorum yazma)
- Kullanıcı profil sayfası (paylaşım geçmişi, toplam beğeni)
- Basit rozet/seviye sistemi (kanıt sayısına göre)
- Ses dosyası paylaşımı (EVP kayıtları)
- Push bildirimler (beğeni/yorum bildirimi)
- Gelişmiş moderasyon paneli (admin dashboard)

**Geliştirme Süresi:** 6-8 hafta

| Görev | Tahmini Süre |
|-------|-------------|
| MVP kapsamı (yukarıdaki tüm görevler) | 21 gün |
| Yorum sistemi (veritabanı + API + UI) | 4 gün |
| Kullanıcı profil sayfası | 3 gün |
| Rozet/seviye sistemi | 2 gün |
| Ses dosyası yükleme ve oynatma | 3 gün |
| Push bildirim entegrasyonu | 3 gün |
| Admin moderasyon paneli (web) | 4 gün |
| Gelişmiş moderasyon (metin + görüntü + ses) | 3 gün |
| Test ve hata düzeltme | 5 gün |
| **Toplam** | **~48 iş günü (6-8 hafta)** |

**Aylık İşletme Maliyeti (5.000 aktif kullanıcı tahmini):**

| Kalem | Tahmini Maliyet |
|-------|----------------|
| Veritabanı (mevcut MySQL) | $0 (mevcut altyapıda) |
| S3 Depolama (50 GB görüntü + ses) | ~$1.15/ay [3] |
| S3 Veri Transferi (200 GB/ay) | ~$18/ay |
| LLM Moderasyon (günde ~500 içerik) | ~$15-25/ay |
| Push Bildirim Servisi | $0 (Expo Push ücretsiz) |
| CDN | ~$10-15/ay |
| **Toplam** | **~$45-60/ay** |

**Risk Seviyesi:** Orta. Yorum moderasyonu ek yük getirir. Hakaret, spam ve uygunsuz içerik filtreleme sistemi kritik önem taşır.

---

### Senaryo C: Tam Kapsamlı Sosyal Platform

Bu senaryo, uygulamayı bir paranormal araştırma topluluğuna dönüştürür. Gerçek zamanlı sohbet, takip sistemi, konum bazlı keşif ve premium sosyal özellikler içerir.

**Kapsam (Orta Seviye'ye ek olarak):**
- Takip sistemi (kullanıcıları takip etme)
- Gerçek zamanlı sohbet (WebSocket)
- Konum bazlı kanıt haritası
- Haftalık/aylık liderlik tablosu
- Premium sosyal özellikler (gelir modeli)
- Gelişmiş arama ve filtreleme
- Kullanıcı doğrulama (verified badge)

**Geliştirme Süresi:** 12-16 hafta

| Görev | Tahmini Süre |
|-------|-------------|
| Orta Seviye kapsamı (yukarıdaki tüm görevler) | 48 gün |
| Takip sistemi (veritabanı + API + UI) | 4 gün |
| Gerçek zamanlı sohbet (WebSocket + UI) | 8 gün |
| Konum bazlı kanıt haritası | 5 gün |
| Liderlik tablosu | 3 gün |
| Premium sosyal özellikler | 3 gün |
| Gelişmiş arama/filtreleme | 3 gün |
| Ölçeklenebilirlik optimizasyonu | 4 gün |
| Kapsamlı test ve hata düzeltme | 8 gün |
| **Toplam** | **~86 iş günü (12-16 hafta)** |

**Aylık İşletme Maliyeti (20.000 aktif kullanıcı tahmini):**

| Kalem | Tahmini Maliyet |
|-------|----------------|
| Veritabanı (daha güçlü sunucu gerekebilir) | $25-50/ay |
| S3 Depolama (200 GB+) | ~$5/ay [3] |
| S3 Veri Transferi (1 TB/ay) | ~$90/ay |
| WebSocket Sunucusu | ~$20-40/ay |
| LLM Moderasyon (günde ~2000 içerik) | ~$50-80/ay |
| CDN | ~$25-35/ay |
| Push Bildirim | $0-25/ay |
| **Toplam** | **~$215-325/ay** |

**Risk Seviyesi:** Yüksek. Gerçek zamanlı sohbet ve büyük kullanıcı tabanı ciddi altyapı ve moderasyon yükü getirir. Hukuki sorumluluk artar.

---

## 5. Karşılaştırmalı Özet Tablosu

| Kriter | Senaryo A (MVP) | Senaryo B (Orta) | Senaryo C (Tam) |
|--------|----------------|-----------------|----------------|
| **Geliştirme Süresi** | 3-4 hafta | 6-8 hafta | 12-16 hafta |
| **Aylık İşletme Maliyeti** | $5-20 | $45-60 | $215-325 |
| **Google Play Uyumluluk Riski** | Düşük | Orta | Yüksek |
| **Moderasyon Yükü** | Minimal | Orta | Yoğun |
| **Kullanıcı Etkileşimi** | Temel | İyi | Çok İyi |
| **Gelir Potansiyeli** | Düşük | Orta | Yüksek |
| **Bakım Karmaşıklığı** | Düşük | Orta | Yüksek |

---

## 6. Alternatif Yaklaşım: Dışa Aktarma ile Sosyal Paylaşım

Sosyal özellik geliştirmeden önce düşünülmesi gereken en düşük maliyetli seçenek, kullanıcıların kanıtlarını **mevcut sosyal medya platformlarına paylaşmasını** sağlamaktır.

**Kapsam:**
- Kanıt Duvarı'ndan "Paylaş" butonu
- WhatsApp, Instagram, Telegram, X (Twitter) paylaşım desteği
- Paylaşılan içeriğe uygulama logosu ve watermark ekleme
- Derin bağlantı (deep link) ile uygulamaya yönlendirme

**Geliştirme Süresi:** 2-3 gün
**Aylık İşletme Maliyeti:** $0
**Google Play Riski:** Sıfır (UGC politikası geçerli değil)

Bu yaklaşım, sosyal etkileşimi uygulama dışına taşıyarak moderasyon yükünü tamamen ortadan kaldırır ve organik kullanıcı kazanımı sağlar. Uygulamanın mevcut aşamasında en mantıklı ilk adımdır.

---

## 7. Önerilen Yol Haritası

Sürdürülebilirlik ve kademeli büyüme prensibi doğrultusunda aşağıdaki aşamalı yaklaşım önerilmektedir:

**Aşama 1 — v1.0.20+ (Hemen):** Dışa aktarma ile sosyal paylaşım butonu ekle. Maliyet: $0, süre: 2-3 gün.

**Aşama 2 — v1.1.0 (Kullanıcı tabanı 5.000+ olduğunda):** Senaryo A (MVP) uygula. Kanıt paylaşımı ve beğeni sistemi. Maliyet: ~$5-20/ay.

**Aşama 3 — v1.2.0 (Kullanıcı tabanı 15.000+ olduğunda):** Senaryo B'ye geçiş. Yorum, profil ve rozet sistemi. Maliyet: ~$45-60/ay.

**Aşama 4 — v2.0.0 (Kullanıcı tabanı 50.000+ olduğunda):** Senaryo C değerlendir. Tam sosyal platform. Maliyet: ~$215-325/ay.

Bu kademeli yaklaşım, gereksiz erken yatırımı önler ve her aşamada kullanıcı geri bildirimine göre yön değiştirme esnekliği sağlar.

---

## 8. Sonuç

Antik Ghost App'in mevcut altyapısı (tRPC + MySQL + S3 + LLM) sosyal özellikler için güçlü bir temel sunmaktadır. Ancak sosyal özellikler, geliştirme maliyetinin ötesinde **sürekli moderasyon yükü, hukuki sorumluluk ve altyapı maliyeti** getirmektedir.

Mevcut kullanıcı tabanı ve gelir düzeyi göz önünde bulundurulduğunda, en akıllıca strateji **önce dışa aktarma paylaşım butonuyla başlamak**, ardından kullanıcı tabanı büyüdükçe kademeli olarak uygulama içi sosyal özelliklere geçmektir.

---

## Referanslar

[1]: https://play.google/developer-content-policy/ "Google Play Developer Policy Center"
[2]: https://support.google.com/googleplay/android-developer/answer/16926792 "Google Play Policy Announcement: April 15, 2026"
[3]: https://aws.amazon.com/s3/pricing/ "Amazon S3 Pricing"
