export interface TowerFilters {
  includeReferences: boolean;
  includeUnmodeled: boolean;
  hideApproximate: boolean;
  hidePast: boolean;
  minHeight: number;
  hideUnknownHeight: boolean;
  hideUnknownStatus: boolean;
  hidePrivate: boolean;
}
export interface FilterableTower {
  modelCollection?: 'core' | 'reference' | 'related' | 'other' | 'pending';
  modelKey?: string | null;
  approximateLocation?: boolean;
  heightM: number | null;
  status?: string | { value: string };
  historicalAppearance?: boolean;
  access?: 'private' | 'public' | 'unknown';
}
export const DEFAULT_TOWER_FILTERS: TowerFilters = {
  includeReferences: true,
  includeUnmodeled: false,
  hideApproximate: false,
  hidePast: false, minHeight: 0, hideUnknownHeight: false, hideUnknownStatus: false, hidePrivate: false,
};
export function normalizeMinHeight(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? Math.min(number, 10000) : 0;
}
export function readTowerFilters(search: string): TowerFilters {
  const params = new URLSearchParams(search);
  return { includeReferences: params.get('references') !== '0', includeUnmodeled:params.get('unmodeled')==='1', hideApproximate:params.get('hideApproximate')==='1', hidePast: params.get('hidePast') === '1', minHeight: normalizeMinHeight(params.get('minHeight')),
    hideUnknownHeight: params.get('hideUnknownHeight') === '1', hideUnknownStatus: params.get('hideUnknownStatus') === '1', hidePrivate: params.get('hidePrivate') === '1' };
}
export function writeTowerFilters(params: URLSearchParams, filters: TowerFilters) {
  if (filters.includeReferences) params.delete('references'); else params.set('references', '0');
  if(filters.includeUnmodeled)params.set('unmodeled','1');else params.delete('unmodeled');
  if(filters.hideApproximate)params.set('hideApproximate','1');else params.delete('hideApproximate');
  for (const key of ['hidePast', 'hideUnknownHeight', 'hideUnknownStatus', 'hidePrivate'] as const) {
    if (filters[key]) params.set(key, '1'); else params.delete(key);
  }
  const height = normalizeMinHeight(filters.minHeight);
  if (height) params.set('minHeight', String(height)); else params.delete('minHeight');
}
export function towerMatchesFilters(tower: FilterableTower, filters: TowerFilters): boolean {
  if (tower.modelCollection === 'pending') return false;
  if (tower.modelCollection && tower.modelCollection !== 'core' && !filters.includeReferences) return false;
  const status = typeof tower.status === 'string' ? tower.status : tower.status?.value ?? 'unknown';
  if (filters.hidePast && (status === 'temporary' || status === 'removed' || tower.historicalAppearance)) return false;
  if (filters.hidePrivate && tower.access === 'private') return false;
  if (filters.hideUnknownStatus && status !== 'existing') return false;
  const knownHeight = Number.isFinite(tower.heightM) && (tower.heightM ?? 0) > 0;
  if (!knownHeight) return !filters.hideUnknownHeight;
  return tower.heightM! >= normalizeMinHeight(filters.minHeight);
}
export function activeTowerFilters(filters: TowerFilters): number {
  return Number(!filters.includeReferences) + Number(filters.includeUnmodeled) + Number(filters.hideApproximate) + Number(filters.hidePast) + Number(filters.minHeight > 0) + Number(filters.hideUnknownHeight) + Number(filters.hideUnknownStatus) + Number(filters.hidePrivate);
}
/** The archive and model library keep their own scope; these two switches control the globe. */
export function mapTowerMatchesFilters(tower:FilterableTower,filters:TowerFilters):boolean{
  return (!!tower.modelKey||filters.includeUnmodeled)&&(!tower.approximateLocation||!filters.hideApproximate)&&towerMatchesFilters(tower,filters);
}
export function filterJourneyRoutes<T extends { stops: string[] }>(routes: T[], visibleIds: Set<string>): T[] {
  return routes.map(route => ({ ...route, stops: route.stops.filter(id => visibleIds.has(id)) })).filter(route => route.stops.length > 1);
}
