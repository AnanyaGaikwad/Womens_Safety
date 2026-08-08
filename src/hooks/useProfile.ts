import { useCallback, useEffect, useState } from 'react';
import {
  ensureAnonymousRegistration,
  getLastRegistrationResult,
  patchLastRegisteredUser,
} from '../services/AuthService';
import {
  getFirebaseError,
  getFirebaseStatus,
  isFirebaseReady,
} from '../services/firebase';
import { updateDisplayName } from '../services/UserService';
import { UnionUser } from '../types/user';

export type RegistrationStatusLabel =
  | 'Registered'
  | 'Pending'
  | 'Unavailable'
  | 'Error';

export type NotificationStatusLabel = 'Not configured';

export function useProfile() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UnionUser | null>(null);
  const [unionId, setUnionId] = useState<string | null>(null);
  const [registrationStatus, setRegistrationStatus] =
    useState<RegistrationStatusLabel>('Pending');
  const [error, setError] = useState<string | null>(null);

  const notificationStatus: NotificationStatusLabel = 'Not configured';

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isFirebaseReady()) {
        setUser(null);
        setUnionId(null);
        setRegistrationStatus('Unavailable');
        setError(getFirebaseError());
        return;
      }

      const cached = getLastRegistrationResult();
      const result =
        cached?.registered && cached.user
          ? cached
          : await ensureAnonymousRegistration();

      if (result.skipped || getFirebaseStatus() === 'unavailable') {
        setUser(null);
        setUnionId(result.authUid);
        setRegistrationStatus('Unavailable');
        setError(result.error);
        return;
      }

      if (result.registered && result.user) {
        setUser(result.user);
        setUnionId(result.authUid ?? result.user.uid);
        setRegistrationStatus('Registered');
        setError(null);
        return;
      }

      setUser(result.user);
      setUnionId(result.authUid);
      setRegistrationStatus(result.error ? 'Error' : 'Pending');
      setError(result.error);
    } catch (err) {
      setRegistrationStatus('Error');
      setError(err instanceof Error ? err.message : 'Failed to load profile.');
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveDisplayName = useCallback(
    async (displayName: string) => {
      if (!unionId) {
        throw new Error('You are not registered yet.');
      }
      setSaving(true);
      setError(null);
      try {
        const updated = await updateDisplayName(unionId, displayName);
        if (!updated) {
          throw new Error('Could not save display name.');
        }
        patchLastRegisteredUser(updated);
        setUser(updated);
        setRegistrationStatus('Registered');
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not save display name.';
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setSaving(false);
      }
    },
    [unionId]
  );

  return {
    ready,
    loading,
    saving,
    user,
    unionId,
    registrationStatus,
    notificationStatus,
    error,
    refresh,
    saveDisplayName,
  };
}
