# ⚠️ KEYSTORE BİLGİLERİ — ASLA KAYBETME! ⚠️

**Son Güncelleme:** 14 Mayıs 2026, 20:10 UTC
**Proje:** Antik Ghost Hunter EMF & EVP
**Package:** com.berrakilebanaanlat.paranormalhunter
**Google Play Console:** https://play.google.com/console/u/0/developers/4845530254095944463/app/4974397072080172002

---

## 1. AKTİF UPLOAD KEYSTORE (14 Mayıs 2026 — Google Onayı Bekleniyor)

| Alan | Değer |
|------|-------|
| **Dosya Adı** | `paranormal-hunter-upload.jks` |
| **Dosya Konumu** | Proje kök dizini |
| **Store Şifresi** | `AntikGhost2026!` |
| **Key Alias** | `upload` |
| **Key Şifresi** | `AntikGhost2026!` |
| **Store Type** | JKS |
| **Algoritma** | RSA 2048-bit |
| **Oluşturma Tarihi** | 14 Mayıs 2026 |
| **Geçerlilik Bitiş** | 29 Eylül 2053 |

### Parmak İzleri (AKTİF KEYSTORE)

```
SHA1:   BB:DD:F1:C6:AB:B5:CC:4E:E7:7B:12:EF:68:10:CE:9D:91:F7:3A:48
SHA256: 29:3F:A3:D8:F8:A7:C9:7E:04:0A:75:6A:43:70:E6:C0:AB:1A:23:4F:D0:A5:19:04:D6:16:67:D8:F1:02:44:52
```

### Sertifika Bilgileri

```
CN=Antik Ghost Hunter
OU=Mobile
O=Berrak Ile Bana Anlat
L=Istanbul
ST=Istanbul
C=TR
```

### PEM Sertifika Dosyası

| Alan | Değer |
|------|-------|
| **Dosya Adı** | `upload-certificate-new.pem` |
| **SHA1** | BB:DD:F1:C6:AB:B5:CC:4E:E7:7B:12:EF:68:10:CE:9D:91:F7:3A:48 |
| **Google'a Yüklenme Tarihi** | 14 Mayıs 2026 |
| **Durum** | ⏳ Google onayı bekleniyor (2-5 iş günü) |

---

## 2. GOOGLE PLAY CONSOLE ANAHTAR BİLGİLERİ

### Uygulama İmzalama Anahtarı (App Signing Key — Google Yönetiyor, DOKUNMA)

```
MD5:  C7:22:B8:6A:B1:8A:99:40:20:37:66:0A:C7:05:40:52
SHA1: 99:1E:AF:44:FA:3A:4B:D1:ED:46:F5:80:90:06:26:29:0F:65:AF:30
SHA256: 89:B8:97:A7:3A:B9:E8:E5:CA:43:91:18:0F:A6:06:B2:B9:06:EE:75:58:20:D9:C0:53...
```

### Yükleme Anahtarı Geçmişi (Upload Key)

| Tarih | SHA1 | Durum |
|-------|------|-------|
| İlk (Manus internal, CN=Manus App) | ED:78:C5:45:EE:69:0E:FF:53:48:FE:AC:A4:59:68:BD:1A:A9:72:30 | ❌ Keystore erişimi yok |
| 9 Mayıs 2026 (paranormal-hunter-release.jks) | E5:64:F7:9C:F4:14:51:7E:F7:11:BB:EE:4F:78:BC:FE:0B:07:11:5E | ❌ Şifre kayıp |
| 11 Mayıs 2026 reset | E8:43:3B:C6:ED:40:A7:E4:5E:28:FA:F9:B7:6A:D1:87:FB:A9:55:BD | ❌ Keystore kaybedildi (sandbox sıfırlandı) |
| **14 Mayıs 2026 reset (SON)** | **BB:DD:F1:C6:AB:B5:CC:4E:E7:7B:12:EF:68:10:CE:9D:91:F7:3A:48** | **⏳ Google onayı bekleniyor** |

---

