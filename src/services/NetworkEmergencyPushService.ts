import { EmergencyAlert, REASON_LABEL } from '../types/alert';
import { getFirebaseAuth, isFirebaseReady } from './firebase';
import { listMyGuardians } from './GuardianRelationshipService';
import { getUserDocument } from './UserService';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function maskToken(token: string): string {
  const trimmed = token.trim();
  if (trimmed.length <= 16) return '***';
  return `${trimmed.slice(0, 12)}…${trimmed.slice(-4)}`;
}

function toPayloadData(alert: EmergencyAlert, ownerUid: string, ownerDisplayName: string) {
  return {
    type: 'guardian_alert',
    alertId: alert.id,
    ownerUid,
    ownerDisplayName,
    reason: alert.reason,
    timestamp: String(alert.timestamp),
    latitude:
      alert.location.available && alert.location.latitude != null
        ? alert.location.latitude
        : null,
    longitude:
      alert.location.available && alert.location.longitude != null
        ? alert.location.longitude
        : null,
    note: alert.note ?? '',
  };
}

async function sendExpoPush(message: Record<string, unknown>): Promise<void> {
  console.log('[UNION PUSH DEBUG] Sending Expo request');
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  const raw = await response.text();
  console.log(`[UNION PUSH DEBUG] Expo HTTP status: ${response.status}`);
  console.log(`[UNION PUSH DEBUG] Expo response: ${raw}`);

  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = raw;
  }

  if (!response.ok) {
    throw new Error(
      `Expo Push HTTP ${response.status}: ${
        typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
      }`
    );
  }

  const ticket =
    parsed &&
    typeof parsed === 'object' &&
    'data' in parsed
      ? (parsed as { data: unknown }).data
      : parsed;

  const ticketObj = Array.isArray(ticket) ? ticket[0] : ticket;
  const status =
    ticketObj && typeof ticketObj === 'object' && 'status' in ticketObj
      ? String((ticketObj as { status: unknown }).status)
      : 'unknown';
  const ticketId =
    ticketObj && typeof ticketObj === 'object' && 'id' in ticketObj
      ? String((ticketObj as { id: unknown }).id)
      : null;

  if (status !== 'ok') {
    const messageText =
      ticketObj && typeof ticketObj === 'object' && 'message' in ticketObj
        ? String((ticketObj as { message: unknown }).message)
        : JSON.stringify(ticketObj);
    throw new Error(`Expo ticket status=${status}: ${messageText}`);
  }

  console.log(
    `[Union Push] Expo ticket OK${ticketId ? ` id=${ticketId}` : ''}`
  );
}

/**
 * Best-effort network guardian fan-out via Expo Push Service (client-side).
 * Temporary milestone path — no access tokens / secrets.
 * Must never throw into the local emergency pipeline.
 */
export async function sendEmergencyToNetworkGuardians(
  alert: EmergencyAlert
): Promise<void> {
  console.log(
    '[UNION PUSH DEBUG] NetworkEmergencyPushService.sendEmergencyToNetworkGuardians() begin'
  );
  try {
    if (!isFirebaseReady()) {
      console.log('[UNION PUSH DEBUG] Firebase ready: no — skipping');
      console.log('[Union Push] Firebase unavailable — skipping network push.');
      return;
    }
    console.log('[UNION PUSH DEBUG] Firebase ready: yes');

    const auth = getFirebaseAuth();
    const ownerUid = auth?.currentUser?.uid ?? null;
    console.log(
      `[UNION PUSH DEBUG] Current auth UID: ${ownerUid ?? '(null)'}`
    );
    if (!ownerUid) {
      console.log('[Union Push] No authenticated UID — skipping network push.');
      return;
    }

    const owner = await getUserDocument(ownerUid);
    const ownerDisplayName =
      owner?.displayName?.trim() || `Union User ${ownerUid.slice(0, 6)}`;
    console.log(
      `[UNION PUSH DEBUG] Owner display name: ${ownerDisplayName}`
    );

    const relationships = await listMyGuardians();
    console.log(
      `[UNION PUSH DEBUG] Guardian relationships found: ${relationships.length}`
    );
    for (const rel of relationships) {
      console.log(
        `[UNION PUSH DEBUG] Relationship guardianUid=${rel.guardianUid} accepted=${rel.accepted} enabled=${rel.enabled} trusted=${rel.trusted}`
      );
    }

    const eligible = relationships.filter(
      (rel) => rel.accepted && rel.enabled && rel.trusted
    );
    console.log(
      `[UNION PUSH DEBUG] Eligible guardians: ${eligible.length}`
    );

    console.log(
      `[Union Push] Found ${eligible.length} eligible guardians (of ${relationships.length} accepted)`
    );

    if (eligible.length === 0) {
      console.log('[Union Push] No eligible network guardians — nothing to send.');
      return;
    }

    const data = toPayloadData(alert, ownerUid, ownerDisplayName);
    const reasonLabel = REASON_LABEL[alert.reason] ?? alert.reason;

    for (const rel of eligible) {
      try {
        console.log(
          `[UNION PUSH DEBUG] Guardian UID: ${rel.guardianUid}`
        );
        const guardianUser = await getUserDocument(rel.guardianUid);
        const token = guardianUser?.expoPushToken?.trim() || null;
        console.log(
          `[UNION PUSH DEBUG] Guardian token found: ${token ? 'yes' : 'no'}${
            token ? ` (${maskToken(token)})` : ''
          }`
        );
        if (!token) {
          console.log(
            `[Union Push] Skipping guardian ${rel.guardianUid.slice(0, 8)}… — no expoPushToken`
          );
          continue;
        }

        console.log(
          `[Union Push] Sending emergency alert to guardian ${rel.guardianDisplayName} (${maskToken(token)}) — ${reasonLabel}`
        );

        await sendExpoPush({
          to: token,
          title: 'Union Emergency Alert',
          body: `${ownerDisplayName} may need your help.`,
          sound: 'default',
          data,
        });
      } catch (error) {
        console.warn(
          `[UNION PUSH DEBUG] Per-guardian send failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        console.warn(
          `[Union Push] Failed to send to guardian ${rel.guardianUid.slice(0, 8)}…`,
          error instanceof Error ? error.message : error
        );
      }
    }
  } catch (error) {
    console.warn(
      `[UNION PUSH DEBUG] sendEmergencyToNetworkGuardians aborted: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    console.warn(
      '[Union Push] Network emergency push aborted.',
      error instanceof Error ? error.message : error
    );
  }
}

export const NetworkEmergencyPushService = {
  sendEmergencyToNetworkGuardians,
};
