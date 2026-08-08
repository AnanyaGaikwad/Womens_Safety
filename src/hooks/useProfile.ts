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
import {
  ensurePushTokenRegistration,
  getLastPushRegistrationResult,
  NotificationStatusLabel,
} from '../services/PushService';
import { updateDisplayName } from '../services/UserService';
import { UnionUser } from '../types/user';

export type RegistrationStatusLabel =
  | 'Registered'
  | 'Pending'
  | 'Unavailable'
  | 'Error';

export type { NotificationStatusLabel };

export function useProfile() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UnionUser | null>(null);
  const [unionId, setUnionId] = useState<string | null>(null);
  const [registrationStatus, setRegistrationStatus] =
    useState<RegistrationStatusLabel>('Pending');
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationStatusLabel>('Not configured');
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isFirebaseReady()) {
        setUser(null);
        setUnionId(null);
        setRegistrationStatus('Unavailable');
        setNotificationStatus('Not configured');
        setExpoPushToken(null);
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
        setNotificationStatus('Not configured');
        setExpoPushToken(null);
        setError(result.error);
        return;
      }

      if (result.registered && result.user) {
        const uid = result.authUid ?? result.user.uid;
        setUnionId(uid);
        setRegistrationStatus('Registered');

        const push = await ensurePushTokenRegistration(uid);
        const nextUser: UnionUser = {
          ...result.user,
          expoPushToken: push.token ?? result.user.expoPushToken ?? null,
        };
        if (push.token) {
          patchLastRegisteredUser(nextUser);
        }
        setUser(nextUser);
        setNotificationStatus(push.status);
        setExpoPushToken(push.token);
        setError(push.error && push.status !== 'Configured' ? push.error : null);
        return;
      }

      setUser(result.user);
      setUnionId(result.authUid);
      setRegistrationStatus(result.error ? 'Error' : 'Pending');
      setNotificationStatus(
        getLastPushRegistrationResult()?.status ?? 'Not configured'
      );
      setExpoPushToken(getLastPushRegistrationResult()?.token ?? null);
      setError(result.error);
    } catch (err) {
      setRegistrationStatus('Error');
      setNotificationStatus('Not configured');
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
        const merged: UnionUser = {
          ...updated,
          expoPushToken: updated.expoPushToken ?? expoPushToken,
        };
        patchLastRegisteredUser(merged);
        setUser(merged);
        setRegistrationStatus('Registered');
        return merged;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not save display name.';
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setSaving(false);
      }
    },
    [expoPushToken, unionId]
  );

  return {
    ready,
    loading,
    saving,
    user,
    unionId,
    registrationStatus,
    notificationStatus,
    expoPushToken,
    error,
    refresh,
    saveDisplayName,
  };
}
