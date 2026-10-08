import test from 'node:test';
import assert from 'node:assert/strict';
import { readTowerPlay, towerPlayUrl } from './tower-play.ts';

test('globe play links preserve quiz seeds, filters, selected tower and language', () => {
  const base='https://example.com/fr/?tower=us-paris-texas&quiz=q1&seed=quiz-seed&refs=1&lang=fr&compare=a,b';
  const state={effects:['hats','party','water'],seed:'hat-seed'};
  const shared=towerPlayUrl(base,state);
  assert.deepEqual(readTowerPlay(new URL(shared).search),state);
  const restored=new URL(towerPlayUrl(shared,{...state,effects:[]}));
  assert.equal(restored.searchParams.get('seed'),'quiz-seed');
  for(const key of ['tower','quiz','refs','lang','compare']) assert.equal(restored.searchParams.get(key),new URL(base).searchParams.get(key));
  assert.equal(restored.searchParams.has('echoSeed'),false);
});
test('untrusted URL effects and oversized seeds stay bounded', () => {
  assert.deepEqual(readTowerPlay('?echo=water.hats.hats.bogus&echoSeed='+ 'x'.repeat(80)),{effects:['hats','water'],seed:'worldecho'});
  assert.deepEqual(readTowerPlay('?play=party&seed=quiz'),{effects:[],seed:'worldecho'});
});
