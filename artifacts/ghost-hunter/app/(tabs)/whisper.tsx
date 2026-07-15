import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getWhisperEngine, type WhisperStatus } from '@/lib/whisper-engine';
import * as Haptics from 'expo-haptics';

export default function WhisperScreen() {
  const [status, setStatus] = useState<WhisperStatus>({
    state: 'idle',
    nextWhisperIn: 0,
    lastWhisperIndex: null,
    totalWhispers: 0,
  });

  useEffect(() => {
    const engine = getWhisperEngine();
    engine.setStatusCallback(setStatus);
    return () => {
      engine.setStatusCallback(null);
    };
  }, []);

  const toggle = useCallback(async () => {
    const engine = getWhisperEngine();
    if (Platform.OS !== 'web') {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch { /* */ }
    }
    if (status.state === 'running') {
      engine.stop();
    } else {
      await engine.start();
    }
  }, [status.state]);

  const isRunning = status.state === 'running';

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}d ${s}s` : `${s}s`;
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Başlık */}
        <View style={styles.header}>
          <Text style={styles.title}>FISILTICI</Text>
          <Text style={styles.subtitle}>Paranormal Ses Motoru</Text>
        </View>

        {/* Ana durum */}
        <View style={styles.statusBox}>
          <View style={[styles.orb, isRunning && styles.orbActive]}>
            <IconSymbol
              size={48}
              name={isRunning ? 'waveform' : 'waveform.slash'}
              color={isRunning ? '#CC00FF' : '#2A2A40'}
            />
          </View>

          {isRunning ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>SONRAKİ FISILTIYA</Text>
              <Text style={styles.infoValue}>
                {status.nextWhisperIn > 0 ? formatTime(status.nextWhisperIn) : '...'}
              </Text>
              <Text style={styles.infoSub}>
                {status.totalWhispers} fısıltı çalındı
              </Text>
            </View>
          ) : (
            <Text style={styles.idleText}>
              Başlatmak için butona bas.{'\n'}50-100 saniyede bir{'\n'}paranormal fısıltı çalar.
            </Text>
          )}
        </View>

        {/* Son çalınan */}
        {isRunning && status.lastWhisperIndex !== null && (
          <View style={styles.lastBox}>
            <IconSymbol size={16} name="speaker.wave.2.fill" color="#CC00FF" />
            <Text style={styles.lastText}>
              Ses #{status.lastWhisperIndex + 1} çalındı
            </Text>
          </View>
        )}

        {/* Başlat/Durdur */}
        <Pressable
          style={[styles.button, isRunning && styles.buttonStop]}
          onPress={toggle}
        >
          <IconSymbol
            size={24}
            name={isRunning ? 'stop.fill' : 'play.fill'}
            color={isRunning ? '#FF4444' : '#0A0A0F'}
          />
          <Text style={[styles.buttonText, isRunning && styles.buttonTextStop]}>
            {isRunning ? 'DURDUR' : 'BAŞLAT'}
          </Text>
        </Pressable>

        {/* Bilgi */}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            🔊 Arka planda cızırtı sesi sürekli çalar{'\n'}
            👻 Her 50-100 saniyede rastgele bir fısıltı gelir{'\n'}
            🎧 Kulaklık takarak dinle
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 28,
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#CC00FF',
    letterSpacing: 6,
  },
  subtitle: {
    fontSize: 12,
    color: '#5A5A70',
    letterSpacing: 2,
  },
  statusBox: {
    alignItems: 'center',
    gap: 20,
  },
  orb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#0F0F1A',
    borderWidth: 2,
    borderColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbActive: {
    borderColor: '#CC00FF',
    shadowColor: '#CC00FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  infoBox: {
    alignItems: 'center',
    gap: 4,
  },
  infoLabel: {
    fontSize: 10,
    color: '#5A5A70',
    letterSpacing: 2,
  },
  infoValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#CC00FF',
    letterSpacing: 2,
  },
  infoSub: {
    fontSize: 12,
    color: '#5A5A70',
  },
  idleText: {
    fontSize: 14,
    color: '#5A5A70',
    textAlign: 'center',
    lineHeight: 22,
  },
  lastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F0F1A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1A1A2E',
  },
  lastText: {
    fontSize: 12,
    color: '#CC00FF',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#CC00FF',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 40,
  },
  buttonStop: {
    backgroundColor: '#1A0A0A',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A0A0F',
    letterSpacing: 3,
  },
  buttonTextStop: {
    color: '#FF4444',
  },
  noteBox: {
    backgroundColor: '#0F0F1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1A1A2E',
    width: '100%',
  },
  noteText: {
    fontSize: 12,
    color: '#5A5A70',
    lineHeight: 22,
    textAlign: 'center',
  },
});
