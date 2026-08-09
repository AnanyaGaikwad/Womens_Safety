/**
 * Firestore `guardianRelationships/{ownerUid_guardianUid}` (Sprint 4 Milestone 7).
 *
 * Semantics (matches QR pairing flow):
 * - requester asks to become a guardian for the target
 * - target accepts → ownerUid = targetUid, guardianUid = requesterUid
 * - owner sees the guardian under "My Guardians"
 * - guardian sees the owner under "People I Protect"
 */

export type GuardianRelationship = {
  id: string;
  ownerUid: string;
  guardianUid: string;
  ownerDisplayName: string;
  guardianDisplayName: string;
  relationship: string;
  trusted: boolean;
  enabled: boolean;
  accepted: boolean;
  /** Epoch ms */
  createdAt: number;
};

export function relationshipDocId(ownerUid: string, guardianUid: string): string {
  return `${ownerUid}_${guardianUid}`;
}
