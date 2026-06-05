/**
 * Kanıt Duvarı (Evidence Wall) Yönetim Sistemi
 * SLS görüntüleri, EVP kayıtları ve EMF pik değerlerini arşivler
 * Her kanıt tarih/saat damgası ile kaydedilir
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================
// TİPLER
// ============================================================

export type EvidenceType = "sls_image" | "evp_audio" | "emf_peak" | "radar_detection" | "note";

export interface Evidence {
  id: string;
  type: EvidenceType;
  title: string;
  description: string;
  timestamp: number;
  date: string;
  time: string;
  /** Dosya URI'si (SLS fotoğrafı veya EVP kaydı) */
  fileUri?: string;
  /** EMF pik değeri (mG) */
  emfValue?: number;
  /** Radar mesafe değeri */
  radarDistance?: number;
  /** Radar güç değeri */
  radarStrength?: number;
  /** Konum bilgisi (kullanıcı tarafından girilen) */
  location?: string;
  /** Şiddet seviyesi (1-5) */
  intensity: number;
  /** Ödüllü reklam ile kilidi açılmış mı (eski kayıtlar için) */
  isLocked: boolean;
  /** Etiketler */
  tags: string[];
}

export interface EvidenceStats {
  totalCount: number;
  slsCount: number;
  evpCount: number;
  emfCount: number;
  radarCount: number;
  noteCount: number;
  lastActivity: number | null;
}

// ============================================================
// SABITLER
// ============================================================

const EVIDENCE_STORAGE_KEY = "@antik_ghost_evidence_wall";
const MAX_FREE_VIEW_COUNT = 5; // Ücretsiz görüntülenebilecek eski kayıt sayısı

// ============================================================
// EVIDENCE MANAGER
// ============================================================

export class EvidenceManager {
  /**
   * Tüm kanıtları getir (en yeniden en eskiye)
   */
  static async getAllEvidence(): Promise<Evidence[]> {
    try {
      const data = await AsyncStorage.getItem(EVIDENCE_STORAGE_KEY);
      if (!data) return [];
      const evidence: Evidence[] = JSON.parse(data);
      // En yeni en üstte
      return evidence.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error("[EvidenceManager] Veri okuma hatası:", error);
      return [];
    }
  }

