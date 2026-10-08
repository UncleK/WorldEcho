import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayHat, disposePlayObject } from './hat-models.ts';

test('all hat/color combinations have finite renderable geometry and independent resource ownership', () => {
  const live = createPlayHat(0, 0);
  const first = live.children[0];
  let disposed = false;
  first.geometry.addEventListener('dispose', () => { disposed = true; });
  for (const detail of ['overview', 'detail']) for (let kind = 0; kind < 7; kind++) for (let palette = 0; palette < 7; palette++) {
    const hat = createPlayHat(kind, palette, detail);
    const mesh = hat.children[0];
    assert.equal(hat.children.length, 1);
    assert.notEqual(mesh.geometry, first.geometry);
    assert.notEqual(mesh.material, first.material);
    for (const attribute of Object.values(mesh.geometry.attributes)) assert.ok(Array.from(attribute.array).every(Number.isFinite));
    mesh.geometry.computeBoundingBox();
    assert.ok(mesh.geometry.boundingBox.max.y > mesh.geometry.boundingBox.min.y);
    assert.ok(mesh.geometry.index.count > 0 && mesh.geometry.index.count < (detail === 'detail' ? 45000 : 18000));
    disposePlayObject(hat);
    assert.equal(disposed, false);
  }
  disposePlayObject(live);
  assert.equal(disposed, true);
});
