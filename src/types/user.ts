/**
 * Firestore `users/{uid}` document (Sprint 4).
 */

export type UnionUser = {
  uid: string;
  displayName: string;
  /** Epoch ms when the user document was first created. */
  createdAt: number;
  /** Expo push token when notification registration succeeds. */
  expoPushToken?: string | null;
};

export function defaultDisplayName(uid: string): string {
  const short = uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) || uid.slice(0, 6);
  return `Union User ${short}`;
}
