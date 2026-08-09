import { useCallback, useEffect, useState } from 'react';
import { ensureAnonymousRegistration } from '../services/AuthService';
import { isFirebaseReady } from '../services/firebase';
import {
  listMyGuardians,
  listPeopleIProtect,
  removeRelationship,
  setRelationshipEnabled,
} from '../services/GuardianRelationshipService';
import { GuardianRelationship } from '../types/guardianRelationship';

export function useNetworkGuardians() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myGuardians, setMyGuardians] = useState<GuardianRelationship[]>([]);
  const [peopleIProtect, setPeopleIProtect] = useState<GuardianRelationship[]>(
    []
  );
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isFirebaseReady()) {
        setMyGuardians([]);
        setPeopleIProtect([]);
        return;
      }
      await ensureAnonymousRegistration();
      const [guardians, protectedPeople] = await Promise.all([
        listMyGuardians(),
        listPeopleIProtect(),
      ]);
      setMyGuardians(guardians);
      setPeopleIProtect(protectedPeople);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load network guardian relationships.'
      );
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleEnabled = useCallback(
    async (relationshipId: string, enabled: boolean) => {
      setError(null);
      await setRelationshipEnabled(relationshipId, enabled);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (relationshipId: string) => {
      setError(null);
      await removeRelationship(relationshipId);
      await refresh();
    },
    [refresh]
  );

  return {
    ready,
    loading,
    myGuardians,
    peopleIProtect,
    error,
    refresh,
    toggleEnabled,
    remove,
    setError,
  };
}
