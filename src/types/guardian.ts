export interface Guardian {
  id: string;
  fullName: string;
  phoneNumber: string;
  relationship: string;
  photoUri?: string | null;
  trusted: boolean;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export type GuardianInput = {
  fullName: string;
  phoneNumber: string;
  relationship: string;
  photoUri?: string | null;
  trusted?: boolean;
  enabled?: boolean;
};

export type GuardianUpdate = Partial<GuardianInput>;

export type GuardianValidationErrors = {
  fullName?: string;
  phoneNumber?: string;
  relationship?: string;
};

export const RELATIONSHIP_OPTIONS = [
  'Family',
  'Friend',
  'Partner',
  'Neighbor',
  'Colleague',
  'Other',
] as const;

export type RelationshipOption = (typeof RELATIONSHIP_OPTIONS)[number];
