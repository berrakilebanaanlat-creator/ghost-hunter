---
name: iOS Geçiş Planı
description: App Store için iOS build sürecini başlatmak için gereken adımlar ve notlar
---

# iOS Geçiş Planı

## Durum
Henüz başlanmadı. Kullanıcı hazır olduğunda bu dosyayı aç.

## Kullanıcı Durumu
- Sadece Windows bilgisayar ve Android telefon var
- Mac veya iPhone yok
- App Store'a çıkmak istiyor

## Gereksinimler (Kullanıcı Tarafında)
1. **Apple Developer Hesabı** — $99/yıl üyelik aktif olmalı
2. **App Store Connect API Key** — Web tarayıcısından oluşturulur:
   - appstoreconnect.apple.com → Users and Access → Integrations → App Store Connect API → Team Keys → (+)
   - Name: `EAS Build`, Access: `App Manager`
   - 3 şey kaydedilmeli: `.p8` dosyası, Key ID, Issuer ID

## Teknik Bilgiler
- Bundle ID: `com.berrakilebanaanlat.paranormalhunter`
- App slug: `paranormal-hunter`
- EAS account: `antikghost`
- EAS project ID: `086fdd0b-7e97-4ca4-ba88-1a4ef755c9dd`
- EAS CLI: zaten kurulu (dev dependency)
- Credentials source: remote (EAS yönetir)

## Yapılacaklar (Ajan Tarafında)
1. `eas.json` içine iOS production profili ekle
2. `app.json` içinde iOS bundle identifier doğrula
3. `eas credentials` ile Apple API Key'i EAS'a ekle
4. `eas build --platform ios --profile production` ile build başlat
5. Build tamamlanınca `eas submit --platform ios` ile TestFlight'a gönder

## eas.json iOS Profil Örneği
```json
"production": {
  "android": { "buildType": "app-bundle" },
  "ios": {
    "buildType": "release",
    "credentialsSource": "remote"
  }
}
```
