import test from 'node:test';
import assert from 'node:assert/strict';
import { clusterTowers, exhibitTowerHeight, angularDistance, modelPresentation } from './density.ts';

const tower = (id, lat, lon, heightM = 108, modelKey = 'shenzhen') => ({ id, lat, lon, heightM, modelKey, name: id, countryCode: 'CN', heightScope: 'unknown' });

test('Shenzhen and Macau form one group without altering their coordinates; selecting Macau changes representative', () => {
  const shenzhen = tower('shenzhen', 22.535, 113.974), macau = tower('macau', 22.144, 113.562, 162, 'macao');
  const paris = tower('paris', 48.8584, 2.2945, 330, 'paris');
  const records = [shenzhen, macau, paris], before = JSON.stringify(records);
  const result = clusterTowers(records, 'macau');
  assert.equal(result.length, 2);
  const local = result.find((group) => group.members.some((record) => record.id === 'shenzhen'));
  assert.equal(local.representative.id, 'macau');
  assert.deepEqual(new Set(local.members.map((record) => record.id)), new Set(['shenzhen', 'macau']));
  assert.equal(JSON.stringify(records), before);
  assert.ok(angularDistance(shenzhen, paris) > 1);
});

test('shrinking to 10 percent separates Shenzhen and Macau at their actual coordinates', () => {
  const records = [tower('shenzhen', 22.535, 113.974), tower('macau', 22.144, 113.562, 162, 'macao')];
  assert.equal(clusterTowers(records, 'macau', 1).length, 1);
  const compact = clusterTowers(records, 'macau', 0.1);
  assert.equal(compact.length, 2);
  assert.deepEqual(new Set(compact.map((cluster) => cluster.representative.id)), new Set(['shenzhen', 'macau']));
  assert.ok(Math.abs(exhibitTowerHeight(records[0], 0.1) / exhibitTowerHeight(records[0], 1) - 0.1) < 1e-10);
  assert.equal(modelPresentation('focus', 0.1, records[0]), 'region');
  assert.equal(modelPresentation('focus', 1, records[0]), 'region');
});

test('regional scale mounts every small model and point at its actual location', () => {
  const large = tower('large', 22.535, 113.974, 330, 'paris');
  const small = tower('small', 22.53504, 113.97405, 9.1, 'montmartre');
  const point = tower('point', 22.53506, 113.97406, null, null);
  const records = [large, small, point], before = JSON.stringify(records);
  assert.equal(clusterTowers(records, 'large', 1).length, 1);
  for (const scale of [0.35, 0.2, 0.1]) {
    const groups = clusterTowers(records, 'large', scale);
    assert.equal(groups.length, records.length);
    assert.ok(groups.every((group) => group.members.length === 1));
    assert.deepEqual(new Set(groups.map((group) => group.representative.id)), new Set(records.map((record) => record.id)));
    assert.ok(groups.every((group) => records.includes(group.representative)));
  }
  assert.equal(JSON.stringify(records), before);
});

test('focus retains the same density-managed world at every exhibition scale', () => {
  const selected = tower('selected', 22.144, 113.562, 162, 'macao');
  const nearby = tower('nearby', 22.535, 113.974);
  const distant = tower('distant', 48.8584, 2.2945, 330, 'paris');
  for (const scale of [0.1, 0.35, 1, 1.6]) {
    assert.equal(modelPresentation('focus', scale, selected), 'region');
    const entries = clusterTowers([selected, nearby, distant], selected.id, scale);
    assert.ok(entries.some(group => group.members.includes(distant)));
    assert.equal(entries.flatMap(group => group.members).length, 3);
  }
});

test('a point-only selection never replaces an available nearby model; Paris does not swallow Madrid', () => {
  const paris = tower('paris', 48.8584, 2.2945, 330, 'paris');
  const unmodeled = tower('point', 48.86, 2.30, null, null);
  const madrid = tower('parque', 40.455, -3.452, 30, 'parque-europa');
  const result = clusterTowers([unmodeled, paris, madrid], 'point');
  assert.equal(result.length, 2);
  assert.equal(result.find((cluster) => cluster.members.includes(unmodeled)).representative.id, 'paris');
  assert.equal(modelPresentation('focus', 1, unmodeled), 'region');
});

test('nearby chains do not merge the whole world; every entity occurs exactly once', () => {
  const records = Array.from({ length: 80 }, (_, i) => tower(`tower-${i}`, 0, -160 + i * 4, null, null));
  const groups = clusterTowers(records, records[40].id);
  assert.equal(groups.length, 80);
  assert.equal(new Set(groups.flatMap((group) => group.members.map((record) => record.id))).size, 80);
});

test('exhibition sizing never invents a recorded or comparable height', () => {
  const unknown=tower('unknown',0,0,null);
  assert.equal(exhibitTowerHeight(unknown),0.055);
  assert.equal(exhibitTowerHeight(unknown,.2),0.011000000000000001);
  assert.equal(unknown.heightM,null);
  const partial={...tower('partial',0,0,330),modelScope:'visible-section'};
  assert.equal(exhibitTowerHeight(partial),0.055);assert.equal(partial.heightM,330);
  assert.equal(exhibitTowerHeight(tower('point',0,0,null,null)),null);
  assert.equal(exhibitTowerHeight(tower('invalid', 0, 0, -20)), null);
  const giant = tower('giant', 0, 0, 100000);
  assert.ok(exhibitTowerHeight(giant, 999) <= 0.33 * 1.6);
  assert.ok(Number.isFinite(exhibitTowerHeight(giant, NaN)));
  const paris = tower('paris', 0, 0, 330);
  const original = paris.heightM;
  exhibitTowerHeight(paris, 0.5); exhibitTowerHeight(paris, 1.6);
  assert.equal(paris.heightM, original);
});

test('small and large landmark heights remain clearly differentiated without changing facts',()=>{
  const small=tower('small',0,0,2),medium=tower('medium',0,0,20),large=tower('large',0,0,100),paris=tower('paris',0,0,330);
  assert.ok(exhibitTowerHeight(medium)>exhibitTowerHeight(small)*2.5);
  assert.ok(exhibitTowerHeight(large)>exhibitTowerHeight(medium)*2);
  assert.ok(Math.abs(exhibitTowerHeight(paris)-.28)<1e-9);
  assert.equal(small.heightM,2);assert.equal(medium.heightM,20);
});

test('source clues and photo estimates size unknown models while canonical heights stay null',()=>{
  const tiny=tower('ad-andorra-tower-at-a-restaurant',0,0,null),photo=tower('pk-rawalpindi-bahria-phase-8',0,0,null);
  assert.ok(exhibitTowerHeight(photo)>exhibitTowerHeight(tiny)*3);
  assert.equal(tiny.heightM,null);assert.equal(photo.heightM,null);
  const missing=tower('new-unreviewed-tower',0,0,null);
  assert.equal(exhibitTowerHeight(missing),.055);
});
