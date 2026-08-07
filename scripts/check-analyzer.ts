/**
 * Lightweight Node checks for the local sound analyzer.
 * Run: npx tsx scripts/check-analyzer.ts
 */
import assert from 'node:assert/strict';
import {
  matchesSafeWord,
  SoundPatternAnalyzer,
} from '../src/services/soundAnalyzer';
import { DEFAULT_SETTINGS } from '../src/types/detection';

function testSafeWord() {
  assert.equal(matchesSafeWord('please help red lantern now', 'red lantern'), true);
  assert.equal(matchesSafeWord('Red-Lantern!', 'red lantern'), true);
  assert.equal(matchesSafeWord('yellow lantern', 'red lantern'), false);
}

function testScream() {
  const analyzer = new SoundPatternAnalyzer();
  const settings = { ...DEFAULT_SETTINGS, cooldownMs: 0 };

  // Establish quiet baseline.
  for (let i = 0; i < 20; i += 1) {
    assert.equal(analyzer.ingest(-50, settings, 1000 + i * 50), null);
  }

  const kind = analyzer.ingest(-8, settings, 3000);
  assert.equal(kind, 'scream');
}

function testDistress() {
  const analyzer = new SoundPatternAnalyzer();
  const settings = {
    ...DEFAULT_SETTINGS,
    cooldownMs: 0,
    screamSpikeDb: 18,
    distressMinSpikes: 4,
  };

  let now = 1000;
  for (let i = 0; i < 15; i += 1) {
    analyzer.ingest(-52, settings, now);
    now += 40;
  }

  const results: Array<string | null> = [];
  const bursts = [-12, -20, -10, -22, -9];
  for (const db of bursts) {
    results.push(analyzer.ingest(db, settings, now));
    now += 400;
    analyzer.ingest(-48, settings, now);
    now += 200;
  }

  assert.ok(results.includes('distress') || results.includes('scream'));
}

testSafeWord();
testScream();
testDistress();
console.log('sound analyzer checks passed');
