import { Quaternion, Vector3 } from 'three';
import type { SceneTower } from '../types';

export const EARTH_RADIUS = 1;
export const GLOBE_UNITS_PER_METER = 0.00115;
export const COMPARISON_UNITS_PER_METER = 0.008;

/** +Y north, +Z at lat/lon 0, +X at 90 degrees east. */
export function geoNormal(lat: number, lon: number): Vector3 {
  const phi = lat * Math.PI / 180;
  const lambda = lon * Math.PI / 180;
  return new Vector3(
    Math.cos(phi) * Math.sin(lambda),
    Math.sin(phi),
    Math.cos(phi) * Math.cos(lambda),
  );
}

export function geoPosition(lat: number, lon: number, radius = EARTH_RADIUS): Vector3 {
  return geoNormal(lat, lon).multiplyScalar(radius);
}

export function geoRotation(lat: number, lon: number): Quaternion {
  return new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), geoNormal(lat, lon));
}

export function geoNorth(lat: number, lon: number): Vector3 {
  const phi = lat * Math.PI / 180;
  const lambda = lon * Math.PI / 180;
  return new Vector3(-Math.sin(phi) * Math.sin(lambda), Math.cos(phi), -Math.sin(phi) * Math.cos(lambda));
}

export function geoEast(lon: number): Vector3 {
  const lambda = lon * Math.PI / 180;
  return new Vector3(Math.cos(lambda), 0, -Math.sin(lambda));
}

export function hasUsableHeight(tower: SceneTower): tower is SceneTower & { heightM: number } {
  return tower.modelScope!=='visible-section' && tower.modelContext!=='inferred-completion' && tower.heightM !== null && Number.isFinite(tower.heightM) && tower.heightM > 0;
}

export function globeTowerHeight(tower: SceneTower): number | null {
  return hasUsableHeight(tower) ? tower.heightM * GLOBE_UNITS_PER_METER : null;
}

/** Segment/sphere occlusion also allows a tall tower tip above the horizon. */
export function isPointVisibleFromCamera(cameraPosition: Vector3, point: Vector3, radius: number): boolean {
  const dx = point.x - cameraPosition.x;
  const dy = point.y - cameraPosition.y;
  const dz = point.z - cameraPosition.z;
  const lengthSquared = dx * dx + dy * dy + dz * dz;
  if (lengthSquared < 1e-12) return true;
  const projection = -(cameraPosition.x * dx + cameraPosition.y * dy + cameraPosition.z * dz) / lengthSquared;
  if (projection <= 0 || projection >= 1) return true;
  const x = cameraPosition.x + dx * projection;
  const y = cameraPosition.y + dy * projection;
  const z = cameraPosition.z + dz * projection;
  return x * x + y * y + z * z >= radius * radius;
}

export function fitSphereDistance(radius: number, verticalFovDegrees: number, aspect: number): number {
  const verticalHalfAngle = verticalFovDegrees * Math.PI / 360;
  const horizontalHalfAngle = Math.atan(Math.tan(verticalHalfAngle) * Math.max(aspect, 0.1));
  return radius / Math.sin(Math.min(verticalHalfAngle, horizontalHalfAngle));
}

export function nearestOrbitAngle(current: number, desired: number): number {
  return current + Math.atan2(Math.sin(desired - current), Math.cos(desired - current));
}

/** Back away along the current view ray without changing a trucked orbit target. */
export function cameraSurfaceDollyCorrection(position: Vector3, forward: Vector3, radius: number): number {
  if (position.lengthSq() >= radius * radius || forward.lengthSq() < 1e-12) return 0;
  const awayProjection = -position.dot(forward) / forward.length();
  return Math.max(0, -awayProjection + Math.sqrt(awayProjection * awayProjection + radius * radius - position.lengthSq()));
}
