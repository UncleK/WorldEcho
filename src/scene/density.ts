import type { SceneTower } from '../types';
import { exhibitionHeightMetres } from '../domain/display-height.mjs';

export interface TowerCluster { representative: SceneTower; members: SceneTower[] }
export type ModelPresentation = 'overview' | 'region';

export function modelPresentation(cameraMode: 'overview' | 'focus', _scale: number, _selected: SceneTower | undefined): ModelPresentation {
  // Focus changes the camera, never the membership of the density-managed world.
  return cameraMode === 'overview' ? 'overview' : 'region';
}

/** Display-only, compressed at the tall end. The comparison stage never uses this function. */
export function exhibitTowerHeight(tower: SceneTower, scale = 1): number | null {
  const finiteScale = Number.isFinite(scale) ? Math.max(0.1, Math.min(1.6, scale)) : 1;
  if(tower.modelScope==='visible-section')return tower.modelKey?0.055*finiteScale:null;
  const height=exhibitionHeightMetres(tower);
  if(height===null)return tower.heightM===null&&tower.modelKey?0.055*finiteScale:null;
  // Keep Paris near its established .28 display height, with much less of the
  // old .07 minimum that made 1m, 5m and 20m structures look alike.
  return Math.min(.33,.01+.27*Math.pow(height/330,.66))*finiteScale;
}

export function hasExhibitModel(tower: SceneTower): boolean {
  return !!tower.modelKey && exhibitTowerHeight(tower) !== null;
}

/** Approximate footprint radius of the displayed miniature, not a real-world geographic buffer. */
export function exhibitFootprint(tower: SceneTower, scale = 1): number {
  const finiteScale = Number.isFinite(scale) ? Math.max(0.1, Math.min(1.6, scale)) : 1;
  return hasExhibitModel(tower) ? (exhibitTowerHeight(tower, finiteScale) ?? 0) * 0.24 : 0.0025 * finiteScale;
}

export function angularDistance(a: SceneTower, b: SceneTower): number {
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad, dLon = (b.lon - a.lon) * toRad;
  return 2 * Math.asin(Math.min(1, Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLon / 2) ** 2)));
}

/** Greedy, bounded clusters avoid transitive chains swallowing a continent. Coordinates stay untouched. */
export function clusterTowers(towers: SceneTower[], selectedId: string, scale = 1): TowerCluster[] {
  const finiteScale = Number.isFinite(scale) ? Math.max(0.1, Math.min(1.6, scale)) : 1;
  const remaining = [...towers].sort((a, b) => Number(hasExhibitModel(b)) - Number(hasExhibitModel(a))
    || Number(b.id === selectedId) - Number(a.id === selectedId) || (exhibitionHeightMetres(b) ?? 0) - (exhibitionHeightMetres(a) ?? 0) || a.id.localeCompare(b.id));
  // At regional display size every recorded location gets its own miniature or
  // point. Keeping a single representative here defeated the size slider even
  // when all of the models would comfortably fit in the same camera region.
  if (finiteScale <= 0.35) return remaining.map((tower) => ({ representative: tower, members: [tower] }));
  const clusters: TowerCluster[] = [];
  while (remaining.length) {
    const representative = remaining.shift()!;
    const members = [representative];
    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      const candidate = remaining[index];
      const threshold = exhibitFootprint(representative, finiteScale) + exhibitFootprint(candidate, finiteScale);
      if (angularDistance(representative, candidate) < threshold) members.push(...remaining.splice(index, 1));
    }
    clusters.push({ representative, members });
  }
  return clusters;
}
