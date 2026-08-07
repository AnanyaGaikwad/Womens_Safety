import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { matchesSafeWord, SoundPatternAnalyzer } from './soundAnalyzer';
import { DetectionKind, GuardSettings } from '../types/detection';

type LevelListener = (normalized: number, db: number) => void;
type DetectionListener = (kind: DetectionKind, confidence: number, note: string) => void;
type ErrorListener = (message: string) => void;

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

/**
 * Continuous local audio monitor.
 * - Native: expo-av recording metering
 * - Web: Web Audio AnalyserNode (expo-av metering is limited on web)
 * Safe-word uses Web Speech API when available.
 */
export class SoundMonitor {
  private analyzer = new SoundPatternAnalyzer();
  private settings: GuardSettings;
  private recording: Audio.Recording | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private rafId: number | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyserNode: AnalyserNode | null = null;
  private speech: SpeechRecognitionLike | null = null;
  private running = false;
  private onLevel: LevelListener | null = null;
  private onDetection: DetectionListener | null = null;
  private onError: ErrorListener | null = null;

  constructor(settings: GuardSettings) {
    this.settings = settings;
  }

  updateSettings(settings: GuardSettings) {
    this.settings = settings;
  }

  setListeners(listeners: {
    onLevel?: LevelListener;
    onDetection?: DetectionListener;
    onError?: ErrorListener;
  }) {
    this.onLevel = listeners.onLevel ?? null;
    this.onDetection = listeners.onDetection ?? null;
    this.onError = listeners.onError ?? null;
  }

  async start() {
    if (this.running) return;
    this.running = true;
    this.analyzer.reset();

    try {
      if (Platform.OS === 'web') {
        await this.startWeb();
      } else {
        await this.startNative();
      }
      this.startSafeWordListener();
    } catch (error) {
      this.running = false;
      const message =
        error instanceof Error ? error.message : 'Unable to access the microphone.';
      this.onError?.(message);
      throw error;
    }
  }

  async stop() {
    this.running = false;
    this.stopSafeWordListener();

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.rafId != null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch {
        // ignore teardown errors
      }
      this.recording = null;
    }

    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;
    this.analyserNode = null;

    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }
  }

  /** Manual test hook for environments without a mic or speech API. */
  simulate(kind: DetectionKind) {
    const notes: Record<DetectionKind, string> = {
      scream: 'Simulated scream pattern detected.',
      distress: 'Simulated distress pattern detected.',
      safeword: `Simulated safe-word “${this.settings.safeWord}” spoken.`,
    };
    this.onDetection?.(kind, 0.95, notes[kind]);
  }

  private async startNative() {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync({
      ...Audio.RecordingOptionsPresets.LOW_QUALITY,
      isMeteringEnabled: true,
    });
    recording.setProgressUpdateInterval(120);
    recording.setOnRecordingStatusUpdate((status) => {
      if (!status.isRecording || typeof status.metering !== 'number') return;
      this.handleDb(status.metering);
    });
    await recording.startAsync();
    this.recording = recording;

    // Fallback poll in case status updates are sparse.
    this.pollTimer = setInterval(async () => {
      if (!this.recording) return;
      try {
        const status = await this.recording.getStatusAsync();
        if (status.isRecording && typeof status.metering === 'number') {
          this.handleDb(status.metering);
        }
      } catch {
        // ignore
      }
    }, 250);
  }

  private async startWeb() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access is not available in this browser.');
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
      video: false,
    });

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioCtx();
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.65;
    source.connect(this.analyserNode);

    const data = new Float32Array(this.analyserNode.fftSize);
    const tick = () => {
      if (!this.running || !this.analyserNode) return;
      this.analyserNode.getFloatTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i += 1) {
        sumSquares += data[i] * data[i];
      }
      const rms = Math.sqrt(sumSquares / data.length);
      const db = rms > 0 ? 20 * Math.log10(rms) : -160;
      this.handleDb(db);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private handleDb(db: number) {
    const kind = this.analyzer.ingest(db, this.settings);
    this.onLevel?.(this.analyzer.getLevel(), db);

    if (!kind) return;

    if (kind === 'safeword') return;

    const confidence =
      kind === 'scream'
        ? Math.min(0.99, 0.7 + (db + 30) / 40)
        : 0.78 + Math.min(0.2, this.analyzer.getLevel() * 0.2);

    const notes: Record<'scream' | 'distress', string> = {
      scream: 'Sudden high-intensity vocal burst consistent with a scream.',
      distress: 'Repeated irregular loud spikes consistent with physical distress.',
    };

    this.onDetection?.(kind, confidence, notes[kind]);
  }

  private startSafeWordListener() {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;

    const speech = new Recognition();
    speech.continuous = true;
    speech.interimResults = true;
    speech.lang = 'en-US';

    speech.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0]?.transcript ?? '';
      }
      if (!matchesSafeWord(transcript, this.settings.safeWord)) return;
      this.onDetection?.(
        'safeword',
        0.92,
        `Verbal safe-word “${this.settings.safeWord}” recognized locally.`
      );
    };

    speech.onerror = () => {
      // Speech API can fail intermittently; monitoring continues via metering.
    };

    speech.onend = () => {
      if (!this.running) return;
      try {
        speech.start();
      } catch {
        // ignore restart races
      }
    };

    try {
      speech.start();
      this.speech = speech;
    } catch (error) {
      this.onError?.(
        error instanceof Error
          ? error.message
          : 'Safe-word speech recognition could not start.'
      );
    }
  }

  private stopSafeWordListener() {
    if (!this.speech) return;
    try {
      this.speech.onend = null;
      this.speech.stop();
    } catch {
      // ignore
    }
    this.speech = null;
  }
}
