import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { createEarthGeometry, LAND_BASE_RADIUS, MAX_LAND_RADIUS } from './earth-geometry.ts';

const source = JSON.parse(readFileSync(new URL('../../data/geography/ne_50m_land.geojson', import.meta.url), 'utf8'));
test('vector land keeps continental interiors and the polar cap, leaving the Pacific as ocean', () => {
  const { land, coast } = createEarthGeometry(source, false);
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const mesh = new Mesh(land, material);
  const isLand = (lat, lon) => {
    const p = lat * Math.PI / 180, l = lon * Math.PI / 180;
    const normal = new Vector3(Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l));
    const hits = new Raycaster(normal.clone().multiplyScalar(2), normal.clone().negate()).intersectObject(mesh);
    return hits.length > 0 && hits[0].distance < 1.05;
  };
  assert.equal(isLand(48.8584, 2.2945), true, 'Paris');
  assert.equal(isLand(39.9, 116.4), true, 'Beijing');
  assert.equal(isLand(-35.28, 149.12), true, 'Canberra');
  assert.equal(isLand(-88, 0), true, 'South polar cap');
  assert.equal(isLand(0, -150), false, 'Open Pacific');
  const positions = land.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const radius = Math.hypot(positions.getX(index), positions.getY(index), positions.getZ(index));
    assert.ok(Number.isFinite(radius) && radius >= LAND_BASE_RADIUS - 1e-6 && radius <= MAX_LAND_RADIUS);
  }
  assert.ok(positions.count / 3 < 400000, 'Desktop land stays within its triangle budget');
  land.dispose(); coast.dispose(); material.dispose();
});
