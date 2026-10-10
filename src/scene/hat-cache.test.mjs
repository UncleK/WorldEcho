import test from 'node:test';
import assert from 'node:assert/strict';
import { acquireHat } from './hat-cache.ts';

test('shared hats own independent transforms and retire GPU resources only after the last release',()=>{
  const a=acquireHat(2,3,'overview'),b=acquireHat(2,3,'overview');
  assert.notEqual(a.object,b.object);assert.equal(a.object.children[0].geometry,b.object.children[0].geometry);
  assert.equal(a.object.children[0].material,b.object.children[0].material);
  a.object.position.y=5;assert.equal(b.object.position.y,0);
  let geometries=0,materials=0;
  a.object.children[0].geometry.addEventListener('dispose',()=>geometries++);
  a.object.children[0].material.addEventListener('dispose',()=>materials++);
  a.release();a.release();assert.equal(geometries,0);assert.equal(materials,0);
  b.release();assert.equal(geometries,1);assert.equal(materials,1);
  const next=acquireHat(2,3,'overview');assert.notEqual(next.object.children[0].geometry,a.object.children[0].geometry);next.release();
});
