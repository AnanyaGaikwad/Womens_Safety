import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, GuardSettings } from '../types/detection';

const SETTINGS_KEY = 'union.soundGuard.settings';
const EVENTS_KEY = 'union.soundGuard.events';

export async function loadSettings(): Promise<GuardSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: GuardSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadEvents(): Promise<
  Array<{
    id: string;
    kind: string;
    confidence: number;
    timestamp: number;
    note: string;
    evidenceUri?: string | null;
  }>
> {
  try {
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function persistEvents(
  events: Array<{
    id: string;
    kind: string;
    confidence: number;
    timestamp: number;
    note: string;
    evidenceUri?: string | null;
  }>
): Promise<void> {
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(0, 40)));
}
