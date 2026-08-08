import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addGuardian,
  getGuardians,
  notifyGuardians,
  removeGuardian,
  updateGuardian,
} from '../services/GuardianService';
import { Guardian, GuardianInput, GuardianUpdate } from '../types/guardian';

export function useGuardians() {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getGuardians();
      setGuardians(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guardians.');
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totalCount = guardians.length;
  const activeCount = useMemo(
    () => guardians.filter((guardian) => guardian.enabled).length,
    [guardians]
  );

  const create = useCallback(
    async (input: GuardianInput) => {
      setError(null);
      const created = await addGuardian(input);
      await refresh();
      return created;
    },
    [refresh]
  );

  const update = useCallback(
    async (id: string, updatePayload: GuardianUpdate) => {
      setError(null);
      const updated = await updateGuardian(id, updatePayload);
      await refresh();
      return updated;
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      setError(null);
      await removeGuardian(id);
      await refresh();
    },
    [refresh]
  );

  const toggleEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      await update(id, { enabled });
    },
    [update]
  );

  const stubNotify = useCallback(async () => {
    await notifyGuardians();
  }, []);

  return {
    ready,
    loading,
    error,
    guardians,
    totalCount,
    activeCount,
    refresh,
    create,
    update,
    remove,
    toggleEnabled,
    stubNotify,
    setError,
  };
}
