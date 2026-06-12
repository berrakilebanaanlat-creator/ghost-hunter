---
name: Android Keystore / İmza Durumu
description: Play Store imza uyuşmazlığı sorunu, kök neden ve çözüm adımları
---

# Android Keystore Durumu

## Sorun
Play Store'a 1.0.27 AAB yüklenirken imza uyuşmazlığı hatası:
- **Play Store'daki mevcut imza SHA1:** `FD:8D:FA:B7:32:0C:8B:ED:F6:72:83:7F:CF:33:32:09:B9:63:A9:DB`
- **Yeni build imzası SHA1:** `04:B7:A2:FB:C2:92:D6:A0:3C:70:C7:D7:C8:3F:1A:AB:C3:7C:0F:BD`

## Kök Neden
EAS `credentialsSource: remote` kullanıyor. Build `2ca34845` farklı bir keystore ile imzalandı — muhtemelen EAS hesabında birden fazla keystore var veya credentials yenilendi.

## Çözüm Yolları

### Yol 1: Google Play Console'dan Upload Key Sıfırlama (ÖNERİLEN)
Google Play, **App Signing** özelliğiyle upload key'i değiştirmeye izin verir:
1. Play Console → Uygulama → Sürüm → Kurulum → Uygulama imzalama
2. "Upload key sertifikasını yenile" seçeneği
3. Yeni upload key'in SHA1'ini (`04:B7...`) Google'a bildirin
4. Bu işlem için Google'a resmi form doldurulur

### Yol 2: Eski Keystore'u EAS'a Eklemek
Eğer orijinal .jks dosyası varsa:
```bash
cd artifacts/ghost-hunter
EXPO_TOKEN=$EXPO_TOKEN ./node_modules/.bin/eas credentials --platform android
# → "Use existing keystore" seç → .jks dosyasını yükle
```

### Yol 3: EAS'taki Eski Build Credentials'ı Bulmak
```bash
EXPO_TOKEN=$EXPO_TOKEN ./node_modules/.bin/eas credentials --platform android --profile production
```
EAS'ta birden fazla keystore varsa eskisini seçmek mümkün olabilir.

## Önemli Not
**Why:** Android uygulamaları Play Store'a ilk yüklendiğinde kullanılan keystore sonsuza kadar değiştirilemez (Google Play App Signing olmadıkça). Google Play App Signing aktifse upload key değiştirilebilir.

**How to apply:** Kullanıcı Play Console'a girip "Uygulama imzalama" sayfasını kontrol etmeli. Eğer Google Play App Signing aktifse Yol 1 uygulanabilir.
