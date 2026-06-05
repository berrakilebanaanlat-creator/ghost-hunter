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
  opacity: number; // 0-1 belirme/kaybolma animasyonu
  createdAt: number;
  lifespan: number; // ms cinsinden yaşam süresi
  type: "full" | "partial" | "crouching" | "reaching" | "standing";
  flickerPhase: number;
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

// Farklı poz şablonları
const POSE_TEMPLATES: Record<string, Record<string, { x: number; y: number }>> = {
  standing: {
    head: { x: 0.5, y: 0.12 },
    neck: { x: 0.5, y: 0.18 },
    chest: { x: 0.5, y: 0.28 },
    spine: { x: 0.5, y: 0.38 },
    hip: { x: 0.5, y: 0.45 },
    leftShoulder: { x: 0.38, y: 0.20 },
    leftElbow: { x: 0.32, y: 0.32 },
    leftWrist: { x: 0.30, y: 0.42 },
    rightShoulder: { x: 0.62, y: 0.20 },
    rightElbow: { x: 0.68, y: 0.32 },
    rightWrist: { x: 0.70, y: 0.42 },
    leftHip: { x: 0.44, y: 0.47 },
    leftKnee: { x: 0.42, y: 0.62 },
    leftAnkle: { x: 0.41, y: 0.78 },
    rightHip: { x: 0.56, y: 0.47 },
    rightKnee: { x: 0.58, y: 0.62 },
    rightAnkle: { x: 0.59, y: 0.78 },
  },
  reaching: {
    head: { x: 0.45, y: 0.15 },
    neck: { x: 0.45, y: 0.21 },
    chest: { x: 0.45, y: 0.31 },
    spine: { x: 0.46, y: 0.40 },
    hip: { x: 0.47, y: 0.47 },
    leftShoulder: { x: 0.35, y: 0.23 },
    leftElbow: { x: 0.25, y: 0.18 },
    leftWrist: { x: 0.15, y: 0.12 },
    rightShoulder: { x: 0.55, y: 0.23 },
    rightElbow: { x: 0.65, y: 0.30 },
    rightWrist: { x: 0.72, y: 0.38 },
    leftHip: { x: 0.41, y: 0.49 },
    leftKnee: { x: 0.39, y: 0.64 },
    leftAnkle: { x: 0.38, y: 0.79 },
    rightHip: { x: 0.53, y: 0.49 },
    rightKnee: { x: 0.55, y: 0.64 },
    rightAnkle: { x: 0.56, y: 0.79 },
  },
  crouching: {
    head: { x: 0.50, y: 0.30 },
    neck: { x: 0.50, y: 0.35 },
    chest: { x: 0.50, y: 0.42 },
    spine: { x: 0.50, y: 0.48 },
    hip: { x: 0.50, y: 0.54 },
    leftShoulder: { x: 0.38, y: 0.37 },
    leftElbow: { x: 0.30, y: 0.45 },
    leftWrist: { x: 0.28, y: 0.55 },
    rightShoulder: { x: 0.62, y: 0.37 },
    rightElbow: { x: 0.70, y: 0.45 },
    rightWrist: { x: 0.72, y: 0.55 },
    leftHip: { x: 0.43, y: 0.56 },
    leftKnee: { x: 0.35, y: 0.65 },
    leftAnkle: { x: 0.33, y: 0.75 },
    rightHip: { x: 0.57, y: 0.56 },
    rightKnee: { x: 0.65, y: 0.65 },
    rightAnkle: { x: 0.67, y: 0.75 },
  },
  partial: {
    head: { x: 0.50, y: 0.10 },
    neck: { x: 0.50, y: 0.16 },
    chest: { x: 0.50, y: 0.26 },
    spine: { x: 0.50, y: 0.35 },
    hip: { x: 0.50, y: 0.42 },
    leftShoulder: { x: 0.38, y: 0.18 },
    leftElbow: { x: 0.32, y: 0.28 },
    leftWrist: { x: 0.30, y: 0.38 },
    rightShoulder: { x: 0.62, y: 0.18 },
    rightElbow: { x: 0.68, y: 0.28 },
    rightWrist: { x: 0.70, y: 0.38 },
    leftHip: { x: 0.44, y: 0.44 },
    leftKnee: { x: 0.42, y: 0.56 },
    leftAnkle: { x: 0.41, y: 0.68 },
    rightHip: { x: 0.56, y: 0.44 },
    rightKnee: { x: 0.58, y: 0.56 },
    rightAnkle: { x: 0.59, y: 0.68 },
  },
  full: {
    head: { x: 0.50, y: 0.08 },
    neck: { x: 0.50, y: 0.14 },
    chest: { x: 0.50, y: 0.24 },
    spine: { x: 0.50, y: 0.34 },
    hip: { x: 0.50, y: 0.42 },
    leftShoulder: { x: 0.36, y: 0.16 },
    leftElbow: { x: 0.28, y: 0.28 },
    leftWrist: { x: 0.24, y: 0.40 },
    rightShoulder: { x: 0.64, y: 0.16 },
    rightElbow: { x: 0.72, y: 0.28 },
    rightWrist: { x: 0.76, y: 0.40 },
    leftHip: { x: 0.42, y: 0.44 },
    leftKnee: { x: 0.40, y: 0.60 },
    leftAnkle: { x: 0.39, y: 0.76 },
    rightHip: { x: 0.58, y: 0.44 },
    rightKnee: { x: 0.60, y: 0.60 },
    rightAnkle: { x: 0.61, y: 0.76 },
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

    // Manyetik alan yüksekse daha sık figür oluştur
    const magneticBoost = this.magneticField > 50 ? 0.5 : 1;
    const sensitivityFactor = 1 - this.sensitivity * 0.6;
    const baseDelay = 8000 + Math.random() * 20000; // 8-28 saniye
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

    // Rastgele konum ofseti
    const offsetX = (Math.random() - 0.5) * 0.4;
    const offsetY = (Math.random() - 0.5) * 0.2;

    const joints: Record<string, JointPoint> = {};
    for (const name of JOINT_NAMES) {
      const base = template[name];
      if (!base) continue;

      // Bazı eklem noktalarını "partial" figürlerde gizle
      const isPartialHidden = type === "partial" && Math.random() > 0.7;

      joints[name] = {
        x: Math.max(0.05, Math.min(0.95, base.x + offsetX + (Math.random() - 0.5) * 0.03)),
        y: Math.max(0.05, Math.min(0.95, base.y + offsetY + (Math.random() - 0.5) * 0.03)),
        confidence: isPartialHidden ? 0 : 0.5 + Math.random() * 0.5,
        visible: !isPartialHidden,
      };
    }

    const figure: SkeletonFigure = {
      id: `fig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      joints,
      opacity: 0,
      createdAt: Date.now(),
      lifespan: 3000 + Math.random() * 12000, // 3-15 saniye
      type,
      flickerPhase: 0,
    };

    this.figures.push(figure);
    this.totalDetections++;
  }

  // Figürleri güncelle (animasyon, yaşam süresi, titreşim)
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
      if (lifeRatio < 0.15) {
        // Belirme (fade in)
        opacity = lifeRatio / 0.15;
      } else if (lifeRatio > 0.8) {
        // Kaybolma (fade out)
        opacity = (1 - lifeRatio) / 0.2;
      }

      // Paranormal titreşim efekti
      const flickerPhase = (figure.flickerPhase + 1) % 60;
      const flicker = Math.sin(flickerPhase * 0.3) * 0.15;
      opacity = Math.max(0, Math.min(1, opacity + flicker));

      // Eklem noktalarını hafifçe hareket ettir (doğal titreşim)
      const updatedJoints: Record<string, JointPoint> = {};
      for (const [name, joint] of Object.entries(figure.joints)) {
        updatedJoints[name] = {
          ...joint,
          x: joint.x + (Math.random() - 0.5) * 0.004,
          y: joint.y + (Math.random() - 0.5) * 0.004,
        };
      }

      updatedFigures.push({
        ...figure,
        joints: updatedJoints,
        opacity,
        flickerPhase,
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