  /**
   * Yeni kanıt ekle
   */
  static async addEvidence(evidence: Omit<Evidence, "id" | "date" | "time" | "isLocked">): Promise<Evidence> {
    const now = new Date();
    const newEvidence: Evidence = {
      ...evidence,
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date: now.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }),
      time: now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      isLocked: false,
    };

    const existing = await this.getAllEvidence();
    const updated = [newEvidence, ...existing];
    await this.saveEvidence(updated);

    return newEvidence;
  }

  /**
   * SLS görüntüsü kaydet
   */
  static async addSLSEvidence(fileUri: string, location?: string): Promise<Evidence> {
    return this.addEvidence({
      type: "sls_image",
      title: "SLS Tarama Görüntüsü",
      description: "SLS kamera ile yakalanan figür görüntüsü",
      timestamp: Date.now(),
      fileUri,
      location,
      intensity: 4,
      tags: ["sls", "görüntü", "figür"],
    });
  }

  /**
   * EVP ses kaydı kaydet
   */
  static async addEVPEvidence(fileUri: string, description?: string, location?: string): Promise<Evidence> {
    return this.addEvidence({
      type: "evp_audio",
      title: "EVP Ses Kaydı",
      description: description || "EVP oturumunda yakalanan ses kaydı",
      timestamp: Date.now(),
      fileUri,
      location,
      intensity: 3,
      tags: ["evp", "ses", "kayıt"],
    });
  }

  /**
   * EMF pik değeri kaydet
   */
  static async addEMFEvidence(emfValue: number, location?: string): Promise<Evidence> {
    const intensity = emfValue > 80 ? 5 : emfValue > 60 ? 4 : emfValue > 40 ? 3 : emfValue > 20 ? 2 : 1;
    return this.addEvidence({
      type: "emf_peak",
      title: `EMF Pik: ${emfValue.toFixed(1)} mG`,
      description: `EMF tarayıcıda ${emfValue.toFixed(1)} mG değerinde anomali tespit edildi`,
      timestamp: Date.now(),
      emfValue,
      location,
      intensity,
      tags: ["emf", "anomali", "pik"],
    });
  }

  /**
   * Radar algılama kaydet
   */
  static async addRadarEvidence(distance: number, strength: number, location?: string): Promise<Evidence> {
    const intensity = strength > 70 ? 5 : strength > 50 ? 4 : strength > 30 ? 3 : 2;
    return this.addEvidence({
      type: "radar_detection",
      title: `Radar Algılama: %${strength.toFixed(0)}`,
      description: `${distance.toFixed(0)}m mesafede %${strength.toFixed(0)} güçte sinyal algılandı`,
      timestamp: Date.now(),
      radarDistance: distance,
      radarStrength: strength,
      location,
      intensity,
      tags: ["radar", "algılama", "sinyal"],
    });
  }

  /**
   * Manuel not ekle
   */
  static async addNoteEvidence(title: string, description: string, location?: string, intensity?: number): Promise<Evidence> {
    return this.addEvidence({
      type: "note",
      title,
      description,
      timestamp: Date.now(),
      location,
      intensity: intensity || 3,
      tags: ["not", "gözlem"],
    });
  }

  /**
   * Kanıt sil
   */
  static async deleteEvidence(id: string): Promise<void> {
    const existing = await this.getAllEvidence();
    const updated = existing.filter((e) => e.id !== id);
    await this.saveEvidence(updated);
  }

  /**
   * İstatistikleri getir
   */
  static async getStats(): Promise<EvidenceStats> {
    const evidence = await this.getAllEvidence();
    return {
      totalCount: evidence.length,
      slsCount: evidence.filter((e) => e.type === "sls_image").length,
      evpCount: evidence.filter((e) => e.type === "evp_audio").length,
      emfCount: evidence.filter((e) => e.type === "emf_peak").length,
      radarCount: evidence.filter((e) => e.type === "radar_detection").length,
      noteCount: evidence.filter((e) => e.type === "note").length,
      lastActivity: evidence.length > 0 ? evidence[0].timestamp : null,
    };
  }

  /**
   * Eski kayıtların kilidi açılmış mı kontrol et
   * İlk MAX_FREE_VIEW_COUNT kayıt ücretsiz, geri kalanı reklam gerektirir
   */
  static isEvidenceLocked(evidence: Evidence, index: number): boolean {
    // Son MAX_FREE_VIEW_COUNT kayıt her zaman ücretsiz
    return index >= MAX_FREE_VIEW_COUNT && evidence.isLocked;
  }

  /**
   * Kanıt kilidini aç (reklam izledikten sonra)
   */
  static async unlockEvidence(id: string): Promise<void> {
    const existing = await this.getAllEvidence();
    const updated = existing.map((e) =>
      e.id === id ? { ...e, isLocked: false } : e
    );
    await this.saveEvidence(updated);
  }

  /**
   * Tüm eski kayıtları kilitle (yeni kayıtlar eklendikçe)
   */
  static async lockOldEvidence(): Promise<void> {
    const existing = await this.getAllEvidence();
    const updated = existing.map((e, idx) => ({
      ...e,
      isLocked: idx >= MAX_FREE_VIEW_COUNT,
    }));
    await this.saveEvidence(updated);
  }

  /**
   * Mevcut paranormal_events verilerini Evidence Wall'a migrate et
   */
  static async migrateFromOldRecords(): Promise<number> {
    try {
      const oldData = await AsyncStorage.getItem("paranormal_events");
      if (!oldData) return 0;

      const oldEvents = JSON.parse(oldData) as Array<{
        id: string;
        title: string;
        location: string;
        date: string;
        notes: string;
        intensity: number;
        timestamp: number;
      }>;

      if (oldEvents.length === 0) return 0;

      // Mevcut evidence'ı kontrol et, zaten migrate edilmiş mi
      const existing = await this.getAllEvidence();
      const existingTimestamps = new Set(existing.map((e) => e.timestamp));

      let migratedCount = 0;
      for (const event of oldEvents) {
        if (existingTimestamps.has(event.timestamp)) continue;

        const evidence: Evidence = {
          id: `ev_migrated_${event.id}`,
          type: "note",
          title: event.title,
          description: event.notes || "Eski kayıttan aktarıldı",
          timestamp: event.timestamp,
          date: event.date,
          time: new Date(event.timestamp).toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          location: event.location,
          intensity: event.intensity,
          isLocked: false,
          tags: ["migrated", "eski-kayıt"],
        };

        existing.push(evidence);
        migratedCount++;
      }

      if (migratedCount > 0) {
        existing.sort((a, b) => b.timestamp - a.timestamp);
        await this.saveEvidence(existing);
      }

      return migratedCount;
    } catch (error) {
      console.error("[EvidenceManager] Migrasyon hatası:", error);
      return 0;
    }
  }

  // ============================================================
  // PRIVATE
  // ============================================================

  private static async saveEvidence(evidence: Evidence[]): Promise<void> {
    try {
      await AsyncStorage.setItem(EVIDENCE_STORAGE_KEY, JSON.stringify(evidence));
    } catch (error) {
      console.error("[EvidenceManager] Kaydetme hatası:", error);
    }
  }
}

// ============================================================
// YARDIMCI FONKSİYONLAR
// ============================================================

export function getEvidenceIcon(type: EvidenceType): string {
  switch (type) {
    case "sls_image":
      return "camera.fill";
    case "evp_audio":
      return "waveform";
    case "emf_peak":
      return "antenna.radiowaves.left.and.right";
    case "radar_detection":
      return "dot.radiowaves.left.and.right";
    case "note":
      return "doc.text.fill";
  }
}

export function getEvidenceColor(type: EvidenceType): string {
  switch (type) {
    case "sls_image":
      return "#00FF88";
    case "evp_audio":
      return "#9B4FDE";
    case "emf_peak":
      return "#FFCC00";
    case "radar_detection":
      return "#00CCFF";
    case "note":
      return "#5A6A8A";
  }
}

export function getEvidenceTypeLabel(type: EvidenceType): string {
  switch (type) {
    case "sls_image":
      return "SLS GÖRÜNTÜ";
    case "evp_audio":
      return "EVP KAYIT";
    case "emf_peak":
      return "EMF PİK";
    case "radar_detection":
      return "RADAR";
    case "note":
      return "NOT";
  }
}

export function getIntensityColor(level: number): string {
  if (level <= 1) return "#00CCFF";
  if (level <= 2) return "#00FF88";
  if (level <= 3) return "#FFCC00";
  if (level <= 4) return "#FF8800";
  return "#FF3333";
}

export function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  if (hours < 24) return `${hours} saat önce`;
  if (days < 7) return `${days} gün önce`;

  return new Date(timestamp).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
