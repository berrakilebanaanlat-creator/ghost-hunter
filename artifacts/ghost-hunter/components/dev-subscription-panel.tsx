/**
 * DEV ABONELİK TEST PANELİ
 * Yalnızca __DEV__ modunda görünür — production build'lere dahil edilmez.
 *
 * Gerçek ödeme yapmadan Premium ekranındaki tüm durumları test eder.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  applyMockScenario,
  setMockPurchaseOutcome,
  type MockScenario,
  type MockPurchaseOutcome,
} from '@/lib/mock-subscription';

interface Props {
  /** Senaryo uygulandıktan sonra context'i yenilemek için çağrılır */
  onRefresh: () => Promise<void>;
  /** Fiyat yükleme durumunu dışarıdan override et */
  onOverridePricesLoading: (loading: boolean) => void;
  /** Mevcut abonelik durumu özeti */
  isVoxPurchased: boolean;
  isPricesLoading: boolean;
}

type SectionState = 'idle' | 'loading' | 'done' | 'error';

// ─── Yardımcı: renkli durum rozeti ───────────────────────────────────────────
function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <View style={[styles.badge, { backgroundColor: ok ? '#22C55E20' : '#EF444420' }]}>
      <Text style={{ color: ok ? '#22C55E' : '#EF4444', fontSize: 11, fontWeight: '700' }}>
        {ok ? '✓ AKTİF' : '✗ YOK'}
      </Text>
    </View>
  );
}

