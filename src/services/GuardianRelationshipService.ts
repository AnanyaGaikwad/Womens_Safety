import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  GuardianRelationship,
  relationshipDocId,
} from '../types/guardianRelationship';
import { GuardianRequest } from '../types/guardianRequest';
import { getFirebaseAuth, getFirebaseFirestore, isFirebaseReady } from './firebase';

const RELATIONSHIPS = 'guardianRelationships';

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

function mapRelationship(
  id: string,
  data: Record<string, unknown>
): GuardianRelationship {
  return {
    id,
    ownerUid: String(data.ownerUid ?? ''),
    guardianUid: String(data.guardianUid ?? ''),
    ownerDisplayName: String(data.ownerDisplayName ?? 'Union User'),
    guardianDisplayName: String(data.guardianDisplayName ?? 'Union User'),
    relationship:
      typeof data.relationship === 'string' && data.relationship.trim()
        ? data.relationship
        : 'Guardian',
    trusted: data.trusted !== false,
    enabled: data.enabled !== false,
    accepted: data.accepted === true,
    createdAt: createdAtToMillis(data.createdAt),
  };
}

function requireAuthUid(): string {
  const auth = getFirebaseAuth();
  const uid = auth?.currentUser?.uid;
  if (!uid) {
    throw new Error('You must be registered to manage network guardians.');
  }
  return uid;
}

/**
 * Create/update relationship after a target accepts a pairing request.
 * owner = protected user (request target), guardian = requester.
 */
export async function upsertRelationshipFromAcceptedRequest(
  request: GuardianRequest
): Promise<GuardianRelationship> {
  if (!isFirebaseReady()) {
    throw new Error('Firebase is unavailable.');
  }
  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('Firestore is unavailable.');
  }

  const uid = requireAuthUid();
  if (request.targetUid !== uid) {
    throw new Error('Only the request recipient can create this relationship.');
  }

  const ownerUid = request.targetUid;
  const guardianUid = request.requesterUid;
  const id = relationshipDocId(ownerUid, guardianUid);
  const ref = doc(db, RELATIONSHIPS, id);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    await updateDoc(ref, {
      accepted: true,
      enabled: true,
      trusted: true,
      relationship: 'Guardian',
      ownerDisplayName: request.targetDisplayName,
      guardianDisplayName: request.requesterDisplayName,
    });
  } else {
    await setDoc(ref, {
      ownerUid,
      guardianUid,
      ownerDisplayName: request.targetDisplayName,
      guardianDisplayName: request.requesterDisplayName,
      relationship: 'Guardian',
      trusted: true,
      enabled: true,
      accepted: true,
      createdAt: serverTimestamp(),
    });
  }

  const saved = await getDoc(ref);
  if (!saved.exists()) {
    return {
      id,
      ownerUid,
      guardianUid,
      ownerDisplayName: request.targetDisplayName,
      guardianDisplayName: request.requesterDisplayName,
      relationship: 'Guardian',
      trusted: true,
      enabled: true,
      accepted: true,
      createdAt: Date.now(),
    };
  }
  return mapRelationship(saved.id, saved.data() as Record<string, unknown>);
}

/** True if an accepted relationship already links these two users (either role). */
export async function hasAcceptedRelationship(
  uidA: string,
  uidB: string
): Promise<boolean> {
  if (!isFirebaseReady()) return false;
  const db = getFirebaseFirestore();
  if (!db) return false;

  try {
    const forward = await getDoc(
      doc(db, RELATIONSHIPS, relationshipDocId(uidA, uidB))
    );
    if (forward.exists() && forward.data()?.accepted === true) return true;

    const reverse = await getDoc(
      doc(db, RELATIONSHIPS, relationshipDocId(uidB, uidA))
    );
    if (reverse.exists() && reverse.data()?.accepted === true) return true;
  } catch {
    // Soft-fail when rules/collection unavailable.
  }
  return false;
}

/** Guardians who protect me (ownerUid == me). */
export async function listMyGuardians(): Promise<GuardianRelationship[]> {
  if (!isFirebaseReady()) return [];
  const db = getFirebaseFirestore();
  if (!db) return [];

  try {
    const uid = requireAuthUid();
    const snaps = await getDocs(
      query(collection(db, RELATIONSHIPS), where('ownerUid', '==', uid))
    );
    return snaps.docs
      .map((snap) => mapRelationship(snap.id, snap.data() as Record<string, unknown>))
      .filter((item) => item.accepted)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.warn(
      '[Union GuardianRelationshipService] Failed to list my guardians.',
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

/** People I protect (guardianUid == me). */
export async function listPeopleIProtect(): Promise<GuardianRelationship[]> {
  if (!isFirebaseReady()) return [];
  const db = getFirebaseFirestore();
  if (!db) return [];

  try {
    const uid = requireAuthUid();
    const snaps = await getDocs(
      query(collection(db, RELATIONSHIPS), where('guardianUid', '==', uid))
    );
    return snaps.docs
      .map((snap) => mapRelationship(snap.id, snap.data() as Record<string, unknown>))
      .filter((item) => item.accepted)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.warn(
      '[Union GuardianRelationshipService] Failed to list people I protect.',
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

/** Owner toggles whether this guardian is enabled for emergencies. */
export async function setRelationshipEnabled(
  relationshipId: string,
  enabled: boolean
): Promise<GuardianRelationship> {
  if (!isFirebaseReady()) {
    throw new Error('Firebase is unavailable.');
  }
  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('Firestore is unavailable.');
  }

  const uid = requireAuthUid();
  const ref = doc(db, RELATIONSHIPS, relationshipId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Relationship not found.');
  }

  const current = mapRelationship(snap.id, snap.data() as Record<string, unknown>);
  if (current.ownerUid !== uid) {
    throw new Error('Only the protected user can enable or disable this guardian.');
  }

  await updateDoc(ref, { enabled });
  const updated = await getDoc(ref);
  if (!updated.exists()) {
    return { ...current, enabled };
  }
  return mapRelationship(updated.id, updated.data() as Record<string, unknown>);
}

/**
 * Remove a network relationship.
 * Owner may remove a guardian; guardian may leave a person they protect.
 */
export async function removeRelationship(relationshipId: string): Promise<void> {
  if (!isFirebaseReady()) {
    throw new Error('Firebase is unavailable.');
  }
  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('Firestore is unavailable.');
  }

  const uid = requireAuthUid();
  const ref = doc(db, RELATIONSHIPS, relationshipId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Relationship not found.');
  }

  const current = mapRelationship(snap.id, snap.data() as Record<string, unknown>);
  if (current.ownerUid !== uid && current.guardianUid !== uid) {
    throw new Error('You are not allowed to remove this relationship.');
  }

  await deleteDoc(ref);
}
