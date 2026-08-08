/**
 * Firestore `users/{uid}` document (Sprint 4 Milestone 2).
 * Push token and profile editing arrive in later milestones.
 */

export type UnionUser = {
  uid: string;
  displayName: string;
  /** Epoch ms when the user document was first created. */
  createdAt: number;
};

export function defaultDisplayName(uid: string): string {
  const short = uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) || uid.slice(0, 6);
  return `Union User ${short}`;
}
