import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { defaultDisplayName, UnionUser } from '../types/user';
import { getFirebaseFirestore, isFirebaseReady } from './firebase';

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

function mapUserDoc(uid: string, data: Record<string, unknown>): UnionUser {
  return {
    uid: typeof data.uid === 'string' ? data.uid : uid,
    displayName:
      typeof data.displayName === 'string' && data.displayName.trim()
        ? data.displayName
        : defaultDisplayName(uid),
    createdAt: createdAtToMillis(data.createdAt),
    expoPushToken:
      typeof data.expoPushToken === 'string' ? data.expoPushToken : null,
  };
}

/**
 * Create users/{uid} on first auth; leave existing docs untouched
 * (no duplicate, no createdAt overwrite).
 */
export async function ensureUserDocument(uid: string): Promise<UnionUser | null> {
  if (!isFirebaseReady()) return null;

  const db = getFirebaseFirestore();
  if (!db) return null;

  try {
    const ref = doc(db, 'users', uid);
    const existing = await getDoc(ref);

    if (existing.exists()) {
      return mapUserDoc(uid, existing.data() as Record<string, unknown>);
    }

    const displayName = defaultDisplayName(uid);
    await setDoc(ref, {
      uid,
      displayName,
      createdAt: serverTimestamp(),
    });

    const created = await getDoc(ref);
    if (created.exists()) {
      return mapUserDoc(uid, created.data() as Record<string, unknown>);
    }

    return {
      uid,
      displayName,
      createdAt: Date.now(),
    };
  } catch (error) {
    console.warn(
      '[Union UserService] Failed to ensure user document — continuing without cloud profile.',
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

export async function getUserDocument(uid: string): Promise<UnionUser | null> {
  if (!isFirebaseReady()) return null;
  const db = getFirebaseFirestore();
  if (!db) return null;

  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return mapUserDoc(uid, snap.data() as Record<string, unknown>);
  } catch (error) {
    console.warn(
      '[Union UserService] Failed to load user document.',
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

/**
 * Update only displayName on users/{uid}. Never touches createdAt or uid.
 */
export async function updateDisplayName(
  uid: string,
  displayName: string
): Promise<UnionUser | null> {
  if (!isFirebaseReady()) return null;
  const db = getFirebaseFirestore();
  if (!db) return null;

  const trimmed = displayName.trim();
  if (!trimmed) {
    throw new Error('Display name is required.');
  }
  if (trimmed.length > 60) {
    throw new Error('Display name must be 60 characters or fewer.');
  }

  try {
    const ref = doc(db, 'users', uid);
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      throw new Error('User profile not found.');
    }

    await updateDoc(ref, { displayName: trimmed });
    const updated = await getDoc(ref);
    if (!updated.exists()) return null;
    return mapUserDoc(uid, updated.data() as Record<string, unknown>);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Display name')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('User profile')) {
      throw error;
    }
    console.warn(
      '[Union UserService] Failed to update display name.',
      error instanceof Error ? error.message : error
    );
    throw new Error(
      error instanceof Error ? error.message : 'Failed to update display name.'
    );
  }
}

/**
 * Save Expo push token on users/{uid}. Does not modify createdAt or displayName.
 */
export async function saveExpoPushToken(
  uid: string,
  expoPushToken: string
): Promise<UnionUser | null> {
  if (!isFirebaseReady()) return null;
  const db = getFirebaseFirestore();
  if (!db) return null;

  const token = expoPushToken.trim();
  if (!token) return null;

  try {
    const ref = doc(db, 'users', uid);
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      throw new Error('User profile not found.');
    }

    await updateDoc(ref, { expoPushToken: token });
    const updated = await getDoc(ref);
    if (!updated.exists()) return null;
    return mapUserDoc(uid, updated.data() as Record<string, unknown>);
  } catch (error) {
    console.warn(
      '[Union UserService] Failed to save Expo push token.',
      error instanceof Error ? error.message : error
    );
    return null;
  }
}
