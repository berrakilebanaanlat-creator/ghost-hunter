# Antik Ghost App — v1.0.20 Sürüm Notları

---

## Türkçe

### Yenilikler
- **Kanıt Duvarı (Evidence Wall):** SLS görüntüleri, EVP ses kayıtları ve EMF pik değerlerini tarih/saat damgasıyla arşivleyin. Gerçek bir dedektörün arşiv bölümü gibi tasarlandı.
- **Açılış Reklamı (App Open Ad):** Uygulama açılışında tam ekran reklam desteği eklendi.
- **Ödüllü Reklam:** Kanıt Duvarı'ndaki eski kayıtları görüntülemek için reklam izleme seçeneği.

### Performans İyileştirmeleri
- **ANR Düzeltmesi:** Radar, SLS Kamera ve EMF ekranlarındaki ağır işlemler arka plana taşındı. Artık "Uygulama yanıt vermiyor" hatası almayacaksınız.
- **Bellek Optimizasyonu:** Uzun süreli kullanımda RAM tüketimi azaltıldı.
- **Reklam Açılış Hızı:** Reklamlar uygulama açılışını yavaşlatmayacak şekilde geciktirildi.

### Kararlılık
- **Reklam Hata Yönetimi:** Reklam yüklenemezse uygulama çökmez, otomatik yeniden deneme yapar.
- **Firebase Crashlytics:** Hata raporlama sistemi eklendi, sorunlar anında tespit edilecek.

### Teknik
- Android 14/15 enerji tasarrufu modunda sensör devamlılığı sağlandı.
- 4 yeni AdMob reklam birimi entegre edildi.

---

## English

### What's New
- **Evidence Wall:** Archive your SLS images, EVP audio recordings, and EMF peak values with timestamps. Designed to feel like a real investigator's archive.
- **App Open Ad:** Full-screen ad support when the app launches.
- **Rewarded Ad:** Watch an ad to unlock older evidence records.

### Performance Improvements
- **ANR Fix:** Heavy processing on Radar, SLS Camera, and EMF screens moved to background threads. No more "App Not Responding" errors.
- **Memory Optimization:** Reduced RAM consumption during extended use.
- **Ad Cold Start:** Ad loading is deferred so it doesn't slow down app launch.

### Stability
- **Ad Error Handling:** If an ad fails to load, the app won't crash — it retries automatically with exponential backoff.
- **Firebase Crashlytics:** Error reporting system added for instant issue detection.

### Technical
- Android 14/15 energy saver mode no longer interrupts sensor data flow.
- 4 new AdMob ad units integrated.
