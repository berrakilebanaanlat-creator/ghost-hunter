# Paranormal Hunter — Tasarım Planı

## Genel Konsept

Karanlık, gerilim dolu ve atmosferik bir hayalet avcılığı uygulaması. Kullanıcı gerçek bir paranormal araştırmacı gibi hisseder; her araç titreşim, animasyon ve ses efektleriyle desteklenir.

---

## Renk Paleti

| Token       | Değer (Dark)  | Açıklama                          |
|-------------|---------------|-----------------------------------|
| background  | `#0A0A0F`     | Derin siyah-mor arka plan         |
| surface     | `#12121A`     | Kart/panel yüzeyi                 |
| primary     | `#00FF88`     | Neon yeşil — aktif/canlı sinyal   |
| accent      | `#7B2FBE`     | Mor — paranormal enerji           |
| danger      | `#FF3B30`     | Kırmızı — tehlike/yüksek aktivite |
| foreground  | `#E8E8F0`     | Birincil metin                    |
| muted       | `#5A5A7A`     | İkincil metin                     |
| border      | `#1E1E2E`     | Kenarlık                          |

---

## Ekran Listesi

### 1. Dashboard (Ana Ekran)
- Büyük "PARANORMAL HUNTER" başlığı, titreşen logo animasyonu
- Aktif araçlara hızlı erişim kartları (EMF, Radar, EVP, Kayıt)
- Mevcut konum bilgisi ve "aktivite seviyesi" göstergesi
- Son kaydedilen olayların özet listesi

### 2. EMF Dedektörü
- Büyük analog kadran göstergesi (0–10 mG arası)
- Gerçek zamanlı çubuk grafik (son 30 saniye)
- Renk kodlaması: yeşil (düşük) → sarı (orta) → kırmızı (yüksek)
- Titreşim + ses uyarısı yüksek aktivitede
- Magnetometre sensörünü kullanır (simüle edilmiş fallback)

### 3. Hayalet Radar
- Dairesel radar tarama animasyonu (dönen yeşil çizgi)
- Rastgele "hedef" noktaları radar üzerinde
- Mesafe ve yön bilgisi
- "Sinyal gücü" göstergesi
- Accelerometer + gyroscope verisi ile etkileşim

### 4. EVP Ses Analizi
- Mikrofon ses seviyesi dalgalanma animasyonu (waveform)
- "Kayıt" butonu — ses kaydı başlatır
- Frekans analizi görselleştirmesi (çubuklar)
- Kaydedilen EVP dosyaları listesi
- Oynatma kontrolü

### 5. Paranormal Olay Kaydı
- Yeni olay ekleme formu (başlık, konum, tarih, notlar, fotoğraf)
- Kaydedilen olayların FlatList görünümü
- Olay detay ekranı
- Şiddet seviyesi (1–5 yıldız)
- AsyncStorage ile yerel depolama

---

## Navigasyon Yapısı

Tab Bar (alt navigasyon, 5 sekme):
1. 🏠 Dashboard (house.fill)
2. 📡 EMF (antenna.radiowaves.left.and.right)
3. 🎯 Radar (scope)
4. 🎙️ EVP (waveform)
5. 📋 Kayıtlar (doc.text.fill)

---

## Temel Kullanıcı Akışları

**Akış 1 — EMF Tarama:**
Dashboard → EMF sekmesi → Sensör otomatik başlar → Yüksek okuma → Titreşim uyarısı → Olay olarak kaydet

**Akış 2 — EVP Kaydı:**
EVP sekmesi → Kayıt başlat → Ses kaydedilir → Kayıt durdur → Dosya listesinde görünür → Oynat

**Akış 3 — Olay Kaydı:**
Kayıtlar sekmesi → "+" butonu → Form doldur → Kaydet → Listede görünür → Detay görüntüle

---

## Tipografi

- Başlıklar: `font-bold`, büyük boyut (32–40px)
- Araç değerleri: Monospace benzeri, neon yeşil
- Gövde metni: `font-medium`, açık gri

---

## Animasyonlar

- Radar: Sürekli dönen tarama çizgisi (Reanimated)
- EMF kadranı: Smooth needle hareketi
- Waveform: Gerçek zamanlı ses dalgası
- Kart hover: Hafif scale + glow efekti
- Yüksek aktivite: Ekran kırmızıya döner, titreşir
