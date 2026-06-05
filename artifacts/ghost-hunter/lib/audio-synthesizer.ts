/**
 * Web Audio API ile Ses Sentezleme
 * Paranormal ses efektleri oluşturmak için kullanılır
 */

interface AudioContext {
  context: globalThis.AudioContext | null;
  isSupported: boolean;
}

let audioContextInstance: AudioContext = {
  context: null,
  isSupported: typeof window !== "undefined" && !!(window as any).AudioContext,
};

/**
 * Audio Context'i al veya oluştur
 */
export function getAudioContext(): globalThis.AudioContext | null {
  if (!audioContextInstance.isSupported) {
    console.warn("Web Audio API desteklenmiyor");
    return null;
  }

  if (!audioContextInstance.context) {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioContextInstance.context = new AudioContextClass();
    } catch (error) {
      console.error("Audio Context oluşturulamadı:", error);
      return null;
    }
  }

  return audioContextInstance.context;
}

/**
 * Frekans tabanlı ses sentezle (sine wave)
 * @param frequency - Frekans (Hz)
 * @param duration - Süre (ms)
 * @param volume - Ses seviyesi (0-1)
 */
export async function synthesizeFrequency(
  frequency: number,
  duration: number = 500,
  volume: number = 0.3
): Promise<void> {
  const context = getAudioContext();
  if (!context) return;

  try {
    // Oscillator oluştur
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    // Ayarları yap
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gainNode.gain.value = volume;

    // Bağlantı kur
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    // Çal
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + duration / 1000);
  } catch (error) {
    console.error("Ses sentezleme hatası:", error);
  }
}

/**
 * Statik gürültü sesi çal
 * @param duration - Süre (ms)
 * @param volume - Ses seviyesi (0-1)
 */
export async function playStaticNoise(
  duration: number = 300,
  volume: number = 0.2
): Promise<void> {
  const context = getAudioContext();
  if (!context) return;

  try {
    // Buffer oluştur
    const bufferSize = context.sampleRate * (duration / 1000);
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);

    // Rastgele gürültü oluştur
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Kaynak ve gain oluştur
    const source = context.createBufferSource();
    const gainNode = context.createGain();

    // Ayarları yap
    source.buffer = buffer;
    gainNode.gain.value = volume;

    // Bağlantı kur
    source.connect(gainNode);
    gainNode.connect(context.destination);

    // Çal
    source.start(context.currentTime);
  } catch (error) {
    console.error("Statik gürültü oynatma hatası:", error);
  }
}

/**
 * FM frekans tarama sesi (sweep)
 * @param startFreq - Başlangıç frekansı (Hz)
 * @param endFreq - Bitiş frekansı (Hz)
 * @param duration - Süre (ms)
 * @param volume - Ses seviyesi (0-1)
 */
export async function playFrequencySweep(
  startFreq: number,
  endFreq: number,
  duration: number = 1000,
  volume: number = 0.3
): Promise<void> {
  const context = getAudioContext();
  if (!context) return;

  try {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    // Ayarları yap
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(startFreq, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      endFreq,
      context.currentTime + duration / 1000
    );

    gainNode.gain.value = volume;

    // Bağlantı kur
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    // Çal
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + duration / 1000);
  } catch (error) {
    console.error("Frekans sweep hatası:", error);
  }
}

/**
 * Paranormal ses efekti (statik + frekans kombinasyonu)
 * @param baseFrequency - Temel frekans (Hz)
 * @param duration - Süre (ms)
 * @param volume - Ses seviyesi (0-1)
 */
export async function playParanormalEffect(
  baseFrequency: number,
  duration: number = 500,
  volume: number = 0.25
): Promise<void> {
  const context = getAudioContext();
  if (!context) return;

  try {
    // Oscillator (temel frekans)
    const osc1 = context.createOscillator();
    const osc2 = context.createOscillator();
    const gainNode1 = context.createGain();
    const gainNode2 = context.createGain();
    const masterGain = context.createGain();

    // Osc1: Temel frekans
    osc1.type = "sine";
    osc1.frequency.value = baseFrequency;
    gainNode1.gain.value = volume * 0.6;

    // Osc2: Harmonik (temel frekansın 1.5x katı)
    osc2.type = "square";
    osc2.frequency.value = baseFrequency * 1.5;
    gainNode2.gain.value = volume * 0.3;

    masterGain.gain.value = 0.8;

    // Bağlantılar
    osc1.connect(gainNode1);
    osc2.connect(gainNode2);
    gainNode1.connect(masterGain);
    gainNode2.connect(masterGain);
    masterGain.connect(context.destination);

    // Çal
    osc1.start(context.currentTime);
    osc2.start(context.currentTime);
    osc1.stop(context.currentTime + duration / 1000);
    osc2.stop(context.currentTime + duration / 1000);
  } catch (error) {
    console.error("Paranormal efekt oynatma hatası:", error);
  }
}

/**
 * Whisper (fısıltı) sesi
 */
export async function playWhisper(duration: number = 500, volume: number = 0.2): Promise<void> {
  // Düşük frekans + statik kombinasyonu
  await playParanormalEffect(2000, duration, volume);
}

/**
 * Screech (çığlık) sesi
 */
export async function playScreech(duration: number = 400, volume: number = 0.3): Promise<void> {
  // Yüksek frekans sweep
  await playFrequencySweep(8000, 4000, duration, volume);
}

/**
 * Moan (inilti) sesi
 */
export async function playMoan(duration: number = 800, volume: number = 0.25): Promise<void> {
  // Düşük frekans sweep
  await playFrequencySweep(150, 200, duration, volume);
}

/**
 * Distortion (bozulma) sesi
 */
export async function playDistortion(duration: number = 600, volume: number = 0.25): Promise<void> {
  const context = getAudioContext();
  if (!context) return;

  try {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const distortion = context.createWaveShaper();

    // Distortion eğrisi oluştur
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + 100) * x * 20) / (Math.PI + 100 * Math.abs(x));
    }
    distortion.curve = curve;

    // Ayarları yap
    oscillator.type = "sine";
    oscillator.frequency.value = 3000;
    gainNode.gain.value = volume;

    // Bağlantılar
    oscillator.connect(distortion);
    distortion.connect(gainNode);
    gainNode.connect(context.destination);

    // Çal
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + duration / 1000);
  } catch (error) {
    console.error("Distortion oynatma hatası:", error);
  }
}

/**
 * Tüm ses bağlamlarını temizle
 */
export function stopAllAudio(): void {
  const context = getAudioContext();
  if (context) {
    try {
      context.close();
      audioContextInstance.context = null;
    } catch (error) {
      console.error("Audio context kapatma hatası:", error);
    }
  }
}
