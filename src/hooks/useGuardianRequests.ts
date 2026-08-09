import { useCallback, useEffect, useState } from 'react';
import {
  createGuardianRequest,
  listIncomingPendingRequests,
  listOutgoingPendingRequests,
  respondToGuardianRequest,
} from '../services/GuardianRequestService';
import { ensureAnonymousRegistration } from '../services/AuthService';
import { isFirebaseReady } from '../services/firebase';
import { GuardianRequest } from '../types/guardianRequest';

export function useGuardianRequests() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [incoming, setIncoming] = useState<GuardianRequest[]>([]);
  const [outgoing, setOutgoing] = useState<GuardianRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isFirebaseReady()) {
        setIncoming([]);
        setOutgoing([]);
        return;
      }
      await ensureAnonymousRegistration();
      const [nextIncoming, nextOutgoing] = await Promise.all([
        listIncomingPendingRequests(),
        listOutgoingPendingRequests(),
      ]);
      setIncoming(nextIncoming);
      setOutgoing(nextOutgoing);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load guardian requests.'
      );
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sendRequest = useCallback(
    async (targetUid: string) => {
      setSending(true);
      setError(null);
      try {
        await ensureAnonymousRegistration();
        const created = await createGuardianRequest(targetUid);
        await refresh();
        return created;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to send request.';
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setSending(false);
      }
    },
    [refresh]
  );

  const accept = useCallback(
    async (requestId: string) => {
      setError(null);
      await respondToGuardianRequest(requestId, 'accepted');
      await refresh();
    },
    [refresh]
  );

  const reject = useCallback(
    async (requestId: string) => {
      setError(null);
      await respondToGuardianRequest(requestId, 'rejected');
      await refresh();
    },
    [refresh]
  );

  return {
    ready,
    loading,
    sending,
    incoming,
    outgoing,
    error,
    refresh,
    sendRequest,
    accept,
    reject,
    setError,
  };
}
