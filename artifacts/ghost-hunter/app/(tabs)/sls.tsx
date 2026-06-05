import { useState, useEffect, useRef, useCallback } from "react";
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
  Alert,
  InteractionManager,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AdBanner } from "@/components/ad-banner";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import Svg, { Circle, Line, Rect, Defs, LinearGradient, Stop } from "react-native-svg";
import { t } from "@/lib/i18n";
import {
  getSLSEngine,
  SKELETON_BONES,
  type SkeletonFigure,
  type PointCloudDot,
} from "@/lib/sls-skeleton-engine";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CAMERA_HEIGHT = SCREEN_HEIGHT * 0.55;

// SLS yeşil renk paleti
const SLS_GREEN = "#00FF88";
const SLS_GREEN_DIM = "#00CC66";
const SLS_GREEN_GLOW = "#00FF8844";
const SLS_DOT_COLOR = "#00FF8833";
const SLS_BONE_COLOR = "#00FF88";
const SLS_JOINT_COLOR = "#FFFFFF";

// Isı haritası renkleri
const THERMAL_COLORS = ["#0000FF", "#00FFFF", "#00FF00", "#FFFF00", "#FF8800", "#FF0000"];

type ViewMode = "sls" | "thermal";

// ANR FIX: Animasyon frame'lerini tek bir RAF loop'unda yönet
// Bu sayede UI thread bloklanmaz
function useAnimationFrame(callback: (deltaTime: number) => void, isActive: boolean) {
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      previousTimeRef.current = null;
      return;
    }

    const animate = (time: number) => {
      if (previousTimeRef.current !== null) {
        const deltaTime = time - previousTimeRef.current;
        callback(deltaTime);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      previousTimeRef.current = null;
    };
  }, [isActive, callback]);
}

