---
name: Build ve Komut Geçmişi
description: Tüm EAS build ID'leri, tetikleme komutları, sonuçlar ve imza bilgileri
---

# Build Geçmişi

## Proje Bilgileri
- EAS Account: `antikghost`
- App slug: `paranormal-hunter`
- EAS Project ID: `086fdd0b-7e97-4ca4-ba88-1a4ef755c9dd`
- Bundle ID (Android): `com.berrakilebanaanlat.paranormalhunter`
- EAS CLI: devDependency olarak kurulu (`artifacts/ghost-hunter/node_modules/.bin/eas`)

## EAS Build Komutu (standart)
```bash
cd artifacts/ghost-hunter
EXPO_TOKEN=$EXPO_TOKEN EAS_NO_VCS=1 EAS_SKIP_AUTO_FINGERPRINT=1 \
  ./node_modules/.bin/eas build --platform android --profile <preview|production> \
  --non-interactive --no-wait
```

## Build Durumu Sorgulama
```bash
EXPO_TOKEN=$EXPO_TOKEN ./node_modules/.bin/eas build:view <BUILD_ID> 2>&1 | grep -i "status\|archive"
```

## Build Listesi
```bash
EXPO_TOKEN=$EXPO_TOKEN ./node_modules/.bin/eas build:list --platform android --limit 10 --non-interactive
```

## Tüm Build'ler

| Build ID | Versiyon | Profil | Tür | Durum | Not |
|----------|----------|--------|-----|-------|-----|
| 2de2fe40-... | 1.0.25 | preview | APK | crash | Orijinal, ~2s'de kapanıyor |
| 217e8e53-... | 1.0.25 | preview | APK | crash | AdMob fix eklendi |
| 20832c24-... | 1.0.25 | preview | APK | crash | AdMob+Firebase fix |
| 8c2340e3-d5f4-4088-81fe-f5cc396810f0 | 1.0.26 | preview | APK | ✅ | react-native-screens 4.16.0 fix |
| 2ca34845-f527-4a09-8154-4da41e8471ab | 1.0.27 | production | AAB | ⚠️ | Crash fix, ama imza uyuşmazlığı |
| 5890495b-8619-435b-... | 1.0.28 (10028) | production | AAB | ✅ D9:EF | Yeni upload key, Google imzayı kabul etti ama POLICY RED: READ_MEDIA izinleri |
| e9ea5e47-... | 1.0.29 (10029) | production | AAB | ❌ ESKI | Önceki oturum, FD:8D + izinler hâlâ var, KULLANMA |
| 88bbdb88-... | 1.0.30 (10030) | production | AAB | ❌ iptal | custom plugin denendi, blockedPermissions lehine iptal |
| 9c9dfe30-e78d-4ac9-ac6b-1b48cd6458ff | 1.0.31 (10031) | production | AAB | ✅✅ FINAL | D9:EF imza DOĞRULANDI + tüm READ_MEDIA izinleri manifest'ten KALKTI (blockedPermissions). Google production'a yüklenecek nihai AAB |

## EAS_NO_VCS arşiv şişmesi (KRİTİK)
- `EAS_NO_VCS=1` modunda eas, tüm working dir'i `.easignore`'a göre arşivler.
- `.easignore` MUTLAKA şunları hariç tutmalı yoksa arşiv 144MB+ olup yükleme TAKILIR:
  `node_modules/`, `downloads/`, `attached_assets/`, `.git/`, `.local/` (950M!), `.cache/` (483M!), `.pythonlibs/`, `.config/`, `.agents/`, diğer artifacts.
- Doğru .easignore ile arşiv ~birkaç MB, yükleme 3 saniye. Yükleme "0 / NNN MB"da takılıyorsa arşiv çok büyüktür → .easignore'u kontrol et.

## Google Play POLICY RED — READ_MEDIA izinleri (10028)
- Google 10028'i reddetti: `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO` izinleri uygulamanın temel amacıyla ilişkili değil.
- Uygulama medyayı SADECE kaydediyor (`MediaLibrary.saveToLibraryAsync`), hiç okumuyor → bu izinlere gerek yok.
- Çözüm: (1) `expo-media-library` plugin'ine `granularPermissions: []`, `isAccessMediaLocationEnabled: false`; (2) özel plugin `plugins/withRemoveAndroidMediaPermissions.js` manifest'ten READ_MEDIA_* + READ_EXTERNAL_STORAGE + ACCESS_MEDIA_LOCATION siler (plugins dizisinin SONUNDA, media-library'den sonra); (3) kodda `MediaLibrary.usePermissions({ writeOnly: true })`.

## İmza Sorunu
- Play Store'daki eski sürüm SHA1: `FD:8D:FA:B7:32:0C:8B:ED:F6:72:83:7F:CF:33:32:09:B9:63:A9:DB`
- Yeni build (2ca34845) SHA1: `04:B7:A2:FB:C2:92:D6:A0:3C:70:C7:D7:C8:3F:1A:AB:C3:7C:0F:BD`
- Çözüm: keystore.md dosyasına bakın

## eas.json Profiller
- `preview`: APK, internal distribution, `credentialsSource: remote`
- `production`: AAB, store distribution, `credentialsSource: remote`

## Düzeltilen Crash'ler (1.0.27)
1. `react-native-screens` 4.24.0 → 4.16.0 (Expo SDK 54 uyumlu)
2. `AudioRecorder.pauseRecording` IllegalStateException → idle recording kaldırıldı
3. `AudioRecorder.record` IllegalStateException → aynı fix
4. `SIGSEGV` libc.so → native MediaRecorder state corruption önlendi
5. AppState listener eklendi → arka plana geçişte recorder güvenli durdurulur
