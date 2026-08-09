/**
 * Firestore `guardianRequests/{requestId}` (Sprint 4 Milestone 6).
 * Relationship documents are created in Milestone 7 after acceptance.
 */

export type GuardianRequestStatus = 'pending' | 'accepted' | 'rejected';

export type GuardianRequest = {
  id: string;
  requesterUid: string;
  requesterDisplayName: string;
  targetUid: string;
  targetDisplayName: string;
  status: GuardianRequestStatus;
  /** Epoch ms */
  createdAt: number;
};

export type GuardianRequestInput = {
  targetUid: string;
};
