import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { UnionUser } from '../types/user';
import { getFirebaseAuth, isFirebaseReady } from './firebase';
import { ensureUserDocument } from './UserService';

export type RegistrationResult = {
  user: UnionUser | null;
  authUid: string | null;
  registered: boolean;
  skipped: boolean;
  error: string | null;
};

let registrationPromise: Promise<RegistrationResult> | null = null;
let lastResult: RegistrationResult | null = null;

function waitForAuthUser(timeoutMs = 4000): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser);
    }, timeoutMs);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timer);
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Anonymous sign-in + users/{uid} upsert.
 * Safe to call repeatedly; soft-fails when Firebase is unavailable.
 */
export async function ensureAnonymousRegistration(): Promise<RegistrationResult> {
  if (registrationPromise) {
    return registrationPromise;
  }

  registrationPromise = (async (): Promise<RegistrationResult> => {
    if (!isFirebaseReady()) {
      const skipped: RegistrationResult = {
        user: null,
        authUid: null,
        registered: false,
        skipped: true,
        error: null,
      };
      lastResult = skipped;
      return skipped;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      const skipped: RegistrationResult = {
        user: null,
        authUid: null,
        registered: false,
        skipped: true,
        error: 'Firebase Auth unavailable.',
      };
      lastResult = skipped;
      return skipped;
    }

    try {
      let firebaseUser = await waitForAuthUser();

      if (!firebaseUser) {
        const credential = await signInAnonymously(auth);
        firebaseUser = credential.user;
      }

      const profile = await ensureUserDocument(firebaseUser.uid);
      const result: RegistrationResult = {
        user: profile,
        authUid: firebaseUser.uid,
        registered: profile != null,
        skipped: false,
        error: profile
          ? null
          : 'Authenticated, but user document could not be ensured.',
      };
      lastResult = result;
      return result;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Anonymous registration failed.';
      console.warn(
        '[Union AuthService] Registration failed — Sprint 1–3 continue locally.',
        message
      );
      const failed: RegistrationResult = {
        user: null,
        authUid: auth.currentUser?.uid ?? null,
        registered: false,
        skipped: false,
        error: message,
      };
      lastResult = failed;
      return failed;
    } finally {
      // Allow a later retry after a failed attempt; keep in-flight de-dupe only.
      registrationPromise = null;
    }
  })();

  return registrationPromise;
}

export function getLastRegistrationResult(): RegistrationResult | null {
  return lastResult;
}

/** Test helper — clears in-memory registration de-dupe state. */
export function resetRegistrationStateForTests() {
  registrationPromise = null;
  lastResult = null;
}
