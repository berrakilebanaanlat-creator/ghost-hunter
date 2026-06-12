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
