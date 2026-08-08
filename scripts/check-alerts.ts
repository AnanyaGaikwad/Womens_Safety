/**
 * Offline emergency pipeline checks (no GPS / AsyncStorage required).
 * Run: npx tsx scripts/check-alerts.ts
 */
import assert from 'node:assert/strict';
import { REASON_LABEL } from '../src/types/alert';
import { unavailableLocation } from '../src/types/location';

assert.equal(REASON_LABEL.scream, 'Scream detected');
assert.equal(REASON_LABEL.safeword, 'Safe-word spoken');

const denied = unavailableLocation('denied');
assert.equal(denied.available, false);
assert.equal(denied.latitude, null);
assert.equal(denied.permissionStatus, 'denied');

console.log('Alert model checks passed.');
