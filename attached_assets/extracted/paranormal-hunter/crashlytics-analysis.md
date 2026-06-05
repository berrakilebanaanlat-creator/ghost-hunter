# Crashlytics Ses Hatası Analizi

## Hatalar (v1.0.20)
1. SesKaydedici.kaydet - IllegalStateException (7 olay, 5 kullanıcı) - AudioRecorder.kt:94
2. SesKaydedici.KaydiDurdur - IllegalStateException (3 olay, 2 kullanıcı) - AudioRecorder.kt:138
3. SesKaydedici.kaydet - RuntimeException "devam etme başarısız" (2 olay, 1 kullanıcı) - AudioRecorder.kt:94
4. SesKaydedici.KaydiDurdur - RuntimeException "duraklatma başarısız" (1 olay, 1 kullanıcı) - AudioRecorder.kt:138

## Kök Neden
- expo-audio modülünün native AudioRecorder.kt dosyasındaki hatalar
- Kayıt başlatılmadan stop() çağrılması veya zaten durmuşken tekrar stop()
- Mikrofon izni olmadan kayıt başlatma girişimi
- State senkronizasyon sorunu: JS tarafı "recording" sanırken native taraf farklı durumda

## Etkilenen Dosyalar
1. app/(tabs)/evp.tsx - EVP ekranı (useAudioRecorder hook)
2. lib/evp-audio-recorder.ts - Yardımcı modül (aynı mantık)
3. lib/screen-recorder.ts - VOX ekran kaydı (web only, native'de sorun yok)
4. lib/itc-voice-engine.ts - VOX mikrofon (web API, native'de simüle)

## Düzeltme Planı
- evp.tsx: Ek güvenlik katmanları ekle
  - audioRecorder.isRecording kontrolü stop'tan önce
  - prepareToRecordAsync öncesi mevcut kaydı temizle
  - Tüm native çağrıları try-catch ile sar
  - Kullanıcıya hata mesajı göster (Alert)
