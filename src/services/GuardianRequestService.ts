import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { GuardianRequest, GuardianRequestStatus } from '../types/guardianRequest';
import { getFirebaseAuth, getFirebaseFirestore, isFirebaseReady } from './firebase';
import {
  hasAcceptedRelationship,
  upsertRelationshipFromAcceptedRequest,
} from './GuardianRelationshipService';
import { getUserDocument } from './UserService';

const REQUESTS = 'guardianRequests';

function createdAtToMillis(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Timestamp) return value.toMillis();
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return (value as Timestamp).toMillis();
  }
  return Date.now();
}

function mapRequest(
  id: string,
  data: Record<string, unknown>
): GuardianRequest {
  const status = data.status;
  return {
    id,
    requesterUid: String(data.requesterUid ?? ''),
    requesterDisplayName: String(data.requesterDisplayName ?? 'Union User'),
    targetUid: String(data.targetUid ?? ''),
    targetDisplayName: String(data.targetDisplayName ?? 'Union User'),
    status:
      status === 'accepted' || status === 'rejected' || status === 'pending'
        ? status
        : 'pending',
    createdAt: createdAtToMillis(data.createdAt),
  };
}

function requireAuthUid(): string {
  const auth = getFirebaseAuth();
  const uid = auth?.currentUser?.uid;
  if (!uid) {
    throw new Error('You must be registered before pairing guardians.');
  }
  return uid;
}

/**
 * Soft check for an existing accepted network relationship.
 * Returns false if the collection is empty or unreadable.
 */
async function alreadyRelated(
  uidA: string,
  uidB: string
): Promise<boolean> {
  return hasAcceptedRelationship(uidA, uidB);
}

async function hasPendingDuplicate(
  requesterUid: string,
  targetUid: string
): Promise<boolean> {
  const db = getFirebaseFirestore();
  if (!db) return false;

  const snaps = await getDocs(
    query(collection(db, REQUESTS), where('requesterUid', '==', requesterUid))
  );
  return snaps.docs.some((snap) => {
    const data = snap.data();
    return data.targetUid === targetUid && data.status === 'pending';
  });
}

/**
 * Create a pending guardian pairing request.
 * Requester identity always comes from Firebase Auth (never from form input).
 */
export async function createGuardianRequest(
  targetUidRaw: string
): Promise<GuardianRequest> {
  if (!isFirebaseReady()) {
    throw new Error('Firebase is unavailable. Try again when online.');
  }
  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('Firestore is unavailable.');
  }

  const requesterUid = requireAuthUid();
  const targetUid = targetUidRaw.trim();
  if (!targetUid) {
    throw new Error('Enter a Union User ID.');
  }
  if (targetUid === requesterUid) {
    throw new Error('You cannot send a guardian request to yourself.');
  }

  const target = await getUserDocument(targetUid);
  if (!target) {
    throw new Error('No Union user found for that ID.');
  }

  const requester = await getUserDocument(requesterUid);
  const requesterDisplayName =
    requester?.displayName ?? `Union User ${requesterUid.slice(0, 6)}`;

  if (await hasPendingDuplicate(requesterUid, targetUid)) {
    throw new Error('A pending request to this user already exists.');
  }

  if (await alreadyRelated(requesterUid, targetUid)) {
    throw new Error('You are already paired with this user.');
  }

  const ref = await addDoc(collection(db, REQUESTS), {
    requesterUid,
    requesterDisplayName,
    targetUid,
    targetDisplayName: target.displayName,
    status: 'pending' satisfies GuardianRequestStatus,
    createdAt: serverTimestamp(),
  });

  const created = await getDoc(ref);
  if (!created.exists()) {
    return {
      id: ref.id,
      requesterUid,
      requesterDisplayName,
      targetUid,
      targetDisplayName: target.displayName,
      status: 'pending',
      createdAt: Date.now(),
    };
  }
  return mapRequest(created.id, created.data() as Record<string, unknown>);
}

/** Incoming pending requests for the authenticated user (as target). */
export async function listIncomingPendingRequests(): Promise<GuardianRequest[]> {
  if (!isFirebaseReady()) return [];
  const db = getFirebaseFirestore();
  if (!db) return [];

  try {
    const uid = requireAuthUid();
    const snaps = await getDocs(
      query(collection(db, REQUESTS), where('targetUid', '==', uid))
    );
    return snaps.docs
      .map((snap) => mapRequest(snap.id, snap.data() as Record<string, unknown>))
      .filter((request) => request.status === 'pending')
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.warn(
      '[Union GuardianRequestService] Failed to load incoming requests.',
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

/** Outgoing pending requests sent by the authenticated user. */
export async function listOutgoingPendingRequests(): Promise<GuardianRequest[]> {
  if (!isFirebaseReady()) return [];
  const db = getFirebaseFirestore();
  if (!db) return [];

  try {
    const uid = requireAuthUid();
    const snaps = await getDocs(
      query(collection(db, REQUESTS), where('requesterUid', '==', uid))
    );
    return snaps.docs
      .map((snap) => mapRequest(snap.id, snap.data() as Record<string, unknown>))
      .filter((request) => request.status === 'pending')
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.warn(
      '[Union GuardianRequestService] Failed to load outgoing requests.',
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

/**
 * Accept or reject a request targeted at the current user.
 * Accept also upserts guardianRelationships (Milestone 7).
 * Reject only updates request status — no relationship document.
 */
export async function respondToGuardianRequest(
  requestId: string,
  status: Extract<GuardianRequestStatus, 'accepted' | 'rejected'>
): Promise<GuardianRequest> {
  if (!isFirebaseReady()) {
    throw new Error('Firebase is unavailable.');
  }
  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('Firestore is unavailable.');
  }

  const uid = requireAuthUid();
  const ref = doc(db, REQUESTS, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Request not found.');
  }

  const current = mapRequest(snap.id, snap.data() as Record<string, unknown>);
  if (current.targetUid !== uid) {
    throw new Error('Only the recipient can respond to this request.');
  }
  if (current.status !== 'pending') {
    throw new Error('This request has already been resolved.');
  }

  await updateDoc(ref, { status });
  const updatedSnap = await getDoc(ref);
  const updated = updatedSnap.exists()
    ? mapRequest(updatedSnap.id, updatedSnap.data() as Record<string, unknown>)
    : { ...current, status };

  if (status === 'accepted') {
    await upsertRelationshipFromAcceptedRequest(updated);
  }

  return updated;
}