## 3. İMZALAMA KOMUTLARI (Google Onayladıktan Sonra Kullan)

### AAB İmzalama (v1.0.21 ve sonrası)

```bash
# Adım 1: Manus Publish'ten AAB'yi indir

# Adım 2: Mevcut imzaları kaldır (Manus kendi imzasını koyuyor)
zip -d paranormal-hunter-v1_0_21.aab "META-INF/*"

# Adım 3: Bizim keystore ile imzala
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore paranormal-hunter-upload.jks \
  -storepass 'AntikGhost2026!' \
  -keypass 'AntikGhost2026!' \
  paranormal-hunter-v1_0_21.aab upload

# Adım 4: İmzayı doğrula
jarsigner -verify paranormal-hunter-v1_0_21.aab

# Adım 5: Parmak izini kontrol et (BB:DD:F1:C6 olmalı!)
keytool -printcert -jarfile paranormal-hunter-v1_0_21.aab
```

### PEM Dışa Aktarma (Gelecekte reset gerekirse)

```bash
keytool -export -rfc \
  -keystore paranormal-hunter-upload.jks \
  -alias upload \
  -file upload-certificate.pem \
  -storepass 'AntikGhost2026!'
```

---

## 4. GOOGLE ONAYI SONRASI YAPILACAKLAR (v1.0.21)

1. Google'dan onay e-postası gelecek (2-5 iş günü, tahmini: 16-19 Mayıs 2026)
2. Manus'ta Publish butonuyla v1.0.21 AAB'yi indir
3. Yukarıdaki imzalama komutlarını çalıştır
4. Google Play Console → Üretim → Yeni sürüm → İmzalı AAB'yi yükle
5. Sürüm notlarını ekle → Yayınla

---

## 5. MANUS PUBLISH SİSTEMİ HAKKINDA ÖNEMLİ NOT

⚠️ Manus Publish butonu AAB'yi **kendi internal keystore'u** ile imzalar:
- CN=Manus App
- SHA1: ED:78:C5:45:EE:69:0E:FF:53:48:FE:AC:A4:59:68:BD:1A:A9:72:30

**Bu imza Google tarafından artık KABUL EDİLMEZ.**

Publish'ten indirilen AAB'nin:
1. Önce eski imzası silinmeli (`zip -d ... "META-INF/*"`)
2. Sonra bizim keystore ile yeniden imzalanmalı

---

## 6. v1.0.21 İÇERİĞİ (Yüklenmeyi Bekliyor)

- SoLoader crash fix (ProGuard rules + withSoLoaderFix plugin)
- 3 katmanlı billing acknowledge sistemi (177 iptal edilen abonelik düzeltmesi)
  - purchaseUpdatedListener (gerçek zamanlı)
  - acknowledgePendingPurchases() (uygulama açılışında)
  - finishTransaction (satın alma akışında)
- x86_64 mimari desteği eklendi
- edgeToEdgeEnabled kaldırıldı
- versionCode: 10021, version: 1.0.21

---

## 7. ÖNEMLİ UYARILAR

- ⚠️ **BU DOSYAYI ASLA SİLME**
- ⚠️ **paranormal-hunter-upload.jks DOSYASINI BİLGİSAYARINA İNDİR VE YEDEKLE!**
- ⚠️ **Yedekleme yerleri:** Google Drive + USB + bilgisayar masaüstü
- ⚠️ **Şifre: AntikGhost2026!**
- ⚠️ **Key Alias: upload**
- ⚠️ **SHA1: BB:DD:F1:C6:AB:B5:CC:4E:E7:7B:12:EF:68:10:CE:9D:91:F7:3A:48**
- ⚠️ Bu keystore kaybedilirse TEKRAR 2-5 gün bekleme süreci başlar!
- ⚠️ Sandbox her oturumda sıfırlanabilir — keystore'u MUTLAKA bilgisayarına indir!

---

**BU DOSYA 14 MAYIS 2026'DA GÜNCELLENMİŞTİR. SON HALİDİR.**
