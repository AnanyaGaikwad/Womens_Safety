import { useCallback, useEffect, useState } from 'react';
import { AlertHistoryService } from '../services/AlertHistoryService';
import { EmergencyAlert } from '../types/alert';

export function useAlertHistory() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const next = await AlertHistoryService.getAlerts();
      setAlerts(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alert history.');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const clear = useCallback(async () => {
    await AlertHistoryService.clearAlerts();
    setAlerts([]);
  }, []);

  return { ready, alerts, error, refresh, clear };
}
