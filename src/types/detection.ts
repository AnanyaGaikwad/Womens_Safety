export type DetectionKind = 'scream' | 'distress' | 'safeword';

export type DetectionEvent = {
  id: string;
  kind: DetectionKind;
  confidence: number;
  timestamp: number;
  note: string;
  evidenceUri?: string | null;
};

export type GuardStatus =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'triggered'
  | 'error';

export type GuardSettings = {
  safeWord: string;
  screamThresholdDb: number;
  screamSpikeDb: number;
  distressWindowMs: number;
  distressMinSpikes: number;
  cooldownMs: number;
};

export const DEFAULT_SETTINGS: GuardSettings = {
  safeWord: 'red lantern',
  screamThresholdDb: -18,
  screamSpikeDb: 22,
  distressWindowMs: 2800,
  distressMinSpikes: 4,
  cooldownMs: 8000,
};

export type AudioSnapshot = {
  db: number;
  normalized: number;
  timestamp: number;
};
