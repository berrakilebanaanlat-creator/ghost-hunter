/**
 * Expo Config Plugin: SoLoader DSO Not Found Error Fix (v2)
 * 
 * Crashlytics: AnaUygulama.onCreate - SoLoaderDSONNotFoundError (16 olay, 11 kullanıcı)
 * Crashlytics: VMClassLoader.findLoadedClass (5 olay, 2 kullanıcı)
 * 
 * Kök neden: Split APK'larda veya eski cihazlarda SoLoader native kütüphaneleri
 * bulamayabiliyor. Bu genellikle şu durumlarda oluşur:
 * - Google Play'den split APK olarak indirme (armeabi-v7a cihazda arm64 DSO eksik)
 * - ProGuard'un SoLoader sınıflarını kırpması
 * - Birden fazla native kütüphanenin aynı .so dosyasını içermesi (conflict)
 *
 * Bu plugin şunları yapar:
 * 1. ProGuard kurallarına SoLoader + JNI + TurboModule keep rules ekler
 * 2. Gradle'a ndk abiFilters ve packagingOptions ekler
 * 3. MainApplication.kt'ye SoLoader.init() çağrısını güçlendirir
 * 4. Gradle'a splits abi config ekler (universalApk = true)
 */
const { withAppBuildGradle, withDangerousMod, withMainApplication } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withSoLoaderFix(config) {
  // 1. ProGuard Rules - SoLoader sınıflarını koru (withDangerousMod ile dosyaya yaz)
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const proguardPath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );

      const soloaderRules = `
# ============================================================
# SoLoader Fix v2 - Prevent DSO Not Found Error & VMClassLoader crash
# ============================================================

# SoLoader core - ASLA kırpma
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }
-dontwarn com.facebook.soloader.**
-dontwarn com.facebook.jni.**

# React Native core native modules
-keep class com.facebook.react.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keepclassmembers class * {
    @com.facebook.react.turbomodule.core.interfaces.TurboModule *;
}
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# Google Mobile Ads - Prevent crash on event emission
-keep class io.invertase.googlemobileads.** { *; }
-dontwarn io.invertase.googlemobileads.**

# expo-audio native module
-keep class expo.modules.audio.** { *; }
-dontwarn expo.modules.audio.**

# expo-iap native module
-keep class expo.modules.iap.** { *; }
-dontwarn expo.modules.iap.**

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# VMClassLoader fix - JNI class loading
-keep class java.lang.VMClassLoader { *; }
-keepclassmembers class * {
    native <methods>;
}
`;

      try {
        let existingContent = '';
        if (fs.existsSync(proguardPath)) {
          existingContent = fs.readFileSync(proguardPath, 'utf8');
        }
        // Eski kuralları temizle ve yenisini yaz
        if (existingContent.includes('SoLoader Fix -')) {
          // Eski bloku kaldır
          existingContent = existingContent.replace(
            /# SoLoader Fix[\s\S]*?(?=\n#[^=]|$)/,
            ''
          );
        }
        if (!existingContent.includes('SoLoader Fix v2')) {
          fs.writeFileSync(proguardPath, existingContent + soloaderRules);
        }
      } catch (e) {
        console.warn('[withSoLoaderFix] ProGuard rules yazma hatası:', e);
      }

      return config;
    },
  ]);

  // 2. app/build.gradle - ndk abiFilters, packagingOptions ve splits ekle
  config = withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
    
    // ndk abiFilters ekle (defaultConfig bloğuna)
    if (!buildGradle.includes('abiFilters')) {
      const defaultConfigRegex = /defaultConfig\s*\{/;
      if (defaultConfigRegex.test(buildGradle)) {
        buildGradle = buildGradle.replace(
          defaultConfigRegex,
          `defaultConfig {
        ndk {
            abiFilters "armeabi-v7a", "arm64-v8a", "x86_64"
        }`
        );
      }
    }
    
    // packagingOptions - SoLoader .so dosyalarını dahil et (genişletilmiş)
    if (!buildGradle.includes('pickFirst')) {
      if (buildGradle.includes('android {')) {
        buildGradle = buildGradle.replace(
          /android\s*\{/,
          `android {
    packagingOptions {
        pickFirst '**/libc++_shared.so'
        pickFirst '**/libfbjni.so'
        pickFirst '**/libreactnative.so'
        pickFirst '**/libjsi.so'
        pickFirst '**/libhermes.so'
        pickFirst '**/libturbomodulejsijni.so'
    }`
        );
      }
    }

    // splits abi - universalApk = true (tüm mimarileri içeren APK)
    // Bu, split APK sorunlarını önler
    if (!buildGradle.includes('splits')) {
      if (buildGradle.includes('android {')) {
        buildGradle = buildGradle.replace(
          /android\s*\{/,
          `android {
    splits {
        abi {
            reset()
            enable true
            universalApk true
            include "armeabi-v7a", "arm64-v8a", "x86_64"
        }
    }`
        );
      }
    }
    
    config.modResults.contents = buildGradle;
    return config;
  });

  // 3. MainApplication - SoLoader.init() güçlendirmesi
  // withMainApplication ile onCreate'e ek koruma ekle
  try {
    config = withMainApplication(config, (config) => {
      let mainApp = config.modResults.contents;
      
      // SoLoader.init() çağrısının try-catch ile sarılı olduğundan emin ol
      // Eğer zaten try-catch varsa dokunma
      if (!mainApp.includes('SoLoader.init') || mainApp.includes('try {') ) {
        // Zaten düzgün yapılandırılmış veya Expo tarafından yönetiliyor
        // Müdahale etme
      } else {
        // SoLoader.init() çağrısını try-catch ile sar
        mainApp = mainApp.replace(
          /SoLoader\.init\(this,\s*false\)/,
          `try { SoLoader.init(this, false) } catch (e: Exception) { android.util.Log.e("SoLoader", "SoLoader init failed", e) }`
        );
        config.modResults.contents = mainApp;
      }
      
      return config;
    });
  } catch (e) {
    // withMainApplication mevcut değilse (Expo versiyon farkı), sessizce geç
    console.warn('[withSoLoaderFix] MainApplication mod atlandı:', e.message);
  }

  return config;
}

module.exports = withSoLoaderFix;
