import {
  Guardian,
  GuardianInput,
  GuardianUpdate,
  GuardianValidationErrors,
} from '../types/guardian';

/** Strip formatting so +1 (415) 555-2671 and 4155552671 compare equally. */
export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
}

/** Stable identity for duplicate checks (last 10 digits when available). */
export function phoneIdentity(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  // Allow optional leading +, then 10–15 digits (E.164-ish local storage check).
  return /^\+?\d{10,15}$/.test(normalized);
}

export function validateGuardianInput(
  input: GuardianInput,
  existing: Guardian[],
  editingId?: string
): GuardianValidationErrors {
  const errors: GuardianValidationErrors = {};
  const name = input.fullName.trim();
  const phone = input.phoneNumber.trim();
  const relationship = input.relationship.trim();

  if (!name) {
    errors.fullName = 'Full name is required.';
  }

  if (!phone) {
    errors.phoneNumber = 'Phone number is required.';
  } else if (!isValidPhoneNumber(phone)) {
    errors.phoneNumber = 'Enter a valid phone number (10–15 digits).';
  } else {
    const identity = phoneIdentity(phone);
    const duplicate = existing.find(
      (guardian) =>
        guardian.id !== editingId &&
        phoneIdentity(guardian.phoneNumber) === identity
    );
    if (duplicate) {
      errors.phoneNumber = 'A guardian with this phone number already exists.';
    }
  }

  if (!relationship) {
    errors.relationship = 'Relationship is required.';
  }

  return errors;
}

export function hasValidationErrors(errors: GuardianValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function createGuardianId(): string {
  return `guardian_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildGuardianFromInput(input: GuardianInput, id?: string): Guardian {
  const now = Date.now();
  return {
    id: id ?? createGuardianId(),
    fullName: input.fullName.trim(),
    phoneNumber: input.phoneNumber.trim(),
    relationship: input.relationship.trim(),
    photoUri: input.photoUri ?? null,
    trusted: input.trusted ?? true,
    enabled: input.enabled ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

export function applyGuardianUpdate(guardian: Guardian, update: GuardianUpdate): Guardian {
  return {
    ...guardian,
    fullName: update.fullName?.trim() ?? guardian.fullName,
    phoneNumber: update.phoneNumber?.trim() ?? guardian.phoneNumber,
    relationship: update.relationship?.trim() ?? guardian.relationship,
    photoUri:
      update.photoUri === undefined ? guardian.photoUri : update.photoUri,
    trusted: update.trusted ?? guardian.trusted,
    enabled: update.enabled ?? guardian.enabled,
    updatedAt: Date.now(),
  };
}
