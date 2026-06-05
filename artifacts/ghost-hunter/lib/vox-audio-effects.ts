/**
 * Vox Ses Sentezleyici - Ses Efektleri
 * Paranormal sesleri simüle etmek için ses efektleri oluşturur
 */

export interface AudioEffect {
  name: string;
  description: string;
  frequency: number; // Hz
  intensity: number; // 0-100
  duration: number; // ms
}

/**
 * Paranormal ses efektleri kütüphanesi
 */
export const PARANORMAL_SOUNDS: AudioEffect[] = [
  {
    name: "Whisper",
    description: "Fısıltı Sesi",
    frequency: 2000,
    intensity: 30,
    duration: 500,
  },
  {
    name: "Static",
    description: "Statik Gürültü",
    frequency: 5000,
    intensity: 60,
    duration: 300,
  },
  {
    name: "Moan",
    description: "İnilti Sesi",
    frequency: 150,
    intensity: 50,
    duration: 800,
  },
  {
    name: "Screech",
    description: "Çığlık Sesi",
    frequency: 8000,
    intensity: 80,
    duration: 400,
  },
  {
    name: "Distortion",
    description: "Bozulma",
    frequency: 3000,
    intensity: 70,
    duration: 600,
  },
  {
    name: "Echo",
    description: "Yankı",
    frequency: 1000,
    intensity: 40,
    duration: 1000,
  },
];

/**
 * Frekans tabanlı ses efekti oluştur
 */
export function generateFrequencyEffect(frequency: number): AudioEffect {
  const intensity = Math.sin(frequency / 100) * 50 + 50;
  return {
    name: `Frequency_${frequency}`,
    description: `${frequency.toFixed(1)} MHz Sinyali`,
    frequency,
    intensity: Math.min(100, Math.max(0, intensity)),
    duration: 300,
  };
}

/**
 * Sinyal gücü hesapla (0-100)
 */
export function calculateSignalStrength(frequency: number, baseFrequency: number): number {
  const diff = Math.abs(frequency - baseFrequency);
  const strength = Math.max(0, 100 - diff * 10);
  return Math.min(100, strength);
}

/**
 * Paranormal aktivite simülasyonu
 */
export function simulateParanormalActivity(): AudioEffect {
  const effects = PARANORMAL_SOUNDS;
  return effects[Math.floor(Math.random() * effects.length)];
}

/**
 * Ses görselleştirmesi için waveform oluştur
 */
export function generateWaveform(
  frequency: number,
  samples: number = 100,
  amplitude: number = 50
): number[] {
  return Array.from({ length: samples }, (_, i) => {
    const t = (i / samples) * Math.PI * 2;
    const base = Math.sin(t * (frequency / 1000)) * amplitude;
    const noise = (Math.random() - 0.5) * (amplitude * 0.3);
    return Math.abs(base + noise);
  });
}

/**
 * Frekans tarama animasyonu
 */
export function getFrequencyColor(frequency: number): string {
  // FM bandı: 88.1 - 108.0 MHz
  const normalized = (frequency - 88.1) / (108.0 - 88.1);

  // Renk gradyenti: Yeşil -> Sarı -> Kırmızı
  if (normalized < 0.33) {
    return "#00FF88"; // Yeşil
  } else if (normalized < 0.66) {
    return "#FFFF00"; // Sarı
  } else {
    return "#FF3B30"; // Kırmızı
  }
}

/**
 * Titreşim feedback
 */
export function getHapticPattern(signalStrength: number): "light" | "medium" | "heavy" {
  if (signalStrength < 30) return "light";
  if (signalStrength < 70) return "medium";
  return "heavy";
}
