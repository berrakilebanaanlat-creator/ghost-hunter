import { describe, it, expect, vi, beforeEach } from "vitest";

// AsyncStorage mock
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
  },
}));

describe("PremiumManager", () => {
  let PremiumManager: any;
  let SUBSCRIPTION_PLANS: any;

  beforeEach(async () => {
    // Storage temizle
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    vi.resetModules();
    const mod = await import("../premium-manager");
    PremiumManager = mod.PremiumManager;
    SUBSCRIPTION_PLANS = mod.SUBSCRIPTION_PLANS;
  });

  it("abonelik planları tanımlı olmalı", () => {
    expect(SUBSCRIPTION_PLANS).toBeDefined();
    expect(Object.keys(SUBSCRIPTION_PLANS).length).toBeGreaterThanOrEqual(3);
  });

  it("her planın gerekli alanları olmalı", () => {
    Object.values(SUBSCRIPTION_PLANS).forEach((plan: any) => {
      expect(plan.id).toBeDefined();
      expect(plan.name).toBeDefined();
      expect(typeof plan.price).toBe("number");
      expect(plan.features).toBeDefined();
      expect(Array.isArray(plan.features)).toBe(true);
      expect(plan.features.length).toBeGreaterThan(0);
      expect(plan.period).toBeDefined();
    });
  });

  it("varsayılan olarak premium olmamalı", async () => {
    const isPremium = await PremiumManager.isPremium();
    expect(isPremium).toBe(false);
  });

  it("VOX eski tek seferlik satın alma geriye uyumlu olmalı", async () => {
    expect(await PremiumManager.isVoxPurchased()).toBe(false);
    await PremiumManager.purchaseVox();
    expect(await PremiumManager.isVoxPurchased()).toBe(true);
  });

  it("VOX satın alma sıfırlanabilmeli", async () => {
    await PremiumManager.purchaseVox();
    expect(await PremiumManager.isVoxPurchased()).toBe(true);
    await PremiumManager.resetVoxPurchase();
    expect(await PremiumManager.isVoxPurchased()).toBe(false);
  });

  it("geçersiz plan satın alınamamalı", async () => {
    const success = await PremiumManager.purchasePlan("nonexistent");
    expect(success).toBe(false);
  });

  it("abonelik iptal edilebilmeli", async () => {
    await PremiumManager.purchasePlan("vox_monthly");
    await PremiumManager.cancelSubscription();
    expect(await PremiumManager.isPremium()).toBe(false);
  });

  it("abonelik durumu alınabilmeli", async () => {
    const status = await PremiumManager.getSubscriptionStatus();
    expect(typeof status).toBe("string");
  });

  it("ücretsiz plan fiyatı 0 olmalı", () => {
    const freePlan = Object.values(SUBSCRIPTION_PLANS).find(
      (p: any) => p.id === "free"
    ) as any;
    expect(freePlan).toBeDefined();
    expect(freePlan.price).toBe(0);
    expect(freePlan.period).toBe("free");
  });

  it("VOX aylık plan 3.99$ olmalı", () => {
    const voxMonthly = SUBSCRIPTION_PLANS.VOX_MONTHLY;
    expect(voxMonthly).toBeDefined();
    expect(voxMonthly.price).toBe(3.99);
    expect(voxMonthly.period).toBe("monthly");
    expect(voxMonthly.productId).toBe("vox_monthly");
  });

  it("VOX yıllık plan 19.99$ olmalı", () => {
    const voxYearly = SUBSCRIPTION_PLANS.VOX_YEARLY;
    expect(voxYearly).toBeDefined();
    expect(voxYearly.price).toBe(19.99);
    expect(voxYearly.period).toBe("yearly");
    expect(voxYearly.productId).toBe("vox_yearly");
    expect(voxYearly.savingsPercent).toBe(58);
  });

  it("VOX aylık abonelik satın alınabilmeli", async () => {
    expect(await PremiumManager.isVoxPurchased()).toBe(false);
    await PremiumManager.purchaseVoxSubscription("monthly");
    expect(await PremiumManager.isVoxPurchased()).toBe(true);
    const sub = await PremiumManager.getVoxSubscription();
    expect(sub).not.toBeNull();
    expect(sub.period).toBe("monthly");
    expect(sub.isActive).toBe(true);
    expect(sub.productId).toBe("vox_monthly");
  });

  it("VOX yıllık abonelik satın alınabilmeli", async () => {
    expect(await PremiumManager.isVoxPurchased()).toBe(false);
    await PremiumManager.purchaseVoxSubscription("yearly");
    expect(await PremiumManager.isVoxPurchased()).toBe(true);
    const sub = await PremiumManager.getVoxSubscription();
    expect(sub).not.toBeNull();
    expect(sub.period).toBe("yearly");
    expect(sub.isActive).toBe(true);
    expect(sub.productId).toBe("vox_yearly");
  });

  it("VOX abonelik süresi doğru hesaplanmalı", async () => {
    await PremiumManager.purchaseVoxSubscription("monthly");
    const sub = await PremiumManager.getVoxSubscription();
    // Aylık abonelik ~30 gün sonra bitmeli
    const daysUntilExpiry = Math.ceil((sub.expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
    expect(daysUntilExpiry).toBeGreaterThanOrEqual(29);
    expect(daysUntilExpiry).toBeLessThanOrEqual(31);
  });

  it("VOX abonelik süre metni alınabilmeli", async () => {
    await PremiumManager.purchaseVoxSubscription("yearly");
    const text = await PremiumManager.getVoxExpiryText();
    expect(typeof text).toBe("string");
    expect(text).toContain("gün kaldı");
  });

  it("VOX abonelik sıfırlandığında her iki key de temizlenmeli", async () => {
    await PremiumManager.purchaseVoxSubscription("monthly");
    expect(await PremiumManager.isVoxPurchased()).toBe(true);
    await PremiumManager.resetVoxPurchase();
    expect(await PremiumManager.isVoxPurchased()).toBe(false);
    expect(await PremiumManager.getVoxSubscription()).toBeNull();
  });
});
