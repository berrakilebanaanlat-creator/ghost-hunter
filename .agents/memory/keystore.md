---
name: Android Keystore / İmza Durumu (ÇÖZÜLDÜ - kesin tablo)
description: paranormal-hunter Play Store upload key gerçeği, dört anahtar, kayıp 04:B7 key ve çözüm
---

# Android Keystore — Kesin Tablo (13 Haziran 2026 doğrulandı)

Play App Signing AKTİF. Play Console "Uygulama imzalama" sayfasından kullanıcı tarafından okunan kesin değerler:

| Anahtar | SHA1 | SHA256 | Konum/Durum |
|--------|------|--------|-------------|
| Google **app signing** (değişmez) | `99:1E:AF:44:FA:3A:4B:D1:ED:46:F5:80:90:06:26:29:0F:65:AF:30` | — | Google yönetir; `deployment_cert_(3)*.der` |
| Play **upload key** (Play'in İSTEDİĞİ) | `04:B7:A2:FB:C2:92:D6:A0:3C:70:C7:D7:C8:3F:1A:AB:C3:7C:DF:BD` | `89:B8:97:A7:3A:B9:E8:E5:CA:43:91:18:0F:A6:06:B2:B9:06:EE:75:58:20:D9:C0:53:27:7A:F1:CA:8D:BE:27` | **ÖZEL ANAHTAR KAYIP** — repo/git/zip/checkpoint'te yok (silinmiş `keystore/upload-keystore.p12`) |
| **EAS** keystore (tüm 1.0.28 build) | `FD:8D:FA:B7:32:0C:8B:ED:F6:72:83:7F:CF:33:32:09:B9:63:A9:DB` | `8D:F4:CF:16:EC:0E:2F:BE:D6:5A:13:9E:20:ED:88:BB:AA:23:AE:1A:41:ED:92:7B:E9:57:07:51:6E:D3:66:B1` | EAS bulutta güvende; alias `09e7e51f` |
| Yerel **.jks** (iki kopya, 14 Mayıs) | `BB:DD:F1:C6:AB:B5:CC:4E:E7:7B:12:EF:68:10:CE:9D:91:F7:3A:48` | `29:3F:A3:D8:F8:A7:C9:7E:04:0A:75:6A:43:70:E6:C0:AB:1A:23:4F:D0:A5:19:04:D6:16:67:D8:F1:02:44:52` | `paranormal-hunter-upload.jks`, alias `upload`, storepass `AntikGhost2026!`; `upload_cert_(3)*.der` |

## Kök neden (NEDEN sürekli reddediliyordu)
Play'in kayıtlı upload key'i `04:B7...`. EAS ise `FD:8D...` ile imzalıyor. İkisi eşleşmediği için her 1.0.28 yüklemesi reddedildi. Önceki varsayım ("FD:8D doğru") YANLIŞTI — Play App Signing sayfası upload key'i `04:B7...` gösteriyor.

**Why:** Play App Signing aktifken yüklenen AAB, Play'in kayıtlı UPLOAD key'iyle imzalanmalı (app signing key Google'da ayrı). Hata mesajındaki "mevcut APK FD:8D" eski/reset öncesi durumdu; bugünkü gerçek upload key `04:B7...`.

## Çözüm
`04:B7...` özel anahtarı kayıp ve geri getirilemiyor. İki yol:
1. **Kullanıcı `04:B7...` keystore'unu (.jks/.p12) bulursa** (kendi bilgisayarı / GitHub'daki Manus reposu) → EAS'a `credentials.json` ile verilip build alınır.
2. **Upload key reset (kalıcı, ÖNERİLEN):** Play Console → Uygulama bütünlüğü → Uygulama imzalama → "Yükleme anahtarını sıfırla" → `downloads/EAS-upload-certificate-FD8D.pem` (FD:8D EAS cert) yüklenir. Google onaylayınca (≤48s) zaten elde hazır FD:8D 1.0.28 AAB yüklenebilir; sonraki tüm EAS build'leri otomatik çalışır.

## Araçlar (bu ortamda)
- keytool/java YOK. `.jks` okumak için: `pip install pyjks` + Python (`jks.KeyStore.load(path, pass)`).
- AAB imzası: `python zipfile` ile `META-INF/*.RSA` çıkar → `openssl pkcs7 -inform DER -print_certs | openssl x509 -fingerprint`.
- DER cert: `openssl x509 -inform DER -fingerprint -sha1/-sha256`.
