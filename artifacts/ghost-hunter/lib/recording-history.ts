/**
 * Ses Kayıt Geçmişi - Veri Modeli ve AsyncStorage Yönetimi
 *
 * Özellikler:
 * - Kayıtları AsyncStorage'da kalıcı sakla
 * - Favori ekleme/çıkarma
 * - Tarihe göre filtreleme (bugün, bu hafta, bu ay, tümü)
 * - Kayıt silme
 * - Kaynak bilgisi (EVP / VOX / ITC)
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================
// VERİ MODELİ
// ============================================================

export type RecordingSource = "evp" | "vox" | "itc";

export type DateFilter = "today" | "week" | "month" | "all";

export interface RecordingEntry {
  id: string;
  /** Kayıt tarihi (ISO string olarak saklanır) */
  createdAt: string;
  /** Kayıt süresi (saniye) */
  duration: number;
  /** Ses dosyası URI */
  audioUri: string;
  /** Kaynak modül */
  source: RecordingSource;
  /** Favori mi */
  isFavorite: boolean;
  /** Paranormal aktivite seviyesi (0-100) */
  activityLevel: number;
  /** Kullanıcı notu (opsiyonel) */
  note?: string;
}

// ============================================================
// STORAGE ANAHTARLARI
// ============================================================

const STORAGE_KEY = "@recording_history";
// Android TransactionTooLargeException önlemi: AsyncStorage max ~1MB
// Sınırsız büyüyen liste binder buffer'ı taşırır → crash
const MAX_RECORDINGS = 200;

// ============================================================
// CRUD İŞLEMLERİ
// ============================================================

/**
 * Tüm kayıtları getir
 */
export async function getAllRecordings(): Promise<RecordingEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    console.error("[RecordingHistory] Kayıtlar okunamadı:", error);
    return [];
  }
}

/**
 * Yeni kayıt ekle
 */
export async function addRecording(
  entry: Omit<RecordingEntry, "id" | "createdAt" | "isFavorite">
): Promise<RecordingEntry> {
  const newEntry: RecordingEntry = {
    ...entry,
    id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    isFavorite: false,
  };

  try {
    const existing = await getAllRecordings();
    // MAX_RECORDINGS sınırı: TransactionTooLargeException önlemi
    const updated = [newEntry, ...existing].slice(0, MAX_RECORDINGS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("[RecordingHistory] Kayıt eklenemedi:", error);
  }

  return newEntry;
}

/**
 * Kayıt sil
 */
export async function deleteRecording(id: string): Promise<boolean> {
  try {
    const existing = await getAllRecordings();
    const filtered = existing.filter((r) => r.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error("[RecordingHistory] Kayıt silinemedi:", error);
    return false;
  }
}

/**
 * Favori durumunu değiştir (toggle)
 */
export async function toggleFavorite(id: string): Promise<boolean> {
  try {
    const existing = await getAllRecordings();
    const index = existing.findIndex((r) => r.id === id);
    if (index === -1) return false;

    existing[index].isFavorite = !existing[index].isFavorite;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return existing[index].isFavorite;
  } catch (error) {
    console.error("[RecordingHistory] Favori değiştirilemedi:", error);
    return false;
  }
}

/**
 * Kayda not ekle/güncelle
 */
export async function updateNote(id: string, note: string): Promise<boolean> {
  try {
    const existing = await getAllRecordings();
    const index = existing.findIndex((r) => r.id === id);
    if (index === -1) return false;

    existing[index].note = note;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return true;
  } catch (error) {
    console.error("[RecordingHistory] Not güncellenemedi:", error);
    return false;
  }
}

// ============================================================
// FİLTRELEME
// ============================================================

/**
 * Tarihe göre filtrele
 */
export function filterByDate(
  recordings: RecordingEntry[],
  filter: DateFilter
): RecordingEntry[] {
  if (filter === "all") return recordings;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter) {
    case "today":
      return recordings.filter(
        (r) => new Date(r.createdAt) >= startOfDay
      );
    case "week": {
      const weekAgo = new Date(startOfDay);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return recordings.filter(
        (r) => new Date(r.createdAt) >= weekAgo
      );
    }
    case "month": {
      const monthAgo = new Date(startOfDay);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return recordings.filter(
        (r) => new Date(r.createdAt) >= monthAgo
      );
    }
    default:
      return recordings;
  }
}

/**
 * Sadece favorileri getir
 */
export function filterFavorites(
  recordings: RecordingEntry[]
): RecordingEntry[] {
  return recordings.filter((r) => r.isFavorite);
}

/**
 * Kaynağa göre filtrele
 */
export function filterBySource(
  recordings: RecordingEntry[],
  source: RecordingSource
): RecordingEntry[] {
  return recordings.filter((r) => r.source === source);
}

// ============================================================
// YARDIMCI FONKSİYONLAR
// ============================================================

/**
 * Süreyi formatla (mm:ss)
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Tarihi formatla (kısa)
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const time = `${hours}:${minutes}`;

  if (isToday) {
    return time;
  }

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}.${month} ${time}`;
}

/**
 * Kaynak adını döndür
 */
export function getSourceLabel(source: RecordingSource): string {
  switch (source) {
    case "evp":
      return "EVP";
    case "vox":
      return "VOX";
    case "itc":
      return "ITC";
    default:
      return String(source).toUpperCase();
  }
}

/**
 * Kaynak rengini döndür
 */
export function getSourceColor(source: RecordingSource): string {
  switch (source) {
    case "evp":
      return "#FF6B35";
    case "vox":
      return "#00FF88";
    case "itc":
      return "#6B5BFF";
    default:
      return "#5A5A70";
  }
}

/**
 * Tüm kayıtları temizle (debug/test amaçlı)
 */
export async function clearAllRecordings(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("[RecordingHistory] Kayıtlar temizlenemedi:", error);
  }
}
