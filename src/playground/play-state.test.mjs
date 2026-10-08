import test from 'node:test';
import assert from 'node:assert/strict';
import { readPlayState, playUrl, hatChoice, advanceClock } from './play-state.ts';

test('shared worlds restore combinations, seed and selected character', () => {
  const ids = ['us-paris-texas', 'us-las-vegas-paris'];
  const world = { effects: ['hats', 'party', 'water'], seed: 'trip-42', selectedId: ids[1], close: false };
  const url = new URL(playUrl('https://example.com/playground.html?lang=fr', world));
  assert.deepEqual(readPlayState(url.search, ids), world);
  assert.equal(url.searchParams.get('lang'), 'fr');
});
test('invalid shared settings cannot introduce effects, unknown characters or unbounded seeds', () => {
  const state = readPlayState('?play=hats.hats.bogus.party&seed=%3Cscript%3E&tower=missing', ['us-paris-texas']);
  assert.deepEqual(state.effects, ['hats', 'party']);
  assert.equal(state.seed, 'worldecho');
  assert.equal(state.selectedId, 'us-paris-texas');
});
test('hats stay identical when catalog order, membership or clustering changes', () => {
  const original = ['texas', 'paris', 'vegas'];
  const expected = new Map(original.map(id => [id, hatChoice('seed', id)]));
  for (const id of ['vegas', 'new-place', 'texas', 'paris']) if (expected.has(id)) assert.deepEqual(hatChoice('seed', id), expected.get(id));
  assert.equal(new Set(Array.from({ length: 80 }, (_, i) => hatChoice('seed', `tower-${i}`).kind)).size, 7);
  for (let i = 0; i < 80; i++) {
    const choice = hatChoice('seed', `tower-${i}`);
    assert.ok(choice.palette >= 0 && choice.palette < 7);
    assert.ok(Math.abs(choice.tilt) < .2);
  }
});
test('paused and resumed clocks do not fast-forward after a hidden tab', () => {
  assert.equal(advanceClock(1000, 60000, true), 0);
  assert.equal(advanceClock(60000, 60042, false), .042);
  assert.equal(advanceClock(1000, 60000, false), .15);
  assert.equal(advanceClock(1000, 500, false), 0);
});
