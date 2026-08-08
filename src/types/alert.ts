import { DetectionKind } from './detection';
import { EmergencyLocation } from './location';

export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'skipped';

export type GuardianDelivery = {
  guardianId: string;
  fullName: string;
  phoneNumber: string;
  status: DeliveryStatus;
  deliveredAt?: number;
};

export type AlertDeliveryStatus = 'in_progress' | 'completed' | 'no_recipients';

export type EmergencyAlert = {
  id: string;
  reason: DetectionKind;
  note: string;
  confidence: number;
  timestamp: number;
  location: EmergencyLocation;
  evidenceUri?: string | null;
  evidenceRecording: boolean;
  guardiansNotified: GuardianDelivery[];
  deliveryStatus: AlertDeliveryStatus;
};

export type DeliveryBanner = {
  id: string;
  guardianName: string;
  phoneNumber: string;
  location: EmergencyLocation;
  status: DeliveryStatus;
  createdAt: number;
};

export const REASON_LABEL: Record<DetectionKind, string> = {
  scream: 'Scream detected',
  distress: 'Distress pattern',
  safeword: 'Safe-word spoken',
};