// ─── Yardımcı: test butonu ────────────────────────────────────────────────────
function TestBtn({
  label,
  color = '#7C3AED',
  onPress,
  loading,
}: {
  label: string;
  color?: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.testBtn,
        { borderColor: color + '60', backgroundColor: color + '18' },
        pressed && { opacity: 0.7 },
        loading && { opacity: 0.4 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Text style={[styles.testBtnText, { color }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function DevSubscriptionPanel({
  onRefresh,
  onOverridePricesLoading,
  isVoxPurchased,
  isPricesLoading,
}: Props) {
  const [scenarioState, setScenarioState] = useState<SectionState>('idle');
  const [purchaseState, setPurchaseState] = useState<SectionState>('idle');
  const [lastAction, setLastAction] = useState<string>('—');

  // ─── Senaryo uygula ───────────────────────────────────────────────────────
  const runScenario = async (scenario: MockScenario, label: string) => {
    setScenarioState('loading');
    setLastAction(label);
    try {
      if (scenario === 'prices_loading') {
        onOverridePricesLoading(true);
        setScenarioState('done');
        return;
      }
      if (scenario === 'prices_unavailable') {
        onOverridePricesLoading(false);   // prices=null ama loading=false → "İnternet uyarısı" tetiklenir
        setScenarioState('done');
        return;
      }
      await applyMockScenario(scenario);
      await onRefresh();
      setScenarioState('done');
    } catch {
      setScenarioState('error');
    }
    setTimeout(() => setScenarioState('idle'), 1500);
  };

  // ─── Satın alma sonucu ayarla ─────────────────────────────────────────────
  const setPurchaseResult = async (outcome: MockPurchaseOutcome, label: string) => {
    setPurchaseState('loading');
    setLastAction(label);
    try {
      await setMockPurchaseOutcome(outcome);
      setPurchaseState('done');
    } catch {
      setPurchaseState('error');
    }
    setTimeout(() => setPurchaseState('idle'), 1500);
  };

  return (
    <View style={styles.container}>
      {/* Başlık */}
      <View style={styles.header}>
        <Text style={styles.title}>🧪 TEST PANELİ</Text>
        <Text style={styles.subtitle}>Yalnızca geliştirme modunda görünür</Text>
      </View>

      {/* Mevcut durum özeti */}
      <View style={styles.statusRow}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>VOX Abonelik</Text>
          <StatusBadge ok={isVoxPurchased} />
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Fiyat Yükleniyor</Text>
          <StatusBadge ok={isPricesLoading} />
        </View>
      </View>

      {/* Son işlem */}
      <View style={styles.lastActionRow}>
        <Text style={styles.lastActionLabel}>Son İşlem: </Text>
        <Text style={styles.lastActionValue}>{lastAction}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
        {/* ─── BÖLÜM 1: Abonelik Durumları ─────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Abonelik Durumu</Text>
          <View style={styles.btnRow}>
            <TestBtn
              label="❌ Abonelik Yok"
              color="#EF4444"
              loading={scenarioState === 'loading'}
              onPress={() => runScenario('no_subscription', 'Abonelik sıfırlandı')}
            />
            <TestBtn
              label="✅ Aylık Aktif"
              color="#22C55E"
              loading={scenarioState === 'loading'}
              onPress={() => runScenario('monthly_active', 'Aylık abonelik ayarlandı')}
            />
            <TestBtn
              label="⭐ Yıllık Aktif"
              color="#F59E0B"
              loading={scenarioState === 'loading'}
              onPress={() => runScenario('yearly_active', 'Yıllık abonelik ayarlandı')}
            />
            <TestBtn
              label="⏰ Süresi Doldu"
              color="#6B7280"
              loading={scenarioState === 'loading'}
              onPress={() => runScenario('expired', 'Süresi dolmuş abonelik ayarlandı')}
            />
          </View>
        </View>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
        {/* ─── BÖLÜM 2: Fiyat/Yükleme Durumları ───────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💲 Fiyat & Yükleme</Text>
          <View style={styles.btnRow}>
            <TestBtn
              label="⏳ Fiyat Yükleniyor..."
              color="#7C3AED"
              loading={scenarioState === 'loading'}
              onPress={() => runScenario('prices_loading', 'Fiyat yükleme simüle edildi')}
            />
            <TestBtn
              label="🌐 İnternet Bağlantı Hatası"
              color="#EF4444"
              loading={scenarioState === 'loading'}
              onPress={() => {
                onOverridePricesLoading(false);
                setLastAction('Fiyat null → internet uyarısı tetiklenir');
              }}
            />
            <TestBtn
              label="✅ Fiyatlar Yüklendi"
              color="#22C55E"
              loading={scenarioState === 'loading'}
              onPress={() => {
                onOverridePricesLoading(false);
                setLastAction('Fiyat yükleme tamamlandı');
              }}
            />
          </View>
        </View>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {/* ─── BÖLÜM 3: Satın Alma Simülasyonu ────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛒 Sonraki Satın Alma Sonucu</Text>
          <Text style={styles.sectionNote}>
            Aşağıdan seçtikten sonra butona bas — Google Play yerine mock sonuç döner.
          </Text>
          <View style={styles.btnRow}>
            <TestBtn
              label="✅ Aylık Başarılı"
              color="#22C55E"
              loading={purchaseState === 'loading'}
              onPress={() => setPurchaseResult('success_monthly', '→ Sonraki: Aylık başarılı')}
            />
            <TestBtn
              label="⭐ Yıllık Başarılı"
              color="#F59E0B"
              loading={purchaseState === 'loading'}
              onPress={() => setPurchaseResult('success_yearly', '→ Sonraki: Yıllık başarılı')}
            />
            <TestBtn
              label="❌ Satın Alma Hatası"
              color="#EF4444"
              loading={purchaseState === 'loading'}
              onPress={() => setPurchaseResult('error', '→ Sonraki: Hata mesajı gösterilecek')}
            />
            <TestBtn
              label="↩️ İptal Edildi"
              color="#6B7280"
              loading={purchaseState === 'loading'}
              onPress={() => setPurchaseResult('cancelled', '→ Sonraki: Sessiz iptal')}
            />
          </View>
        </View>
      </ScrollView>

      {purchaseState === 'done' && (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>
            ✓ Mock sonuç ayarlandı. Şimdi yukarıdaki satın al butonuna basabilirsin.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#7C3AED50',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#0D0B1A',
  },
  header: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#7C3AED30',
    paddingBottom: 8,
  },
  title: {
    color: '#C084FC',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#6B5E8A',
    fontSize: 10,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  statusItem: {
    flex: 1,
    backgroundColor: '#13102A',
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  statusLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  lastActionRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  lastActionLabel: {
    color: '#6B7280',
    fontSize: 11,
  },
  lastActionValue: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  section: {
    minWidth: 280,
    marginRight: 8,
    backgroundColor: '#13102A',
    borderRadius: 8,
    padding: 10,
  },
  sectionTitle: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionNote: {
    color: '#6B5E8A',
    fontSize: 10,
    marginBottom: 6,
    lineHeight: 14,
  },
  btnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  testBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  hintBox: {
    marginTop: 8,
    backgroundColor: '#22C55E15',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#22C55E30',
  },
  hintText: {
    color: '#22C55E',
    fontSize: 11,
    lineHeight: 16,
  },
});
