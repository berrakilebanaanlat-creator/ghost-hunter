/**
 * VOX Audio Archive
 * Tarama sırasında algılanan paranormal sesleri arşivle
 */

export interface ArchivedSound {
  id: string;
  timestamp: number;
  soundName: string;
  frequency: number;
  signalStrength: number;
  duration: number;
  type: "white_noise" | "paranormal_sound";
}

export interface AudioArchiveSession {
  id: string;
  startTime: number;
  endTime?: number;
  totalSounds: number;
  paranormalSounds: ArchivedSound[];
  whiteNoiseSounds: ArchivedSound[];
  averageSignalStrength: number;
  peakSignalStrength: number;
}

/**
 * VOX Audio Archive Manager
 */
export class VoxAudioArchiveManager {
  private sessions: AudioArchiveSession[] = [];
  private currentSession: AudioArchiveSession | null = null;

  /**
   * Yeni arşiv oturumu başlat
   */
  startArchiveSession(): AudioArchiveSession {
    this.currentSession = {
      id: Math.random().toString(36).substring(7),
      startTime: Date.now(),
      totalSounds: 0,
      paranormalSounds: [],
      whiteNoiseSounds: [],
      averageSignalStrength: 0,
      peakSignalStrength: 0,
    };

    return this.currentSession;
  }

  /**
   * Arşiv oturumunu sonlandır
   */
  endArchiveSession(): AudioArchiveSession | null {
    if (!this.currentSession) return null;

    this.currentSession.endTime = Date.now();
    this.sessions.push(this.currentSession);

    const session = this.currentSession;
    this.currentSession = null;

    return session;
  }

  /**
   * Ses ekle
   */
  addSound(sound: ArchivedSound): void {
    if (!this.currentSession) {
      this.startArchiveSession();
    }

    if (this.currentSession) {
      if (sound.type === "paranormal_sound") {
        this.currentSession.paranormalSounds.push(sound);
      } else {
        this.currentSession.whiteNoiseSounds.push(sound);
      }

      this.currentSession.totalSounds++;

      // Ortalama sinyal gücü hesapla
      const allSounds = [
        ...this.currentSession.paranormalSounds,
        ...this.currentSession.whiteNoiseSounds,
      ];
      this.currentSession.averageSignalStrength =
        allSounds.reduce((sum, s) => sum + s.signalStrength, 0) / allSounds.length;

      // En yüksek sinyal gücü güncelle
      if (sound.signalStrength > this.currentSession.peakSignalStrength) {
        this.currentSession.peakSignalStrength = sound.signalStrength;
      }
    }
  }

  /**
   * Mevcut oturumu al
   */
  getCurrentSession(): AudioArchiveSession | null {
    return this.currentSession;
  }

  /**
   * Tüm oturumları al
   */
  getAllSessions(): AudioArchiveSession[] {
    return this.sessions;
  }

  /**
   * Belirli bir oturumu al
   */
  getSession(sessionId: string): AudioArchiveSession | undefined {
    return this.sessions.find((s) => s.id === sessionId);
  }

  /**
   * Oturumu sil
   */
  deleteSession(sessionId: string): void {
    this.sessions = this.sessions.filter((s) => s.id !== sessionId);
  }

  /**
   * Tüm arşivi temizle
   */
  clearArchive(): void {
    this.sessions = [];
    this.currentSession = null;
  }

  /**
   * Oturumdan paranormal sesleri al
   */
  getParanormalSounds(sessionId: string): ArchivedSound[] {
    const session = this.getSession(sessionId);
    return session ? session.paranormalSounds : [];
  }

  /**
   * Oturumdan beyaz gürültü seslerini al
   */
  getWhiteNoiseSounds(sessionId: string): ArchivedSound[] {
    const session = this.getSession(sessionId);
    return session ? session.whiteNoiseSounds : [];
  }

  /**
   * Oturumdan belirli bir sesi al
   */
  getSound(sessionId: string, soundId: string): ArchivedSound | undefined {
    const session = this.getSession(sessionId);
    if (!session) return undefined;

    return [
      ...session.paranormalSounds,
      ...session.whiteNoiseSounds,
    ].find((s) => s.id === soundId);
  }

  /**
   * Oturumdan sesi sil
   */
  deleteSound(sessionId: string, soundId: string): void {
    const session = this.getSession(sessionId);
    if (!session) return;

    session.paranormalSounds = session.paranormalSounds.filter(
      (s) => s.id !== soundId
    );
    session.whiteNoiseSounds = session.whiteNoiseSounds.filter(
      (s) => s.id !== soundId
    );
    session.totalSounds--;

    // Ortalama sinyal gücü yeniden hesapla
    const allSounds = [
      ...session.paranormalSounds,
      ...session.whiteNoiseSounds,
    ];
    if (allSounds.length > 0) {
      session.averageSignalStrength =
        allSounds.reduce((sum, s) => sum + s.signalStrength, 0) / allSounds.length;
    }
  }

  /**
   * Oturumun istatistiklerini al
   */
  getSessionStats(sessionId: string) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      duration: (session.endTime || Date.now()) - session.startTime,
      totalSounds: session.totalSounds,
      paranormalSoundCount: session.paranormalSounds.length,
      whiteNoiseSoundCount: session.whiteNoiseSounds.length,
      averageSignalStrength: session.averageSignalStrength,
      peakSignalStrength: session.peakSignalStrength,
      startTime: session.startTime,
      endTime: session.endTime,
    };
  }

  /**
   * Arşiv istatistiklerini al
   */
  getArchiveStats() {
    return {
      totalSessions: this.sessions.length,
      totalSounds: this.sessions.reduce((sum, s) => sum + s.totalSounds, 0),
      totalParanormalSounds: this.sessions.reduce(
        (sum, s) => sum + s.paranormalSounds.length,
        0
      ),
      totalWhiteNoiseSounds: this.sessions.reduce(
        (sum, s) => sum + s.whiteNoiseSounds.length,
        0
      ),
      averageSignalStrength:
        this.sessions.length > 0
          ? this.sessions.reduce((sum, s) => sum + s.averageSignalStrength, 0) /
            this.sessions.length
          : 0,
      peakSignalStrength: Math.max(
        0,
        ...this.sessions.map((s) => s.peakSignalStrength)
      ),
    };
  }
}

// Singleton instance
export const voxAudioArchiveManager = new VoxAudioArchiveManager();
