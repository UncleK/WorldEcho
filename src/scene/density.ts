import type { SceneTower } from '../types';

export interface TowerCluster { representative: SceneTower; members: SceneTower[] }
export type ModelPresentation = 'overview' | 'region';

export function modelPresentation(cameraMode: 'overview' | 'focus', _scale: number, _selected: SceneTower | undefined): ModelPresentation {
  // Focus changes the camera, never the membership of the density-managed world.
  return cameraMode === 'overview' ? 'overview' : 'region';
}

/** Display-only, compressed at the tall end. The comparison stage never uses this function. */
export function exhibitTowerHeight(tower: SceneTower, scale = 1): number | null {
  const finiteScale = Number.isFinite(scale) ? Math.max(0.1, Math.min(1.6, scale)) : 1;
  // A documented shape with unknown dimensions has an explicit exhibition size;
  // heightM stays null and the linear comparison remains unavailable.
  if (tower.heightM === null || tower.modelScope==='visible-section') return tower.modelKey ? 0.09 * finiteScale : null;
  if (!Number.isFinite(tower.heightM) || tower.heightM <= 0) return null;
  // Give small real structures a readable map presence, without changing their
  // recorded height or the linear comparison stage.
  return (0.07 + 0.26 * (1 - Math.exp(-tower.heightM * 0.00115 / 0.26))) * finiteScale;
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

/** Keep the selected miniature legible without moving any geographic anchor. */
export function focusContextScale(tower:SceneTower,selected:SceneTower|undefined,scale=1,focused=false):number{
  if(!focused||!selected||tower.id===selected.id)return 1;
  const height=exhibitTowerHeight(tower,scale);
  if(!height)return 1;
  const distance=angularDistance(tower,selected);
  return Number.isFinite(distance)?Math.max(.03,Math.min(1,distance*.45/height)):1;
}

/** Greedy, bounded clusters avoid transitive chains swallowing a continent. Coordinates stay untouched. */
export function clusterTowers(towers: SceneTower[], selectedId: string, scale = 1): TowerCluster[] {
  const finiteScale = Number.isFinite(scale) ? Math.max(0.1, Math.min(1.6, scale)) : 1;
  const remaining = [...towers].sort((a, b) => Number(hasExhibitModel(b)) - Number(hasExhibitModel(a))
    || Number(b.id === selectedId) - Number(a.id === selectedId) || (b.heightM ?? 0) - (a.heightM ?? 0) || a.id.localeCompare(b.id));
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
