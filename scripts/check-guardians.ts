/**
 * Guardian validation checks.
 * Run: npx tsx scripts/check-guardians.ts
 */
import assert from 'node:assert/strict';
import {
  hasValidationErrors,
  isValidPhoneNumber,
  normalizePhoneNumber,
  validateGuardianInput,
} from '../src/services/guardianValidation';
import { Guardian } from '../src/types/guardian';

function sampleGuardian(overrides: Partial<Guardian> = {}): Guardian {
  return {
    id: 'g1',
    fullName: 'Alex Rivera',
    phoneNumber: '+14155550100',
    relationship: 'Friend',
    photoUri: null,
    trusted: true,
    enabled: true,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

assert.equal(normalizePhoneNumber('+1 (415) 555-0100'), '+14155550100');
assert.equal(isValidPhoneNumber('4155550100'), true);
assert.equal(isValidPhoneNumber('123'), false);

const missingName = validateGuardianInput(
  {
    fullName: '  ',
    phoneNumber: '4155550100',
    relationship: 'Friend',
  },
  []
);
assert.equal(missingName.fullName, 'Full name is required.');
assert.equal(hasValidationErrors(missingName), true);

const duplicate = validateGuardianInput(
  {
    fullName: 'Sam Lee',
    phoneNumber: '415-555-0100',
    relationship: 'Family',
  },
  [sampleGuardian()]
);
assert.match(duplicate.phoneNumber ?? '', /already exists/i);

const editingSelf = validateGuardianInput(
  {
    fullName: 'Alex Rivera',
    phoneNumber: '+1 415 555 0100',
    relationship: 'Friend',
  },
  [sampleGuardian()],
  'g1'
);
assert.equal(hasValidationErrors(editingSelf), false);

console.log('guardian validation checks passed');
