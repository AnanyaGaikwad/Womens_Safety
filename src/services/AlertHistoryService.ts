import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmergencyAlert } from '../types/alert';

const ALERTS_KEY = 'union.alerts.history';
const MAX_ALERTS = 50;

async function readAlerts(): Promise<EmergencyAlert[]> {
  try {
    const raw = await AsyncStorage.getItem(ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EmergencyAlert[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAlerts(alerts: EmergencyAlert[]): Promise<void> {
  await AsyncStorage.setItem(
    ALERTS_KEY,
    JSON.stringify(alerts.slice(0, MAX_ALERTS))
  );
}

/** Local-only emergency alert history (newest first). */
export const AlertHistoryService = {
  async getAlerts(): Promise<EmergencyAlert[]> {
    const alerts = await readAlerts();
    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  },

  async getAlertById(id: string): Promise<EmergencyAlert | null> {
    const alerts = await readAlerts();
    return alerts.find((alert) => alert.id === id) ?? null;
  },

  async saveAlert(alert: EmergencyAlert): Promise<EmergencyAlert> {
    const existing = await readAlerts();
    const without = existing.filter((item) => item.id !== alert.id);
    await writeAlerts([alert, ...without]);
    return alert;
  },

  async updateAlert(
    id: string,
    patch: Partial<EmergencyAlert>
  ): Promise<EmergencyAlert | null> {
    const existing = await readAlerts();
    const index = existing.findIndex((alert) => alert.id === id);
    if (index < 0) return null;
    const next = { ...existing[index], ...patch };
    existing[index] = next;
    await writeAlerts(existing);
    return next;
  },

  async clearAlerts(): Promise<void> {
    await writeAlerts([]);
  },
};

export async function getAlerts(): Promise<EmergencyAlert[]> {
  return AlertHistoryService.getAlerts();
}

export async function saveAlert(alert: EmergencyAlert): Promise<EmergencyAlert> {
  return AlertHistoryService.saveAlert(alert);
}
