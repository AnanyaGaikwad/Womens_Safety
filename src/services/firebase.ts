import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  initializeAuth,
  Persistence,
} from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import { FirebaseInitStatus, FirebaseServicesSnapshot } from '../types/network';
import { firebaseConfig } from './firebaseConfig';

type AuthModuleWithRn = typeof import('firebase/auth') & {
  getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
  browserLocalPersistence?: Persistence;
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let status: FirebaseInitStatus = 'uninitialized';
let errorMessage: string | null = null;
let initAttempted = false;

function resolveAuthPersistence(): Persistence | null {
  const authModule = require('firebase/auth') as AuthModuleWithRn;

  if (Platform.OS === 'web') {
    return authModule.browserLocalPersistence ?? null;
  }

  if (typeof authModule.getReactNativePersistence === 'function') {
    return authModule.getReactNativePersistence(AsyncStorage);
  }

  return null;
}

function createAuth(firebaseApp: FirebaseApp): Auth {
  try {
    const persistence = resolveAuthPersistence();
    if (persistence) {
      return initializeAuth(firebaseApp, { persistence });
    }
    return initializeAuth(firebaseApp);
  } catch {
    // Fast Refresh / second call — Auth already initialized for this app.
    return getAuth(firebaseApp);
  }
}

/**
 * Soft-fail Firebase bootstrap for Expo (JS SDK only).
 * Sprint 1–3 must keep working when Firebase is unavailable.
 */
export function initializeFirebase(): boolean {
  if (status === 'ready' && app && auth && db) {
    return true;
  }
  if (initAttempted && status === 'unavailable') {
    return false;
  }

  initAttempted = true;

  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = createAuth(app);
    db = getFirestore(app);
    status = 'ready';
    errorMessage = null;
    return true;
  } catch (error) {
    app = null;
    auth = null;
    db = null;
    status = 'unavailable';
    errorMessage =
      error instanceof Error
        ? error.message
        : 'Firebase initialization failed.';
    console.warn(
      '[Union Firebase] Initialization failed — Sprint 3 simulation remains available.',
      errorMessage
    );
    return false;
  }
}

/** True when app, Auth, and Firestore initialized successfully. */
export function isFirebaseReady(): boolean {
  if (status === 'uninitialized') {
    return initializeFirebase();
  }
  return status === 'ready' && app != null && auth != null && db != null;
}

export function getFirebaseStatus(): FirebaseInitStatus {
  return status;
}

export function getFirebaseError(): string | null {
  return errorMessage;
}

export function getFirebaseSnapshot(): FirebaseServicesSnapshot {
  return {
    status,
    appInitialized: app != null,
    authInitialized: auth != null,
    firestoreInitialized: db != null,
    errorMessage,
  };
}

/** Firebase App — null when unavailable. */
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseReady()) return null;
  return app;
}

/**
 * Firebase Auth (Anonymous sign-in ready for Milestone 2).
 * Persistence: AsyncStorage on native, browser local on web.
 */
export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseReady()) return null;
  return auth;
}

/** Cloud Firestore — null when unavailable. */
export function getFirebaseFirestore(): Firestore | null {
  if (!isFirebaseReady()) return null;
  return db;
}

// Attempt bootstrap at module load so later services can call isFirebaseReady().
initializeFirebase();
