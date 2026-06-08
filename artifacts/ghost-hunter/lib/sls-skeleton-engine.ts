/**
 * SLS Skeleton Engine
 * GhostTube SLS tarzı simüle edilmiş paranormal figür tespiti.
 * Kamera görüntüsü üzerinde stick figure (çubuk adam) iskelet yapısı oluşturur.
 * Sensör verilerine (magnetometre, ivmeölçer) tepki vererek figürler belirip kaybolur.
 */

// İskelet eklem noktaları tanımı
export interface JointPoint {
  x: number; // 0-1 normalize edilmiş
  y: number; // 0-1 normalize edilmiş
  confidence: number; // 0-1
  visible: boolean;
}

export interface SkeletonFigure {
  id: string;
  joints: Record<string, JointPoint>;
  baseJoints: Record<string, JointPoint>; // spawn anındaki referans pozlar
  opacity: number; // 0-1 belirme/kaybolma animasyonu
  createdAt: number;
  lifespan: number; // ms cinsinden yaşam süresi
  type: "full" | "partial" | "crouching" | "reaching" | "standing";
  flickerPhase: number;
  movementPhase: number; // vücut sallantısı animasyon fazı
  breathPhase: number;   // nefes animasyon fazı
}

export interface PointCloudDot {
  x: number;
  y: number;
  intensity: number; // 0-1
  size: number;
}

