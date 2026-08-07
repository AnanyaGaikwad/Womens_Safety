import { AudioSnapshot, DetectionKind, GuardSettings } from '../types/detection';

type Spike = { timestamp: number; db: number };

/**
 * Local, low-power heuristic detector.
 * Uses loudness metering (dBFS) to catch screams and sustained distress patterns.
 * Safe-word detection is handled separately via speech recognition.
 */
export class SoundPatternAnalyzer {
  private baseline = -55;
  private samples: AudioSnapshot[] = [];
  private spikes: Spike[] = [];
  private lastTriggerAt = 0;

  reset() {
    this.baseline = -55;
    this.samples = [];
    this.spikes = [];
    this.lastTriggerAt = 0;
  }

  ingest(db: number, settings: GuardSettings, now = Date.now()): DetectionKind | null {
    const snapshot: AudioSnapshot = {
      db,
      normalized: this.normalize(db),
      timestamp: now,
    };

    this.samples.push(snapshot);
    if (this.samples.length > 48) this.samples.shift();

    // Slow baseline adaptation so ambient noise doesn't constantly fire.
    if (db < this.baseline) {
      this.baseline = this.baseline * 0.92 + db * 0.08;
    } else {
      this.baseline = this.baseline * 0.995 + db * 0.005;
    }

    const spike = db - this.baseline;
    const isLoud = db >= settings.screamThresholdDb;
    const isSudden = spike >= settings.screamSpikeDb;

    if (isLoud && isSudden) {
      this.spikes.push({ timestamp: now, db });
    }

    this.spikes = this.spikes.filter(
      (s) => now - s.timestamp <= settings.distressWindowMs
    );

    if (now - this.lastTriggerAt < settings.cooldownMs) {
      return null;
    }

    // Classic scream: one sharp, very loud burst above ambient.
    if (isLoud && isSudden && spike >= settings.screamSpikeDb + 4) {
      this.lastTriggerAt = now;
      return 'scream';
    }

    // Physical distress: repeated loud irregular spikes in a short window.
    if (this.spikes.length >= settings.distressMinSpikes) {
      const variance = this.spikeVariance(this.spikes);
      if (variance > 8) {
        this.lastTriggerAt = now;
        this.spikes = [];
        return 'distress';
      }
    }

    return null;
  }

  getLevel(): number {
    const last = this.samples[this.samples.length - 1];
    return last?.normalized ?? 0;
  }

  getDb(): number {
    const last = this.samples[this.samples.length - 1];
    return last?.db ?? -160;
  }

  private normalize(db: number): number {
    // Map roughly -70..0 dBFS into 0..1 for the UI meter.
    const clamped = Math.max(-70, Math.min(0, db));
    return (clamped + 70) / 70;
  }

  private spikeVariance(spikes: Spike[]): number {
    if (spikes.length < 2) return 0;
    const mean = spikes.reduce((sum, s) => sum + s.db, 0) / spikes.length;
    const variance =
      spikes.reduce((sum, s) => sum + (s.db - mean) ** 2, 0) / spikes.length;
    return variance;
  }
}

export function matchesSafeWord(transcript: string, safeWord: string): boolean {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const haystack = normalize(transcript);
  const needle = normalize(safeWord);
  if (!needle) return false;
  return haystack.includes(needle);
}
