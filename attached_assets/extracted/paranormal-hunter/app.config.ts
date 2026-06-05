// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

const bundleId = "com.berrakilebanaanlat.paranormalhunter";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  appName: "Antik Ghost App",
  appSlug: "paranormal-hunter",
  logoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663453478067/7vzrHb6AQT7gzoHG8Mz2RC/antik-ghost-icon-iMvFdU7qJNqeyK5358tc8J.png",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.22",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "dark",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
  },
  android: {
    versionCode: 10022,
    googleServicesFile: "./google-services.json",
    adaptiveIcon: {
      backgroundColor: "#0A0A0F",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: [
      "POST_NOTIFICATIONS",
      "RECORD_AUDIO",
      "CAMERA",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_MEDIA_PLAYBACK",
      "FOREGROUND_SERVICE_CAMERA",
      "FOREGROUND_SERVICE_MICROPHONE",
      "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
      "WAKE_LOCK",
    ],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: env.scheme, host: "*" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "./plugins/withSoLoaderFix",
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a", "x86_64"],
          enableProguardInReleaseBuilds: true,
          extraProguardRules: "-keep class com.facebook.soloader.** { *; }\n-keep class com.facebook.jni.** { *; }\n-dontwarn com.facebook.soloader.**",
        },
      },
    ],
    "expo-router",
    "@react-native-firebase/app",
    "@react-native-firebase/crashlytics",
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-2683215724092307~4306569029",
        iosAppId: "ca-app-pub-2683215724092307~4306569029",
      },
    ],
    "expo-iap",
    [
      "expo-camera",
      {
        cameraPermission: "Paranormal tarama için kameraya erişim gereklidir.",
        microphonePermission: "Video kayıt için mikrofona erişim gereklidir.",
        recordAudioAndroid: true,
      },
    ],
    [
      "expo-audio",
      {
        microphonePermission: "Paranormal Hunter'ın mikrofona erişmesine izin verin.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#0A0A0F",
        dark: {
          backgroundColor: "#0A0A0F",
        },
      },
    ],
    [
      "expo-media-library",
      {
        photosPermission: "SLS taramalarını kaydetmek için galeri erişimi gereklidir.",
        savePhotosPermission: "SLS fotoğraflarını kaydetmek için izin gereklidir.",
        isAccessMediaLocationEnabled: true,
      },
    ],
    [
      "expo-navigation-bar",
      {
        backgroundColor: "#0A0A0F",
        barStyle: "light",
        position: "absolute",
      },
    ],
  ],
  extra: {
    eas: {
      projectId: "086fdd0b-7e97-4ca4-ba88-1a4ef755c9dd",
    },
  },
  owner: "antikghost",
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