export default function SLSScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [figures, setFigures] = useState<SkeletonFigure[]>([]);
  const [pointCloud, setPointCloud] = useState<PointCloudDot[]>([]);
  const [totalDetections, setTotalDetections] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sensitivity, setSensitivity] = useState(0.5);
  const [scanLineY, setScanLineY] = useState(0);
  const [gridPulse, setGridPulse] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("sls");
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
  const [photoFlash, setPhotoFlash] = useState(false);
  const [thermalPulse, setThermalPulse] = useState(0);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  const cameraRef = useRef<CameraView>(null);
  const engineRef = useRef(getSLSEngine());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ANR FIX: Animasyon değerlerini ref'lerde tut, batch state update yap
  const scanLineAccRef = useRef(0);
  const gridPulseAccRef = useRef(0);
  const thermalPulseAccRef = useRef(0);
  const lastStateUpdateRef = useRef(0);

  // Kamera izni iste
  useEffect(() => {
    if (!cameraPermission?.granted) {
      requestCameraPermission();
    }
  }, [cameraPermission]);

  // Tarama başlat/durdur
  const toggleScanning = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (isScanning) {
      engineRef.current.stop();
      setIsScanning(false);
      setFigures([]);
      setPointCloud([]);
    } else {
      if (!cameraPermission?.granted) {
        requestCameraPermission();
        return;
      }
      engineRef.current.setSensitivity(sensitivity);
      engineRef.current.start(
        (newFigures) => {
          setFigures(newFigures);
          setTotalDetections(engineRef.current.getTotalDetections());

          if (newFigures.length > 0 && Platform.OS !== "web") {
            const highConfidence = newFigures.some((f) => f.opacity > 0.7);
            if (highConfidence) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
          }
        },
        (dots) => setPointCloud(dots)
      );
      setIsScanning(true);
      setElapsedTime(0);
      // Reset animation accumulators
      scanLineAccRef.current = 0;
      gridPulseAccRef.current = 0;
      thermalPulseAccRef.current = 0;
    }
  }, [isScanning, sensitivity, cameraPermission]);

  // Süre sayacı - 1 saniye interval (hafif, ANR riski yok)
  useEffect(() => {
    if (isScanning) {
      timerRef.current = setInterval(() => {
        setElapsedTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isScanning]);

  // ANR FIX: Tüm animasyonları tek bir requestAnimationFrame loop'unda birleştir
  // Bu, 3 ayrı setInterval (30ms, 50ms, 50ms) yerine tek bir RAF kullanır
  // RAF doğal olarak 16ms'de bir çalışır ve UI thread'i bloklamaz
  const handleAnimationFrame = useCallback((deltaTime: number) => {
    const now = performance.now();

    // Scan line: her 30ms'de 2 birim ilerle
    scanLineAccRef.current += deltaTime;
    if (scanLineAccRef.current >= 30) {
      const steps = Math.floor(scanLineAccRef.current / 30);
      scanLineAccRef.current -= steps * 30;
      setScanLineY((prev) => (prev + steps * 2) % 100);
    }

    // Grid pulse: her 50ms'de 1 birim ilerle
    gridPulseAccRef.current += deltaTime;
    if (gridPulseAccRef.current >= 50) {
      const steps = Math.floor(gridPulseAccRef.current / 50);
      gridPulseAccRef.current -= steps * 50;
      setGridPulse((prev) => (prev + steps) % 100);
    }

    // Thermal pulse: her 50ms'de 1 birim ilerle (sadece thermal modda)
    if (viewMode === "thermal") {
      thermalPulseAccRef.current += deltaTime;
      if (thermalPulseAccRef.current >= 50) {
        const steps = Math.floor(thermalPulseAccRef.current / 50);
        thermalPulseAccRef.current -= steps * 50;
        setThermalPulse((prev) => (prev + steps) % 200);
      }
    }
  }, [viewMode]);

  // ANR FIX: Tek RAF loop'u kullan
  useAnimationFrame(handleAnimationFrame, isScanning);

  // Cleanup
  useEffect(() => {
    return () => {
      engineRef.current.stop();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Hassasiyet değiştir
  const cycleSensitivity = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const levels = [0.3, 0.5, 0.7, 0.9];
    const currentIdx = levels.indexOf(sensitivity);
    const nextIdx = (currentIdx + 1) % levels.length;
    const newSens = levels[nextIdx];
    setSensitivity(newSens);
    engineRef.current.setSensitivity(newSens);
  };

  const getSensitivityLabel = () => {
    if (sensitivity <= 0.3) return t("emf.low").toUpperCase();
    if (sensitivity <= 0.5) return t("emf.medium").toUpperCase();
    if (sensitivity <= 0.7) return t("emf.high").toUpperCase();
    return "MAX";
  };

  // Kamera çevirme
  const flipCamera = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  // Görünüm modu değiştir
  const toggleViewMode = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setViewMode((prev) => (prev === "sls" ? "thermal" : "sls"));
  };

  // Fotoğraf çek - SDK 54: takePictureAsync -> PictureRef -> savePictureAsync -> PhotoResult.uri
  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || !isCameraReady) return;

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Flash efekti
    setPhotoFlash(true);
    setTimeout(() => setPhotoFlash(false), 200);

    try {
      // takePictureAsync -> fotoğraf URI'si al
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
        exif: false,
      });

      if (!photo) return;

      // PictureRef ise savePictureAsync ile URI al, değilse doğrudan uri kullan
      let photoUri: string | undefined;
      if (typeof (photo as any).savePictureAsync === "function") {
        const saved = await (photo as any).savePictureAsync({ quality: 0.85 });
        photoUri = saved?.uri;
      } else {
        photoUri = (photo as any).uri;
      }

      if (photoUri) {
        // Galeri izni kontrol et ve kaydet
        if (!mediaPermission?.granted) {
          const perm = await requestMediaPermission();
          if (!perm?.granted) {
            Alert.alert("İzin Gerekli", "Fotoğrafı kaydetmek için galeri izni gereklidir.");
            return;
          }
        }

        try {
          await MediaLibrary.saveToLibraryAsync(photoUri);
          setLastPhotoUri(photoUri);
          setTimeout(() => setLastPhotoUri(null), 3000);
        } catch (saveError) {
          console.log("Galeri kayıt hatası:", saveError);
          setLastPhotoUri(photoUri);
          setTimeout(() => setLastPhotoUri(null), 3000);
        }
      }
    } catch (error) {
      console.log("Fotoğraf çekme hatası:", error);
    }
  }, [isCameraReady, mediaPermission]);

  // Video kayıt başlat/durdur
  const toggleVideoRecording = useCallback(async () => {
    if (!cameraRef.current || !isCameraReady) return;
    if (isRecordingVideo) {
      // Video kaydını durdur
      cameraRef.current.stopRecording();
      setIsRecordingVideo(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      // Video kaydını başlat
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setIsRecordingVideo(true);

      try {
        const video = await cameraRef.current.recordAsync({
          maxDuration: 120,
        });

        // recordAsync, stopRecording çağrıldığında resolve olur
        if (video?.uri) {
          // Galeri izni kontrol et
          if (!mediaPermission?.granted) {
            const perm = await requestMediaPermission();
            if (!perm?.granted) {
              Alert.alert("İzin Gerekli", "Videoyu kaydetmek için galeri izni gereklidir.");
              setIsRecordingVideo(false);
              return;
            }
          }

          try {
            await MediaLibrary.saveToLibraryAsync(video.uri);
            Alert.alert("Video Kaydedildi", "Video galeriye kaydedildi.");
          } catch (saveError) {
            console.log("Video galeri kayıt hatası:", saveError);
          }
        }
      } catch (error) {
        console.log("Video kayıt hatası:", error);
      }
      setIsRecordingVideo(false);
    }
  }, [isCameraReady, isRecordingVideo, mediaPermission]);

  // Kamera izni yoksa izin ekranı göster
  if (!cameraPermission) {
    return (
      <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Kamera izni yükleniyor...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
        <View style={styles.permissionContainer}>
          <IconSymbol name="camera.fill" size={48} color="#2A2A40" />
          <Text style={styles.permissionTitle}>KAMERA İZNİ GEREKLİ</Text>
          <Text style={styles.permissionText}>
            SLS taraması için kameraya erişim izni vermeniz gerekmektedir.
          </Text>
          <Pressable
            onPress={requestCameraPermission}
            style={({ pressed }) => [
              styles.permissionButton,
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.permissionButtonText}>İZİN VER</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <View style={styles.container}>
        {/* Üst Bilgi Çubuğu */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>
              {viewMode === "sls" ? t("sls.title") : t("sls.thermal").toUpperCase()}
            </Text>
            <Text style={styles.headerSubtitle}>
              {viewMode === "sls" ? t("sls.structuredLight") : t("sls.heatMap")}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.statusDot, isScanning && styles.statusDotActive]} />
            <Text style={styles.headerTime}>{formatTime(elapsedTime)}</Text>
          </View>
        </View>

        {/* Kamera Görüntü Alanı */}
        <View style={styles.cameraContainer}>
          {/* Gerçek Kamera */}
          <CameraView
            ref={cameraRef}
            style={styles.cameraView}
            facing={facing}
            onCameraReady={() => setIsCameraReady(true)}
          >
            {/* SLS Overlay */}
            {isScanning && viewMode === "sls" && (
              <Svg
                width={SCREEN_WIDTH}
                height={CAMERA_HEIGHT}
                style={StyleSheet.absoluteFill}
              >
                {/* Grid overlay */}
                {Array.from({ length: 12 }, (_, i) => {
                  const x = (SCREEN_WIDTH / 12) * (i + 1);
                  const pulseOpacity = 0.04 + Math.sin((gridPulse + i * 8) * 0.06) * 0.02;
                  return (
                    <Line
                      key={`vg${i}`}
                      x1={x} y1={0} x2={x} y2={CAMERA_HEIGHT}
                      stroke={SLS_GREEN} strokeWidth={0.5} opacity={pulseOpacity}
                    />
                  );
                })}
                {Array.from({ length: 8 }, (_, i) => {
                  const y = (CAMERA_HEIGHT / 8) * (i + 1);
                  const pulseOpacity = 0.04 + Math.sin((gridPulse + i * 10) * 0.06) * 0.02;
                  return (
                    <Line
                      key={`hg${i}`}
                      x1={0} y1={y} x2={SCREEN_WIDTH} y2={y}
                      stroke={SLS_GREEN} strokeWidth={0.5} opacity={pulseOpacity}
                    />
                  );
                })}

                {/* Tarama çizgisi */}
                <Rect
                  x={0} y={(scanLineY / 100) * CAMERA_HEIGHT}
                  width={SCREEN_WIDTH} height={3}
                  fill={SLS_GREEN} opacity={0.3}
                />

                {/* Nokta bulutu */}
                {pointCloud.map((dot, idx) => (
                  <Circle
                    key={`pc${idx}`}
                    cx={dot.x * SCREEN_WIDTH} cy={dot.y * CAMERA_HEIGHT}
                    r={dot.size} fill={SLS_DOT_COLOR} opacity={dot.intensity * 0.6}
                  />
                ))}

                {/* İskelet figürleri */}
                {figures.map((figure) => (
                  <SkeletonOverlay
                    key={figure.id}
                    figure={figure}
                    width={SCREEN_WIDTH}
                    height={CAMERA_HEIGHT}
                  />
                ))}
              </Svg>
            )}

            {/* Termal Overlay */}
            {isScanning && viewMode === "thermal" && (
              <View style={styles.thermalOverlay}>
                <Svg
                  width={SCREEN_WIDTH}
                  height={CAMERA_HEIGHT}
                  style={StyleSheet.absoluteFill}
                >
                  <Defs>
                    <LinearGradient id="thermalGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#FF0000" stopOpacity="0.15" />
                      <Stop offset="0.3" stopColor="#FF8800" stopOpacity="0.1" />
                      <Stop offset="0.5" stopColor="#FFFF00" stopOpacity="0.05" />
                      <Stop offset="0.7" stopColor="#00FF00" stopOpacity="0.08" />
                      <Stop offset="1" stopColor="#0000FF" stopOpacity="0.15" />
                    </LinearGradient>
                  </Defs>
                  <Rect
                    x={0} y={0}
                    width={SCREEN_WIDTH} height={CAMERA_HEIGHT}
                    fill="url(#thermalGrad)" opacity={0.6}
                  />

                  {/* Termal noktalar - sıcak bölgeler */}
                  {pointCloud.slice(0, 40).map((dot, idx) => {
                    const colorIdx = Math.floor(dot.intensity * (THERMAL_COLORS.length - 1));
                    const color = THERMAL_COLORS[Math.min(colorIdx, THERMAL_COLORS.length - 1)];
                    const pulse = Math.sin((thermalPulse + idx * 7) * 0.08) * 0.3;
                    return (
                      <Circle
                        key={`th${idx}`}
                        cx={dot.x * SCREEN_WIDTH}
                        cy={dot.y * CAMERA_HEIGHT}
                        r={dot.size * 4 + pulse * 3}
                        fill={color}
                        opacity={0.2 + dot.intensity * 0.3 + pulse * 0.1}
                      />
                    );
                  })}

                  {/* Figürler termal modda kırmızı/turuncu */}
                  {figures.map((figure) => (
                    <ThermalSkeletonOverlay
                      key={`thermal_${figure.id}`}
                      figure={figure}
                      width={SCREEN_WIDTH}
                      height={CAMERA_HEIGHT}
                    />
                  ))}

                  {/* Tarama çizgisi (termal) */}
                  <Rect
                    x={0} y={(scanLineY / 100) * CAMERA_HEIGHT}
                    width={SCREEN_WIDTH} height={2}
                    fill="#FF4400" opacity={0.4}
                  />
                </Svg>

                {/* Termal renk skalası */}
                <View style={styles.thermalScale}>
                  <Text style={styles.thermalScaleLabel}>SICAK</Text>
                  <View style={styles.thermalScaleBar}>
                    {THERMAL_COLORS.slice().reverse().map((color, i) => (
                      <View key={i} style={[styles.thermalScaleSegment, { backgroundColor: color }]} />
                    ))}
                  </View>
                  <Text style={styles.thermalScaleLabel}>SOĞUK</Text>
                </View>
              </View>
            )}

            {/* Tarama durumu mesajı */}
            {!isScanning && (
              <View style={styles.cameraPlaceholder}>
                <IconSymbol name="viewfinder" size={48} color="#1A1A2E" />
                <Text style={styles.placeholderText}>{t("sls.start")}</Text>
                <Text style={styles.placeholderSubtext}>
                  {t("sls.startScan")}
                </Text>
              </View>
            )}

            {/* Algılama bildirimi */}
            {isScanning && figures.length > 0 && (
              <View style={[
                styles.detectionBanner,
                viewMode === "thermal" && styles.detectionBannerThermal,
              ]}>
                <View style={[
                  styles.detectionDot,
                  viewMode === "thermal" && { backgroundColor: "#FF4400" },
                ]} />
                <Text style={[
                  styles.detectionText,
                  viewMode === "thermal" && { color: "#FF4400" },
                ]}>
                  {figures.length} {t("sls.detected")}
                </Text>
              </View>
            )}

            {/* Fotoğraf flash efekti */}
            {photoFlash && <View style={styles.flashOverlay} />}

            {/* Fotoğraf kaydedildi bildirimi */}
            {lastPhotoUri && (
              <View style={styles.photoSavedBanner}>
                <IconSymbol name="camera.fill" size={14} color="#00FF88" />
                <Text style={styles.photoSavedText}>{t("sls.capture").toUpperCase()}</Text>
              </View>
            )}

            {/* Köşe işaretleri (viewfinder) */}
            <View style={[styles.cornerMark, styles.cornerTL]} />
            <View style={[styles.cornerMark, styles.cornerTR]} />
            <View style={[styles.cornerMark, styles.cornerBL]} />
            <View style={[styles.cornerMark, styles.cornerBR]} />
          </CameraView>
        </View>

        {/* İstatistik Çubuğu */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalDetections}</Text>
            <Text style={styles.statLabel}>{t("radar.detected").toUpperCase()}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{figures.length}</Text>
            <Text style={styles.statLabel}>{t("vox.activity").toUpperCase()}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{getSensitivityLabel()}</Text>
            <Text style={styles.statLabel}>{t("vox.sensitivity").toUpperCase().slice(0, 6)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[
              styles.statValue,
              viewMode === "thermal" && { color: "#FF4400" },
            ]}>
              {viewMode === "sls" ? "SLS" : t("sls.thermal").toUpperCase()}
            </Text>
            <Text style={styles.statLabel}>MODE</Text>
          </View>
        </View>

        {/* Kontrol Paneli */}
        <View style={styles.controls}>
          {/* Hassasiyet */}
          <Pressable
            onPress={cycleSensitivity}
            style={({ pressed }) => [
              styles.controlButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="antenna.radiowaves.left.and.right" size={20} color={SLS_GREEN_DIM} />
            <Text style={styles.controlLabel}>{t("vox.sensitivity").toUpperCase().slice(0, 6)}</Text>
          </Pressable>

          {/* Mod değiştir */}
          <Pressable
            onPress={toggleViewMode}
            style={({ pressed }) => [
              styles.controlButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol
              name="chart.bar.fill"
              size={20}
              color={viewMode === "thermal" ? "#FF4400" : SLS_GREEN_DIM}
            />
            <Text style={[
              styles.controlLabel,
              viewMode === "thermal" && { color: "#FF4400" },
            ]}>
              {viewMode === "sls" ? t("sls.thermal").toUpperCase() : "SLS"}
            </Text>
          </Pressable>

          {/* Ana Tarama Butonu */}
          <Pressable
            onPress={toggleScanning}
            style={({ pressed }) => [
              styles.scanButton,
              isScanning && styles.scanButtonActive,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <View style={[styles.scanButtonInner, isScanning && styles.scanButtonInnerActive]}>
              {isScanning ? (
                <IconSymbol name="stop.fill" size={28} color="#0A0A0F" />
              ) : (
                <IconSymbol name="viewfinder" size={28} color="#0A0A0F" />
              )}
            </View>
          </Pressable>

          {/* Fotoğraf çek */}
          <Pressable
            onPress={isScanning ? takePhoto : undefined}
            style={({ pressed }) => [
              styles.controlButton,
              !isScanning && { opacity: 0.3 },
              pressed && isScanning && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="camera.fill" size={20} color={isScanning ? "#FFFFFF" : "#2A2A40"} />
            <Text style={styles.controlLabel}>{t("sls.capture").toUpperCase()}</Text>
          </Pressable>

          {/* Video kaydet */}
          <Pressable
            onPress={isScanning ? toggleVideoRecording : undefined}
            style={({ pressed }) => [
              styles.controlButton,
              !isScanning && { opacity: 0.3 },
              isRecordingVideo && { backgroundColor: "#FF333320", borderColor: "#FF333340" },
              pressed && isScanning && { opacity: 0.7 },
            ]}
          >
            <IconSymbol
              name={isRecordingVideo ? "stop.fill" : "video.fill"}
              size={20}
              color={isRecordingVideo ? "#FF3333" : isScanning ? "#FFFFFF" : "#2A2A40"}
            />
            <Text style={[styles.controlLabel, isRecordingVideo && { color: "#FF3333" }]}>
              {isRecordingVideo ? t("sls.stop") : "VIDEO"}
            </Text>
          </Pressable>

          {/* Kamera çevirme */}
          <Pressable
            onPress={flipCamera}
            style={({ pressed }) => [
              styles.controlButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="arrow.triangle.2.circlepath.camera" size={20} color={SLS_GREEN_DIM} />
            <Text style={styles.controlLabel}>{t("sls.switchCamera").toUpperCase().slice(0, 6)}</Text>
          </Pressable>
        </View>

        {/* Alt Bilgi */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isScanning ? t("sls.scanning") : t("sls.startScan")}
          </Text>
        </View>
      </View>
      <AdBanner />
    </ScreenContainer>
  );
}

// İskelet figürü çizim bileşeni (SLS modu)
function SkeletonOverlay({
  figure,
  width,
  height,
}: {
  figure: SkeletonFigure;
  width: number;
  height: number;
}) {
  const { joints, opacity } = figure;

  return (
    <>
      {SKELETON_BONES.map(([from, to], idx) => {
        const j1 = joints[from];
        const j2 = joints[to];
        if (!j1 || !j2 || !j1.visible || !j2.visible) return null;

        return (
          <Line
            key={`bone_${figure.id}_${idx}`}
            x1={j1.x * width} y1={j1.y * height}
            x2={j2.x * width} y2={j2.y * height}
            stroke={SLS_BONE_COLOR} strokeWidth={2.5}
            opacity={opacity * 0.9} strokeLinecap="round"
          />
        );
      })}

      {Object.entries(joints).map(([name, joint]) => {
        if (!joint.visible) return null;
        const isHead = name === "head";
        const r = isHead ? 8 : 4;

        return (
          <Circle
            key={`joint_${figure.id}_${name}`}
            cx={joint.x * width} cy={joint.y * height}
            r={r} fill={SLS_JOINT_COLOR} opacity={opacity}
            stroke={SLS_GREEN} strokeWidth={1.5}
          />
        );
      })}

      {joints.head && joints.head.visible && (
        <Circle
          cx={joints.head.x * width} cy={joints.head.y * height}
          r={14} fill="none" stroke={SLS_GREEN_GLOW}
          strokeWidth={3} opacity={opacity * 0.5}
        />
      )}
    </>
  );
}

// İskelet figürü çizim bileşeni (Termal modu)
function ThermalSkeletonOverlay({
  figure,
  width,
  height,
}: {
  figure: SkeletonFigure;
  width: number;
  height: number;
}) {
  const { joints, opacity } = figure;

  return (
    <>
      {SKELETON_BONES.map(([from, to], idx) => {
        const j1 = joints[from];
        const j2 = joints[to];
        if (!j1 || !j2 || !j1.visible || !j2.visible) return null;

        return (
          <Line
            key={`tbone_${figure.id}_${idx}`}
            x1={j1.x * width} y1={j1.y * height}
            x2={j2.x * width} y2={j2.y * height}
            stroke="#FF4400" strokeWidth={3}
            opacity={opacity * 0.85} strokeLinecap="round"
          />
        );
      })}

      {Object.entries(joints).map(([name, joint]) => {
        if (!joint.visible) return null;
        const isHead = name === "head";
        const r = isHead ? 10 : 5;

        return (
          <Circle
            key={`tjoint_${figure.id}_${name}`}
            cx={joint.x * width} cy={joint.y * height}
            r={r} fill="#FF0000" opacity={opacity * 0.9}
            stroke="#FFAA00" strokeWidth={2}
          />
        );
      })}

      {/* Baş etrafında sıcak glow */}
      {joints.head && joints.head.visible && (
        <>
          <Circle
            cx={joints.head.x * width} cy={joints.head.y * height}
            r={20} fill="#FF000022" stroke="#FF440044"
            strokeWidth={3} opacity={opacity * 0.6}
          />
          <Circle
            cx={joints.head.x * width} cy={joints.head.y * height}
            r={30} fill="none" stroke="#FF000022"
            strokeWidth={2} opacity={opacity * 0.3}
          />
        </>
      )}

      {/* Gövde etrafında sıcak alan */}
      {joints.chest && joints.chest.visible && (
        <Circle
          cx={joints.chest.x * width} cy={joints.chest.y * height}
          r={25} fill="#FF440011" stroke="none"
          opacity={opacity * 0.5}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0F",
  },
  // İzin ekranı
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A0A0F",
    gap: 16,
    paddingHorizontal: 32,
  },
  permissionTitle: {
    color: "#D0D0E0",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 3,
    marginTop: 8,
  },
  permissionText: {
    color: "#5A5A7A",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: "#00FF8820",
    borderWidth: 1,
    borderColor: "#00FF8840",
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  permissionButtonText: {
    color: "#00FF88",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#141420",
  },
  headerLeft: {},
  headerTitle: {
    color: "#E8E8F0",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 3,
  },
  headerSubtitle: {
    color: "#3A3A50",
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2A2A40",
  },
  statusDotActive: {
    backgroundColor: "#00FF88",
  },
  headerTime: {
    color: "#5A5A7A",
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  // Kamera
  cameraContainer: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 2,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#141420",
  },
  cameraView: {
    flex: 1,
    minHeight: CAMERA_HEIGHT,
  },
  thermalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  thermalScale: {
    position: "absolute",
    right: 8,
    top: "20%",
    bottom: "20%",
    width: 20,
    alignItems: "center",
    justifyContent: "space-between",
  },
  thermalScaleLabel: {
    color: "#FFFFFF80",
    fontSize: 7,
    fontWeight: "600",
    letterSpacing: 1,
  },
  thermalScaleBar: {
    flex: 1,
    width: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginVertical: 4,
  },
  thermalScaleSegment: {
    flex: 1,
  },
  // Placeholder
  cameraPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A0A0F80",
    gap: 8,
  },
  placeholderText: {
    color: "#3A3A50",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 3,
  },
  placeholderSubtext: {
    color: "#2A2A40",
    fontSize: 11,
    letterSpacing: 1,
  },
  // Detection
  detectionBanner: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00FF8815",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  detectionBannerThermal: {
    backgroundColor: "#FF440015",
  },
  detectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00FF88",
  },
  detectionText: {
    color: "#00FF88",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  // Flash
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
  },
  // Photo saved
  photoSavedBanner: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00FF8820",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  photoSavedText: {
    color: "#00FF88",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  // Corner marks
  cornerMark: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: "#00FF8840",
  },
  cornerTL: {
    top: 8,
    left: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTR: {
    top: 8,
    right: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBL: {
    bottom: 8,
    left: 8,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBR: {
    bottom: 8,
    right: 8,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  // Stats
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#141420",
    borderBottomWidth: 1,
    borderBottomColor: "#141420",
  },
  statItem: {
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    color: "#D0D0E0",
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    color: "#2A2A40",
    fontSize: 8,
    fontWeight: "500",
    letterSpacing: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#141420",
  },
  // Controls
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  controlButton: {
    alignItems: "center",
    gap: 4,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#14142020",
    minWidth: 48,
  },
  controlLabel: {
    color: "#3A3A50",
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 1,
  },
  scanButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00FF8820",
    borderWidth: 2,
    borderColor: "#00FF8840",
    alignItems: "center",
    justifyContent: "center",
  },
  scanButtonActive: {
    backgroundColor: "#FF333320",
    borderColor: "#FF333340",
  },
  scanButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#00FF88",
    alignItems: "center",
    justifyContent: "center",
  },
  scanButtonInnerActive: {
    backgroundColor: "#FF3333",
  },
  // Footer
  footer: {
    paddingVertical: 6,
    alignItems: "center",
  },
  footerText: {
    color: "#2A2A40",
    fontSize: 10,
    letterSpacing: 1.5,
  },
});