// İskelet kemik bağlantıları (joint1 -> joint2)
export const SKELETON_BONES: [string, string][] = [
  // Baş - gövde
  ["head", "neck"],
  ["neck", "chest"],
  ["chest", "spine"],
  ["spine", "hip"],
  // Sol kol
  ["neck", "leftShoulder"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  // Sağ kol
  ["neck", "rightShoulder"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
  // Sol bacak
  ["hip", "leftHip"],
  ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"],
  // Sağ bacak
  ["hip", "rightHip"],
  ["rightHip", "rightKnee"],
  ["rightKnee", "rightAnkle"],
];

// Eklem noktası isimleri
export const JOINT_NAMES = [
  "head",
  "neck",
  "chest",
  "spine",
  "hip",
  "leftShoulder",
  "leftElbow",
  "leftWrist",
  "rightShoulder",
  "rightElbow",
  "rightWrist",
  "leftHip",
  "leftKnee",
  "leftAnkle",
  "rightHip",
  "rightKnee",
  "rightAnkle",
] as const;

// Farklı poz şablonları — kamera yüksekliğinin ~88%'ini dolduracak şekilde ölçeklenmiş
// Y aralığı: ~0.04 (baş) → ~0.92 (ayak bilekleri)
const POSE_TEMPLATES: Record<string, Record<string, { x: number; y: number }>> = {
  standing: {
    head: { x: 0.50, y: 0.04 },
    neck: { x: 0.50, y: 0.11 },
    chest: { x: 0.50, y: 0.24 },
    spine: { x: 0.50, y: 0.37 },
    hip: { x: 0.50, y: 0.46 },
    leftShoulder: { x: 0.37, y: 0.14 },
    leftElbow: { x: 0.29, y: 0.29 },
    leftWrist: { x: 0.26, y: 0.43 },
    rightShoulder: { x: 0.63, y: 0.14 },
    rightElbow: { x: 0.71, y: 0.29 },
    rightWrist: { x: 0.74, y: 0.43 },
    leftHip: { x: 0.43, y: 0.48 },
    leftKnee: { x: 0.41, y: 0.67 },
    leftAnkle: { x: 0.40, y: 0.90 },
    rightHip: { x: 0.57, y: 0.48 },
    rightKnee: { x: 0.59, y: 0.67 },
    rightAnkle: { x: 0.60, y: 0.90 },
  },
  reaching: {
    // Sağ kol yukarı uzanıyor
    head: { x: 0.47, y: 0.04 },
    neck: { x: 0.47, y: 0.11 },
    chest: { x: 0.47, y: 0.24 },
    spine: { x: 0.47, y: 0.37 },
    hip: { x: 0.47, y: 0.46 },
    leftShoulder: { x: 0.34, y: 0.14 },
    leftElbow: { x: 0.26, y: 0.29 },
    leftWrist: { x: 0.22, y: 0.43 },
    rightShoulder: { x: 0.58, y: 0.14 },
    rightElbow: { x: 0.68, y: 0.04 },
    rightWrist: { x: 0.74, y: -0.04 }, // ekrandan çıkabilir, clamp edilecek
    leftHip: { x: 0.41, y: 0.48 },
    leftKnee: { x: 0.39, y: 0.67 },
    leftAnkle: { x: 0.38, y: 0.90 },
    rightHip: { x: 0.53, y: 0.48 },
    rightKnee: { x: 0.55, y: 0.67 },
    rightAnkle: { x: 0.56, y: 0.90 },
  },
  crouching: {
    // Çömelmiş — dikey yayılım daha az, ama y merkezi kaydırılmış
    head: { x: 0.50, y: 0.28 },
    neck: { x: 0.50, y: 0.34 },
    chest: { x: 0.50, y: 0.45 },
    spine: { x: 0.50, y: 0.53 },
    hip: { x: 0.50, y: 0.60 },
    leftShoulder: { x: 0.37, y: 0.37 },
    leftElbow: { x: 0.28, y: 0.49 },
    leftWrist: { x: 0.25, y: 0.60 },
    rightShoulder: { x: 0.63, y: 0.37 },
    rightElbow: { x: 0.72, y: 0.49 },
    rightWrist: { x: 0.75, y: 0.60 },
    leftHip: { x: 0.42, y: 0.62 },
    leftKnee: { x: 0.33, y: 0.76 },
    leftAnkle: { x: 0.30, y: 0.88 },
    rightHip: { x: 0.58, y: 0.62 },
    rightKnee: { x: 0.67, y: 0.76 },
    rightAnkle: { x: 0.70, y: 0.88 },
  },
  partial: {
    // Sadece üst vücut görünür (gövde + kollar), bacaklar yok
    head: { x: 0.50, y: 0.04 },
    neck: { x: 0.50, y: 0.11 },
    chest: { x: 0.50, y: 0.24 },
    spine: { x: 0.50, y: 0.37 },
    hip: { x: 0.50, y: 0.46 },
    leftShoulder: { x: 0.36, y: 0.14 },
    leftElbow: { x: 0.27, y: 0.29 },
    leftWrist: { x: 0.24, y: 0.43 },
    rightShoulder: { x: 0.64, y: 0.14 },
    rightElbow: { x: 0.73, y: 0.29 },
    rightWrist: { x: 0.76, y: 0.43 },
    leftHip: { x: 0.43, y: 0.48 },
    leftKnee: { x: 0.41, y: 0.67 },
    leftAnkle: { x: 0.40, y: 0.90 },
    rightHip: { x: 0.57, y: 0.48 },
    rightKnee: { x: 0.59, y: 0.67 },
    rightAnkle: { x: 0.60, y: 0.90 },
  },
  full: {
    // Tam boy — geniş omuzlar, kamera yüksekliğini en iyi kapsar
    head: { x: 0.50, y: 0.03 },
    neck: { x: 0.50, y: 0.10 },
    chest: { x: 0.50, y: 0.23 },
    spine: { x: 0.50, y: 0.36 },
    hip: { x: 0.50, y: 0.45 },
    leftShoulder: { x: 0.35, y: 0.13 },
    leftElbow: { x: 0.26, y: 0.27 },
    leftWrist: { x: 0.22, y: 0.42 },
    rightShoulder: { x: 0.65, y: 0.13 },
    rightElbow: { x: 0.74, y: 0.27 },
    rightWrist: { x: 0.78, y: 0.42 },
    leftHip: { x: 0.42, y: 0.47 },
    leftKnee: { x: 0.40, y: 0.66 },
    leftAnkle: { x: 0.39, y: 0.90 },
    rightHip: { x: 0.58, y: 0.47 },
    rightKnee: { x: 0.60, y: 0.66 },
    rightAnkle: { x: 0.61, y: 0.90 },
  },
};

type FigureCallback = (figures: SkeletonFigure[]) => void;

export class SLSSkeletonEngine {
  private isActive = false;
  private figures: SkeletonFigure[] = [];
  private callback: FigureCallback | null = null;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private spawnInterval: ReturnType<typeof setInterval> | null = null;
  private magneticField = 0;
  private sensitivity = 0.5; // 0-1

  // Nokta bulutu
  private pointCloud: PointCloudDot[] = [];
  private pointCloudCallback: ((dots: PointCloudDot[]) => void) | null = null;

  // İstatistikler
  private totalDetections = 0;
  private sessionStartTime = 0;

  start(onFigures: FigureCallback, onPointCloud?: (dots: PointCloudDot[]) => void) {
    if (this.isActive) return;
    this.isActive = true;
    this.callback = onFigures;
    this.pointCloudCallback = onPointCloud || null;
    this.sessionStartTime = Date.now();
    this.figures = [];
    this.totalDetections = 0;

    // Nokta bulutu oluştur
    this.generatePointCloud();

    // Figür güncelleme döngüsü (60fps benzeri)
    this.updateInterval = setInterval(() => {
      this.updateFigures();
      this.updatePointCloud();
    }, 50);

    // Figür oluşturma döngüsü (rastgele aralıklarla)
    this.scheduleNextSpawn();
  }

  stop() {
    this.isActive = false;
    this.callback = null;
    this.pointCloudCallback = null;
    this.figures = [];
    this.pointCloud = [];
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.spawnInterval) {
      clearTimeout(this.spawnInterval);
      this.spawnInterval = null;
    }
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getTotalDetections(): number {
    return this.totalDetections;
  }

  getSessionDuration(): number {
    if (!this.sessionStartTime) return 0;
    return Date.now() - this.sessionStartTime;
  }

  getCurrentFigureCount(): number {
    return this.figures.length;
  }

  setSensitivity(value: number) {
    this.sensitivity = Math.max(0, Math.min(1, value));
  }

  setMagneticField(value: number) {
    this.magneticField = value;
  }

  // Nokta bulutu oluştur
  private generatePointCloud() {
    const dots: PointCloudDot[] = [];
    const count = 120 + Math.floor(Math.random() * 60);
    for (let i = 0; i < count; i++) {
      dots.push({
        x: Math.random(),
        y: Math.random(),
        intensity: 0.1 + Math.random() * 0.5,
        size: 1 + Math.random() * 2,
      });
    }
    this.pointCloud = dots;
  }

  // Nokta bulutu güncelle (hafif hareket)
  private updatePointCloud() {
    if (!this.pointCloudCallback) return;

    this.pointCloud = this.pointCloud.map((dot) => ({
      ...dot,
      x: dot.x + (Math.random() - 0.5) * 0.003,
      y: dot.y + (Math.random() - 0.5) * 0.003,
      intensity: Math.max(0.05, Math.min(0.8, dot.intensity + (Math.random() - 0.5) * 0.05)),
    }));

    this.pointCloudCallback(this.pointCloud);
  }

  // Sonraki figür oluşturmayı planla
  private scheduleNextSpawn() {
    if (!this.isActive) return;

    // İlk figür çok daha hızlı belirir (5-12 sn), sonrakiler daha uzun bekler
    const isFirstFigure = this.totalDetections === 0;
    const magneticBoost = this.magneticField > 50 ? 0.70 : 1;
    const sensitivityFactor = 1 - this.sensitivity * 0.45;
    const baseDelay = isFirstFigure
      ? 5000 + Math.random() * 7000   // ilk: 5-12 saniye
      : 18000 + Math.random() * 22000; // sonrakiler: 18-40 saniye
    const delay = baseDelay * magneticBoost * sensitivityFactor;

    this.spawnInterval = setTimeout(() => {
      if (this.isActive) {
        this.spawnFigure();
        this.scheduleNextSpawn();
      }
    }, delay);
  }

  // Yeni figür oluştur
  private spawnFigure() {
    if (this.figures.length >= 3) return; // Maksimum 3 figür

    const types: SkeletonFigure["type"][] = ["full", "partial", "crouching", "reaching", "standing"];
    const type = types[Math.floor(Math.random() * types.length)];
    const template = POSE_TEMPLATES[type] || POSE_TEMPLATES.standing;

    // Figürü ekranın sol / merkez / sağ üçte birinde konumlandır
    // (her seferinde farklı bölge seçilir)
    const zones = [-0.28, 0.0, 0.28];
    const usedOffsets = this.figures.map((f) => {
      const center = (f.joints["hip"]?.x ?? 0.5) - 0.5;
      return Math.round(center / 0.14) * 0.14;
    });
    const freeZones = zones.filter((z) => !usedOffsets.some((u) => Math.abs(u - z) < 0.10));
    const offsetX = freeZones.length > 0
      ? freeZones[Math.floor(Math.random() * freeZones.length)]
      : (Math.random() - 0.5) * 0.4;

    const joints: Record<string, JointPoint> = {};
    for (const name of JOINT_NAMES) {
      const base = template[name];
      if (!base) continue;

      // "partial" figürlerde bazı eklem noktaları rastgele gizlenir
      const isPartialHidden = type === "partial" && Math.random() > 0.65;

      const rawX = base.x + offsetX + (Math.random() - 0.5) * 0.02;
      const rawY = base.y + (Math.random() - 0.5) * 0.02;

      joints[name] = {
        x: Math.max(0.03, Math.min(0.97, rawX)),
        y: Math.max(0.02, Math.min(0.97, rawY)),
        confidence: isPartialHidden ? 0 : 0.6 + Math.random() * 0.4,
        visible: !isPartialHidden,
      };
    }

    // baseJoints = animasyon referansı (orijinal spawn pozisyonu)
    const baseJoints: Record<string, JointPoint> = {};
    for (const [k, v] of Object.entries(joints)) {
      baseJoints[k] = { ...v };
    }

    const figure: SkeletonFigure = {
      id: `fig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      joints,
      baseJoints,
      opacity: 0,
      createdAt: Date.now(),
      lifespan: 9000 + Math.random() * 12000, // 9-21 saniye
      type,
      flickerPhase: 0,
      movementPhase: Math.random() * Math.PI * 2, // rastgele başlangıç fazı
      breathPhase: Math.random() * Math.PI * 2,
    };

    this.figures.push(figure);
    this.totalDetections++;
  }

  // Figürleri güncelle (animasyon, yaşam süresi, nefes, sallantı)
  private updateFigures() {
    if (!this.callback) return;

    const now = Date.now();
    const updatedFigures: SkeletonFigure[] = [];

    for (const figure of this.figures) {
      const age = now - figure.createdAt;
      const lifeRatio = age / figure.lifespan;

      if (lifeRatio > 1) continue; // Süresi dolmuş

      // Belirme/kaybolma animasyonu
      let opacity = 1;
      if (lifeRatio < 0.12) {
        opacity = lifeRatio / 0.12;
      } else if (lifeRatio > 0.82) {
        opacity = (1 - lifeRatio) / 0.18;
      }

      // Paranormal titreşim efekti
      const flickerPhase = (figure.flickerPhase + 1) % 60;
      const flicker = Math.sin(flickerPhase * 0.3) * 0.12;
      opacity = Math.max(0, Math.min(1, opacity + flicker));

      // Animasyon fazları ilerle
      const movementPhase = figure.movementPhase + 0.018; // yavaş sallantı
      const breathPhase = figure.breathPhase + 0.032;     // biraz daha hızlı nefes

      // Vücut sallantısı (tüm gövde sola/sağa hafifçe sallanır)
      const swayX = Math.sin(movementPhase) * 0.010;
      // Nefes hareketi (göğüs ve omuzlar hafifçe yukarı/aşağı)
      const breathY = Math.sin(breathPhase) * 0.006;
      // Küçük rastgele titreşim (paranormal etki)
      const jitterX = (Math.random() - 0.5) * 0.003;
      const jitterY = (Math.random() - 0.5) * 0.003;

      // Üst vücut eklemleri (sallantı + nefes + jitter)
      const upperBody = new Set(["head", "neck", "chest", "spine", "leftShoulder", "rightShoulder"]);
      // Alt vücut eklemleri (sadece yavaş sallantı + jitter)
      const lowerBody = new Set(["hip", "leftHip", "rightHip", "leftKnee", "rightKnee", "leftAnkle", "rightAnkle"]);
      // Eller (biraz daha fazla hareket)
      const hands = new Set(["leftElbow", "leftWrist", "rightElbow", "rightWrist"]);

      const updatedJoints: Record<string, JointPoint> = {};
      for (const [name, joint] of Object.entries(figure.baseJoints)) {
        if (!joint.visible) {
          updatedJoints[name] = { ...joint };
          continue;
        }

        let dx = swayX + jitterX;
        let dy = jitterY;

        if (upperBody.has(name)) {
          dy += breathY;
        } else if (hands.has(name)) {
          // Eller biraz daha serbest sallanır
          dx += Math.sin(movementPhase * 1.3) * 0.008;
          dy += Math.sin(breathPhase * 0.9) * 0.010;
        } else if (lowerBody.has(name)) {
          // Alt vücut çok az hareket eder (ayaklar yerde)
          dx *= 0.4;
        }

        updatedJoints[name] = {
          ...joint,
          x: Math.max(0.02, Math.min(0.98, joint.x + dx)),
          y: Math.max(0.01, Math.min(0.98, joint.y + dy)),
        };
      }

      updatedFigures.push({
        ...figure,
        joints: updatedJoints,
        opacity,
        flickerPhase,
        movementPhase,
        breathPhase,
      });
    }

    this.figures = updatedFigures;
    this.callback(updatedFigures);
  }
}

// Singleton
let _slsEngine: SLSSkeletonEngine | null = null;

export function getSLSEngine(): SLSSkeletonEngine {
  if (!_slsEngine) {
    _slsEngine = new SLSSkeletonEngine();
  }
  return _slsEngine;
}
