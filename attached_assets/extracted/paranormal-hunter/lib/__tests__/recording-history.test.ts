import { describe, it, expect, vi, beforeEach } from "vitest";

// AsyncStorage mock
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => mockStorage[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      mockStorage[key] = value;
    }),
    removeItem: vi.fn(async (key: string) => {
      delete mockStorage[key];
    }),
  },
}));

import {
  getAllRecordings,
  addRecording,
  deleteRecording,
  toggleFavorite,
  updateNote,
  filterByDate,
  filterFavorites,
  filterBySource,
  formatDuration,
  formatDate,
  getSourceLabel,
  getSourceColor,
  clearAllRecordings,
  type RecordingEntry,
  type DateFilter,
} from "../recording-history";

describe("Recording History - Veri Modeli ve CRUD", () => {
  beforeEach(() => {
    // Storage temizle
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  it("boş storage'da boş dizi döndürmeli", async () => {
    const recordings = await getAllRecordings();
    expect(recordings).toEqual([]);
  });

  it("yeni kayıt eklemeli ve id/createdAt/isFavorite atamalı", async () => {
    const entry = await addRecording({
      duration: 30,
      audioUri: "file:///test/audio.m4a",
      source: "evp",
      activityLevel: 75,
    });

    expect(entry.id).toMatch(/^rec_/);
    expect(entry.createdAt).toBeTruthy();
    expect(entry.isFavorite).toBe(false);
    expect(entry.duration).toBe(30);
    expect(entry.source).toBe("evp");

    const all = await getAllRecordings();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(entry.id);
  });

  it("birden fazla kayıt eklemeli (en yeni başta)", async () => {
    await addRecording({
      duration: 10,
      audioUri: "file:///test/1.m4a",
      source: "evp",
      activityLevel: 30,
    });
    await addRecording({
      duration: 20,
      audioUri: "file:///test/2.m4a",
      source: "vox",
      activityLevel: 60,
    });

    const all = await getAllRecordings();
    expect(all).toHaveLength(2);
    expect(all[0].source).toBe("vox"); // En yeni başta
    expect(all[1].source).toBe("evp");
  });

  it("kayıt silmeli", async () => {
    const entry = await addRecording({
      duration: 15,
      audioUri: "file:///test/del.m4a",
      source: "itc",
      activityLevel: 50,
    });

    const result = await deleteRecording(entry.id);
    expect(result).toBe(true);

    const all = await getAllRecordings();
    expect(all).toHaveLength(0);
  });

  it("olmayan kayıt silme denemesinde true dönmeli (filtre sonucu boş)", async () => {
    const result = await deleteRecording("nonexistent");
    expect(result).toBe(true);
  });

  it("favori toggle yapmalı", async () => {
    const entry = await addRecording({
      duration: 20,
      audioUri: "file:///test/fav.m4a",
      source: "evp",
      activityLevel: 80,
    });

    // İlk toggle: false → true
    const isFav1 = await toggleFavorite(entry.id);
    expect(isFav1).toBe(true);

    const all1 = await getAllRecordings();
    expect(all1[0].isFavorite).toBe(true);

    // İkinci toggle: true → false
    const isFav2 = await toggleFavorite(entry.id);
    expect(isFav2).toBe(false);

    const all2 = await getAllRecordings();
    expect(all2[0].isFavorite).toBe(false);
  });

  it("not eklemeli/güncellemeli", async () => {
    const entry = await addRecording({
      duration: 25,
      audioUri: "file:///test/note.m4a",
      source: "evp",
      activityLevel: 45,
    });

    const result = await updateNote(entry.id, "İlginç ses yakalandı");
    expect(result).toBe(true);

    const all = await getAllRecordings();
    expect(all[0].note).toBe("İlginç ses yakalandı");
  });

  it("tüm kayıtları temizlemeli", async () => {
    await addRecording({
      duration: 10,
      audioUri: "file:///test/clear1.m4a",
      source: "evp",
      activityLevel: 20,
    });
    await addRecording({
      duration: 20,
      audioUri: "file:///test/clear2.m4a",
      source: "vox",
      activityLevel: 40,
    });

    await clearAllRecordings();
    const all = await getAllRecordings();
    expect(all).toHaveLength(0);
  });
});

describe("Recording History - Filtreleme", () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 5);
  const lastMonth = new Date(today);
  lastMonth.setDate(lastMonth.getDate() - 20);
  const twoMonthsAgo = new Date(today);
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  const mockRecordings: RecordingEntry[] = [
    {
      id: "1",
      createdAt: today.toISOString(),
      duration: 30,
      audioUri: "file:///1.m4a",
      source: "evp",
      isFavorite: true,
      activityLevel: 80,
    },
    {
      id: "2",
      createdAt: yesterday.toISOString(),
      duration: 20,
      audioUri: "file:///2.m4a",
      source: "vox",
      isFavorite: false,
      activityLevel: 40,
    },
    {
      id: "3",
      createdAt: lastWeek.toISOString(),
      duration: 15,
      audioUri: "file:///3.m4a",
      source: "itc",
      isFavorite: true,
      activityLevel: 90,
    },
    {
      id: "4",
      createdAt: lastMonth.toISOString(),
      duration: 45,
      audioUri: "file:///4.m4a",
      source: "evp",
      isFavorite: false,
      activityLevel: 10,
    },
    {
      id: "5",
      createdAt: twoMonthsAgo.toISOString(),
      duration: 60,
      audioUri: "file:///5.m4a",
      source: "vox",
      isFavorite: false,
      activityLevel: 55,
    },
  ];

  it("'all' filtresi tüm kayıtları döndürmeli", () => {
    const result = filterByDate(mockRecordings, "all");
    expect(result).toHaveLength(5);
  });

  it("'today' filtresi sadece bugünkü kayıtları döndürmeli", () => {
    const result = filterByDate(mockRecordings, "today");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("'week' filtresi son 7 günü döndürmeli", () => {
    const result = filterByDate(mockRecordings, "week");
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("'month' filtresi son 1 ayı döndürmeli", () => {
    const result = filterByDate(mockRecordings, "month");
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.length).toBeLessThanOrEqual(4);
  });

  it("favori filtresi sadece favorileri döndürmeli", () => {
    const result = filterFavorites(mockRecordings);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.isFavorite)).toBe(true);
  });

  it("kaynak filtresi doğru çalışmalı", () => {
    const evpOnly = filterBySource(mockRecordings, "evp");
    expect(evpOnly).toHaveLength(2);
    expect(evpOnly.every((r) => r.source === "evp")).toBe(true);

    const voxOnly = filterBySource(mockRecordings, "vox");
    expect(voxOnly).toHaveLength(2);

    const itcOnly = filterBySource(mockRecordings, "itc");
    expect(itcOnly).toHaveLength(1);
  });
});

describe("Recording History - Yardımcı Fonksiyonlar", () => {
  it("formatDuration doğru formatlamalı", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(30)).toBe("00:30");
    expect(formatDuration(65)).toBe("01:05");
    expect(formatDuration(3661)).toBe("61:01");
  });

  it("formatDate bugün için sadece saat döndürmeli", () => {
    const now = new Date();
    const result = formatDate(now.toISOString());
    // Bugün için sadece saat:dakika formatı
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it("formatDate geçmiş tarih için gün.ay saat döndürmeli", () => {
    const pastDate = new Date("2025-03-15T14:30:00Z");
    const result = formatDate(pastDate.toISOString());
    expect(result).toMatch(/^\d{2}\.\d{2} \d{2}:\d{2}$/);
  });

  it("getSourceLabel doğru etiket döndürmeli", () => {
    expect(getSourceLabel("evp")).toBe("EVP");
    expect(getSourceLabel("vox")).toBe("VOX");
    expect(getSourceLabel("itc")).toBe("ITC");
  });

  it("getSourceColor doğru renk döndürmeli", () => {
    expect(getSourceColor("evp")).toBe("#FF6B35");
    expect(getSourceColor("vox")).toBe("#00FF88");
    expect(getSourceColor("itc")).toBe("#6B5BFF");
  });
});
