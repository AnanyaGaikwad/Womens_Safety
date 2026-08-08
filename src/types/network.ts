/**
 * Sprint 4 network / Firebase readiness types (Milestone 1).
 * Extended in later milestones for pairing, push, and alerts.
 */

export type FirebaseInitStatus =
  | 'uninitialized'
  | 'ready'
  | 'unavailable';

export type FirebaseServicesSnapshot = {
  status: FirebaseInitStatus;
  appInitialized: boolean;
  authInitialized: boolean;
  firestoreInitialized: boolean;
  errorMessage: string | null;
};
