# Antik Ghost App — Google Play Yayınlama Rehberi

Bu rehber, uygulamanı Google Play Store'da yayınlamak için yapman gereken her adımı, hiç bilmeyen birine anlatır gibi açıklamaktadır. Adımları sırasıyla takip et, hiçbirini atlama.

---

## GENEL BAKIŞ — Ne Yapacağız?

Toplam 6 ana adım var. Tahmini süre: 1-2 saat.

| Adım | Ne Yapılacak | Tahmini Süre |
|------|-------------|--------------|
| 1 | APK dosyasını oluştur (Manus'ta Publish butonu) | 10-15 dk |
| 2 | Gizlilik politikası sayfasını yayınla | 10 dk |
| 3 | Google Play Console'da uygulama bilgilerini gir | 20-30 dk |
| 4 | VOX abonelik ürünlerini oluştur (Subscriptions) | 15 dk |
| 5 | İçerik derecelendirme anketini doldur | 10 dk |
| 6 | APK'yı yükle ve incelemeye gönder | 10 dk |

---

## ADIM 1: APK Dosyasını Oluştur

Bu adımda Manus üzerinden uygulamanın kurulum dosyasını (APK) oluşturacaksın.

**1.1** Manus sohbet ekranında, en son checkpoint kartını bul (en alttaki).

**1.2** Kartın sağ üst köşesindeki **"Publish"** butonuna tıkla.

**1.3** Sistem otomatik olarak APK dosyasını oluşturmaya başlayacak. Bu işlem 10-15 dakika sürebilir. Sabırla bekle.

**1.4** İşlem tamamlandığında APK dosyasını indirebileceksin. Bu dosyayı bilgisayarına kaydet.

> **Not:** APK dosyası yaklaşık 50-80 MB olacaktır. İnternet bağlantının stabil olduğundan emin ol.

---

## ADIM 2: Gizlilik Politikası Sayfasını Yayınla

Google Play, her uygulamanın bir gizlilik politikası URL'si olmasını zorunlu kılmaktadır. Sana bir gizlilik politikası HTML dosyası hazırladım. Bunu ücretsiz olarak internete yüklemenin en kolay yolu GitHub Pages kullanmaktır.

### Seçenek A: GitHub Pages (Önerilen — Ücretsiz)

**2.1** Tarayıcında https://github.com adresine git ve hesabına giriş yap. Hesabın yoksa ücretsiz oluştur.

**2.2** Sağ üstteki **"+"** butonuna tıkla ve **"New repository"** seç.

**2.3** Repository adı olarak `antik-ghost-privacy` yaz.

**2.4** "Public" seçili olsun. **"Add a README file"** kutusunu işaretle.

**2.5** **"Create repository"** butonuna tıkla.

**2.6** Repository sayfasında **"Add file"** > **"Upload files"** tıkla.

**2.7** Bilgisayarındaki `privacy-policy.html` dosyasını sürükle-bırak yap. Bu dosyayı Manus'un Code panelinden indirebilirsin (sağ paneldeki dosya ağacından `privacy-policy.html` dosyasını bul ve indir).

**2.8** **"Commit changes"** butonuna tıkla.

**2.9** Repository'nin **"Settings"** sekmesine git.

**2.10** Sol menüden **"Pages"** seçeneğine tıkla.

**2.11** "Source" altında **"Deploy from a branch"** seçili olsun. Branch olarak **"main"** seç ve **"/ (root)"** klasörünü seç. **"Save"** tıkla.

**2.12** 2-3 dakika bekle. Sayfanın üstünde yeşil bir kutu ile URL görünecek. URL şu formatta olacak:

```
https://KULLANICIADIN.github.io/antik-ghost-privacy/privacy-policy.html
```

**2.13** Bu URL'yi bir yere not et — Google Play Console'da kullanacaksın.

### Seçenek B: Google Sites (Alternatif)

Eğer GitHub kullanmak istemezsen, https://sites.google.com adresinden ücretsiz bir sayfa oluşturup gizlilik politikası metnini oraya yapıştırabilirsin.

---

## ADIM 3: Google Play Console'da Uygulama Bilgilerini Gir

**3.1** Tarayıcında https://play.google.com/console adresine git ve giriş yap.

**3.2** Sol menüden **"Tüm uygulamalar"** (All apps) seçeneğine tıkla.

**3.3** Daha önce oluşturduğun **"Antik Ghost App"** uygulamasını bul ve tıkla. Eğer yoksa **"Uygulama oluştur"** (Create app) butonuna tıkla ve aşağıdaki bilgileri gir:

| Alan | Değer |
|------|-------|
| Uygulama adı | Antik Ghost - Hayalet Avcısı |
| Varsayılan dil | Türkçe - tr-TR |
| Uygulama türü | Uygulama (App) |
| Ücretsiz/Ücretli | Ücretsiz |

Beyanları kabul et ve **"Uygulama oluştur"** tıkla.

### 3A: Mağaza Girişi (Store Listing)

**3.4** Sol menüden **"Ana mağaza girişi"** (Main store listing) seçeneğine tıkla.

**3.5** Aşağıdaki bilgileri ilgili alanlara yapıştır:

| Alan | Ne Yazacaksın |
|------|--------------|
| **Uygulama adı** | `Antik Ghost - Hayalet Avcısı` |
| **Kısa açıklama** | `Paranormal araştırma araçları: EMF, VOX Ruh Kutusu, EVP, SLS Kamera, Radar` |
| **Tam açıklama** | GOOGLE_PLAY_LISTING.md dosyasındaki "3. Uzun Açıklama" bölümünü kopyala |

**3.6** **Ekran Görüntüleri** bölümü — En az 2 ekran görüntüsü yüklemen gerekiyor:

Telefonundan uygulamayı açıp şu ekranların ekran görüntüsünü al:
1. Ana ekran (Home) — EMF göstergesi görünür halde
2. VOX ekranı — Tarama aktif, kelimeler görünür halde
3. Radar ekranı — Tarama aktif
4. SLS Kamera ekranı
5. EVP Kayıt ekranı

> **Önemli:** Ekran görüntüleri en az 320px, en fazla 3840px genişliğinde olmalı. Telefon ekran görüntüsü yeterli.

**3.7** **Uygulama simgesi** — 512x512 piksel PNG dosyası gerekiyor. Manus'un Code panelinden `assets/images/icon.png` dosyasını indir ve yükle.

**3.8** **Öne çıkan grafik (Feature Graphic)** — 1024x500 piksel bir banner resmi. Bunu birlikte oluşturabiliriz veya Canva'da ücretsiz yapabilirsin.

### 3B: Kategorilendirme

**3.9** Sol menüden **"Uygulama içeriği"** (App content) > **"Uygulama kategorisi"** bölümüne git.

**3.10** Aşağıdaki ayarları yap:

| Alan | Değer |
|------|-------|
| Uygulama türü | Uygulama |
| Kategori | **Eğlence** (Entertainment) |
| Etiketler | paranormal, ghost hunter, spirit box, EMF detector, hayalet avcısı |

### 3C: Gizlilik Politikası

**3.11** Sol menüden **"Uygulama içeriği"** (App content) > **"Gizlilik politikası"** bölümüne git.

**3.12** Adım 2'de oluşturduğun gizlilik politikası URL'sini yapıştır:

```
https://KULLANICIADIN.github.io/antik-ghost-privacy/privacy-policy.html
```

---

## ADIM 4: VOX Abonelik Ürünlerini Oluştur (Subscriptions)

Bu adım çok önemli — VOX'un gerçek para kazanabilmesi için Google Play Console'da abonelik ürünleri tanımlanmalıdır.

**4.1** Google Play Console'da uygulamanın sayfasında sol menüden **"Para kazanma"** (Monetize) > **"Abonelikler"** (Subscriptions) seçeneğine tıkla.

**4.2** **"Abonelik oluştur"** (Create subscription) butonuna tıkla.

### 4A: Aylık Abonelik

**4.3** Aşağıdaki bilgileri gir:

| Alan | Değer |
|------|-------|
| **Ürün kimliği (Product ID)** | `vox_monthly` |
| **Ad** | VOX Aylık Abonelik |
| **Açıklama** | VOX Ruh İletişim Cihazı — Aylık abonelik. 3000+ Türkçe kelime, 9 farklı ses karakteri, radyo efektleri ve mikrofon tetikleme özelliği. |

**4.4** "Temel plan ekle" (Add base plan) butonuna tıkla:

| Alan | Değer |
|------|-------|
| **Faturalandırma dönemi** | 1 ay |
| **Fiyat** | 3,99 USD |
| **Ücretsiz deneme** | Yok |

**4.5** **"Kaydet"** ve ardından **"Etkinleştir"** (Activate) butonuna tıkla.

### 4B: Yıllık Abonelik

**4.6** Tekrar **"Abonelik oluştur"** butonuna tıkla.

**4.7** Aşağıdaki bilgileri gir:

| Alan | Değer |
|------|-------|
| **Ürün kimliği (Product ID)** | `vox_yearly` |
| **Ad** | VOX Yıllık Abonelik |
| **Açıklama** | VOX Ruh İletişim Cihazı — Yıllık abonelik (%58 tasarruf). 3000+ Türkçe kelime, 9 farklı ses karakteri, radyo efektleri ve mikrofon tetikleme özelliği. |

**4.8** "Temel plan ekle" (Add base plan) butonuna tıkla:

| Alan | Değer |
|------|-------|
| **Faturalandırma dönemi** | 1 yıl |
| **Fiyat** | 19,99 USD |
| **Ücretsiz deneme** | Yok |

**4.9** **"Kaydet"** ve ardından **"Etkinleştir"** (Activate) butonuna tıkla.

> **Çok Önemli:** Ürün kimlikleri (Product ID) tam olarak `vox_monthly` ve `vox_yearly` olmalı. Bu, uygulamadaki kodla eşleşiyor. Farklı yazarsan abonelik çalışmaz.

---

## ADIM 5: İçerik Derecelendirme Anketini Doldur

Google Play, her uygulamanın yaş derecelendirmesi olmasını zorunlu kılmaktadır.

**5.1** Sol menüden **"Uygulama içeriği"** (App content) > **"İçerik derecelendirmesi"** (Content rating) bölümüne git.

**5.2** **"Anketi başlat"** (Start questionnaire) butonuna tıkla.

**5.3** E-posta adresini gir ve kategori olarak **"Diğer"** (Utility, Productivity, Communication, or other) seç.

**5.4** Ankette şu soruları şöyle yanıtla:

| Soru | Cevap |
|------|-------|
| Şiddet içeriyor mu? | Hayır |
| Cinsel içerik var mı? | Hayır |
| Küfür/kaba dil var mı? | Hayır |
| Uyuşturucu referansı var mı? | Hayır |
| Korku/ürkütücü temalar var mı? | **Evet** |
| Kullanıcı etkileşimi var mı? | Hayır |
| Konum paylaşımı var mı? | Hayır |
| Uygulama içi satın alma / abonelik var mı? | **Evet** |
| Reklamlar var mı? | **Evet** |

**5.5** **"Kaydet"** ve **"Gönder"** butonlarına tıkla. Sistem otomatik olarak yaş derecelendirmesini belirleyecek (muhtemelen 12+ olacak).

---

## ADIM 6: APK'yı Yükle ve İncelemeye Gönder

**6.1** Sol menüden **"Sürüm"** (Release) > **"Üretim"** (Production) bölümüne git.

**6.2** **"Yeni sürüm oluştur"** (Create new release) butonuna tıkla.

**6.3** **"Uygulama paketleri"** (App bundles) bölümünde **"Yükle"** (Upload) butonuna tıkla.

**6.4** Adım 1'de indirdiğin APK dosyasını yükle. Yükleme birkaç dakika sürebilir.

**6.5** **"Sürüm adı"** alanına `1.0.0` yaz.

**6.6** **"Sürüm notları"** alanına şunu yaz:

```
İlk sürüm. Paranormal araştırma araç seti: EMF Tarayıcı, VOX Ruh İletişim Cihazı, EVP Ses Kaydı, SLS Kamera, Paranormal Radar ve Olay Kayıtları.
```

**6.7** **"İncele"** (Review) butonuna tıkla. Sistem eksik bilgileri varsa sana gösterecek — eksikleri tamamla.

**6.8** Her şey tamamsa **"Üretime yayınlamaya başla"** (Start rollout to production) butonuna tıkla.

**6.9** Onay kutusunu işaretle ve **"Yayınla"** (Rollout) butonuna tıkla.

> **Not:** Google inceleme süreci genellikle 1-3 gün sürer. Bazen 7 güne kadar uzayabilir. İnceleme sonucu e-posta ile bildirilir.

---

## YAYINLAMA SONRASI — Ne Beklenmeli?

Google uygulamanı inceledikten sonra 3 sonuç olabilir:

| Sonuç | Ne Yapmalısın |
|-------|--------------|
| **Onaylandı** | Tebrikler! Uygulaman Google Play'de yayında. |
| **Reddedildi** | Red sebebini oku, düzelt ve tekrar gönder. Genellikle küçük düzeltmeler yeterli. |
| **Askıya alındı** | Politika ihlali varsa detayları oku ve itiraz et. |

### İlk Hafta Yapılacaklar

Uygulama yayınlandıktan sonra şunları takip et:

**Google Play Console'da:**
1. **İstatistikler** (Statistics) — İndirme sayısı, aktif kullanıcılar
2. **Değerlendirmeler** (Ratings & reviews) — Kullanıcı yorumlarını oku ve yanıtla
3. **Kilitlenme raporları** (Crashes) — Hata varsa bildir, birlikte düzeltelim

**AdMob'da:**
1. **Raporlar** — Reklam gösterim sayısı ve tahmini gelir
2. **Ödeme eşiği** — 100$'a ulaşınca ilk ödeme yapılır

---

## SIKÇA SORULAN SORULAR

**S: Uygulama ne zaman Google Play'de görünür?**
C: İnceleme onaylandıktan sonra birkaç saat içinde tüm dünyada görünür hale gelir.

**S: Fiyatı sonradan değiştirebilir miyim?**
C: Evet. Google Play Console'dan VOX ürününün fiyatını istediğin zaman değiştirebilirsin.

**S: Güncelleme nasıl yaparım?**
C: Manus'ta değişiklikleri yap, yeni checkpoint oluştur, Publish ile yeni APK al, Google Play Console'da yeni sürüm oluştur ve yükle.

**S: Reklamlar neden hemen para kazandırmıyor?**
C: İlk günlerde indirme sayısı düşük olacağı için reklam geliri de düşük olur. Kullanıcı sayısı arttıkça gelir de artar.

**S: VOX aboneliği çalışmıyorsa ne yapmalıyım?**
C: Google Play Console'da `vox_monthly` ve `vox_yearly` abonelik ürünlerinin "Etkin" (Active) durumda olduğundan emin ol. Abonelik oluşturulduktan sonra aktif olması birkaç saat sürebilir.

---

## HAZIR METINLER — Kopyala Yapıştır

### Google Play Uygulama Adı
```
Antik Ghost - Hayalet Avcısı
```

### Google Play Kısa Açıklama
```
Paranormal araştırma araçları: EMF, VOX Ruh Kutusu, EVP, SLS Kamera, Radar
```

### Google Play Uzun Açıklama
GOOGLE_PLAY_LISTING.md dosyasındaki "3. Uzun Açıklama" bölümünü kopyala.

### Sürüm Notları (Release Notes)
```
İlk sürüm. Paranormal araştırma araç seti: EMF Tarayıcı, VOX Ruh İletişim Cihazı, EVP Ses Kaydı, SLS Kamera, Paranormal Radar ve Olay Kayıtları.
```

### VOX Aylık Abonelik Açıklaması
```
VOX Ruh İletişim Cihazı — Aylık abonelik. 3000+ Türkçe kelime, 9 farklı ses karakteri, radyo efektleri ve mikrofon tetikleme özelliği.
```

### VOX Yıllık Abonelik Açıklaması
```
VOX Ruh İletişim Cihazı — Yıllık abonelik (%58 tasarruf). 3000+ Türkçe kelime, 9 farklı ses karakteri, radyo efektleri ve mikrofon tetikleme özelliği.
```

---

*Bu rehber Manus AI tarafından Antik Ghost App projesi için hazırlanmıştır. — 23 Mart 2026*
