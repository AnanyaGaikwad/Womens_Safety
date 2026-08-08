import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Guardian,
  GuardianInput,
  GuardianUpdate,
} from '../types/guardian';
import {
  applyGuardianUpdate,
  buildGuardianFromInput,
  hasValidationErrors,
  validateGuardianInput,
} from './guardianValidation';

const GUARDIANS_KEY = 'union.guardians';

async function readGuardians(): Promise<Guardian[]> {
  try {
    const raw = await AsyncStorage.getItem(GUARDIANS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Guardian[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeGuardians(guardians: Guardian[]): Promise<void> {
  await AsyncStorage.setItem(GUARDIANS_KEY, JSON.stringify(guardians));
}

/**
 * Local guardian persistence and future emergency-alert seam.
 * Networking / messaging is intentionally stubbed for later sprints.
 */
export const GuardianService = {
  async getGuardians(): Promise<Guardian[]> {
    const guardians = await readGuardians();
    return guardians.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async addGuardian(input: GuardianInput): Promise<Guardian> {
    const existing = await readGuardians();
    const errors = validateGuardianInput(input, existing);
    if (hasValidationErrors(errors)) {
      const message =
        errors.fullName ||
        errors.phoneNumber ||
        errors.relationship ||
        'Invalid guardian details.';
      throw new Error(message);
    }

    const guardian = buildGuardianFromInput(input);
    // Preserve original createdAt semantics for new records.
    await writeGuardians([guardian, ...existing]);
    return guardian;
  },

  async updateGuardian(id: string, update: GuardianUpdate): Promise<Guardian> {
    const existing = await readGuardians();
    const index = existing.findIndex((guardian) => guardian.id === id);
    if (index < 0) {
      throw new Error('Guardian not found.');
    }

    const current = existing[index];
    const mergedInput: GuardianInput = {
      fullName: update.fullName ?? current.fullName,
      phoneNumber: update.phoneNumber ?? current.phoneNumber,
      relationship: update.relationship ?? current.relationship,
      photoUri:
        update.photoUri === undefined ? current.photoUri : update.photoUri,
      trusted: update.trusted ?? current.trusted,
      enabled: update.enabled ?? current.enabled,
    };

    const errors = validateGuardianInput(mergedInput, existing, id);
    if (hasValidationErrors(errors)) {
      const message =
        errors.fullName ||
        errors.phoneNumber ||
        errors.relationship ||
        'Invalid guardian details.';
      throw new Error(message);
    }

    const next = applyGuardianUpdate(current, update);
    // Keep original createdAt.
    next.createdAt = current.createdAt;
    const guardians = [...existing];
    guardians[index] = next;
    await writeGuardians(guardians);
    return next;
  },

  async removeGuardian(id: string): Promise<void> {
    const existing = await readGuardians();
    const next = existing.filter((guardian) => guardian.id !== id);
    if (next.length === existing.length) {
      throw new Error('Guardian not found.');
    }
    await writeGuardians(next);
  },

  /**
   * Sprint 2 stub — does not send messages or hit the network.
   * Ready for a later emergency-alert implementation.
   */
  async notifyGuardians(message?: string): Promise<void> {
    const guardians = await readGuardians();
    const recipients = guardians.filter(
      (guardian) => guardian.enabled && guardian.trusted
    );
    console.log(
      `Emergency alert would be sent to ${recipients.length} guardians.`
    );
    if (message) {
      console.log(`[notifyGuardians stub] payload: ${message}`);
    }
  },
};

export async function addGuardian(input: GuardianInput): Promise<Guardian> {
  return GuardianService.addGuardian(input);
}

export async function removeGuardian(id: string): Promise<void> {
  return GuardianService.removeGuardian(id);
}

export async function updateGuardian(
  id: string,
  update: GuardianUpdate
): Promise<Guardian> {
  return GuardianService.updateGuardian(id, update);
}

export async function getGuardians(): Promise<Guardian[]> {
  return GuardianService.getGuardians();
}

export async function notifyGuardians(message?: string): Promise<void> {
  return GuardianService.notifyGuardians(message);
}
