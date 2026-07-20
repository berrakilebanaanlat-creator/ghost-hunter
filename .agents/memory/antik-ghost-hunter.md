---
name: Antik Ghost Hunter — Proje Durumu
description: Expo mobile app, iOS App Store süreci ve Frekans Tarayıcı geliştirmesi hakkında tüm kritik bilgiler
---

## Uygulama Kimliği
- Bundle ID: `com.berrakilebanaanlat.paranormalhunter`
- ASC App ID: `6784369963`
- EAS account: `antikghost`, project: `paranormal-hunter`
- EAS build profile: `preview` (Android APK)
- iOS version: 1.0.43 (App Store review'da — karar bekleniyor)
- Android version code: 10043

## iOS App Store Durumu
- 1.0.43 App Store Connect'e gönderildi (VOX Yearly aboneliğiyle birlikte)
- Apple'dan karar bekleniyor (kabul veya ret)
- VOX Monthly aboneliği yanlış draft submission'a düştü — Apple kararı sonrası eklenecek
- Apple age rating güncellemesi gerekiyor (son tarih: 7 Eylül 2026)
- Draft Submission (2) bozuk — içinde versiyon yok, yoksay

## Android Build Geçmişi (son başarılı)
- `a88fd1f9-15d8-4e25-a438-018326d24ae7` — cızırtı mute özelliği (FINISHED)
- `c4f64682-433f-4cb9-8a9e-f8b6287f2ad7` — %30 ikinci fısıltı özelliği (build edildi, son hal)
- EAS build komutu: `EXPO_TOKEN=$(printenv EXPO_TOKEN) GIT_INDEX_FILE=/tmp/eas_idxN EXPO_NO_GIT_STATUS=1 EAS_SKIP_AUTO_FINGERPRINT=1 node_modules/.bin/eas build --platform android --profile preview --non-interactive --no-wait`

## Ses Motoru (whisper-engine.ts)
- 604 fısıltı dosyası: `assets/sounds/whispers/whisper_001.mp3` – `whisper_604.mp3`
- 2 arka plan sesi: `base_1.mp3` (53MB), `base_2.mp3` (50MB) — rastgele seçilip loop
- Varsayılan noise volume: 0.2 (slider min: 0.1, max: 1.0)
- Fısıltı aralığı: 50-100 saniye
- Fısıltı çalarken: noise volume 0'a iner, 6 sn sonra geri açılır
- %30 ihtimalle: 0.5-2 sn sonra ikinci fısıltı da çalar

## Yakında Yapılacak
- Kullanıcı 2000 ses daha üretecek → ZIP dosyası olarak gönderecek
- ZIP gelince: `assets/sounds/whispers/` klasörüne eklenir, `whisper-sounds.ts` güncellenir, yeni build
- Apple kararı gelince iOS süreci devam edecek

## Önemli Dosyalar
- `artifacts/ghost-hunter/lib/whisper-engine.ts` — ses motoru
- `artifacts/ghost-hunter/lib/whisper-sounds.ts` — ses listesi (604 dosya)
- `artifacts/ghost-hunter/app/(tabs)/frequency-scanner.tsx` — Frekans Tarayıcı ekranı
- `artifacts/ghost-hunter/app/(tabs)/index.tsx` — ana ekran (araç listesi)
- `artifacts/ghost-hunter/app/(tabs)/_layout.tsx` — tab navigation
- `artifacts/ghost-hunter/eas.json` — EAS build ayarları

## EAS Upload Notu
- Proje arşivi ~416MB (604 ses + 2 base dosyası büyük)
- Upload ~27-28 saniye sürer, timeout 120s kullan
- Bazen compression aşamasında timeout olur — tekrar denince geçer
- `.easignore` dosyası var ama 416MB'ı düşüremiyor (sesler gerekli)

## Kullanıcı Tercihleri
- Samsung Android + Windows (kendi cihazları)
- Apple Developer Program üyesi ($99/yıl)
- Türkçe, kısa, madde madde iletişim
- Teknik bilgi yok — her şeyi sıfırdan açıkla
