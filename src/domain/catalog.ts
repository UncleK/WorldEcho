import { t, getLanguage } from '../i18n/messages.ts';
import type { SceneTower, ModelKey, ViewMode, ComparisonKind, ModelView } from '../types';
import { formatMetres, toMetres } from './measurements.mjs';
import { placeIdFromPath } from './place-entry.mjs';
import { displayHeightEvidence, displayHeightRange } from './display-height.mjs';

export interface Photo {
  id: string; url: string; thumbnail: string; author: string | null; capturedAt: string | null;
  pageUrl: string; license: { text: string; url: string | null }; modification: string; notes: string[];
  reuseStatus?: string; demoDisplayStatus?: string | null; originPageUrl?: string | null;
  assetRole?: string;
}
export interface Source { id: string; title: string | null; url: string; publisher: string | null; kind: string }
export interface Tower {
  id: string; aliases: string[]; name: string; nameEn?: string | null; communityNameReviewed?: boolean; label: string; countryCode: string; countryName: string;
  city: string; venue: string; classification: string;
  familyId: string; landmarkType: 'tower' | 'bell-tower' | 'monument' | 'building';
  editorial: { summary: string; currentUses: string[]; useStatus: string; evidenceDate: string | null; lastCheckedAt: string;
    sourceIds: string[]; visitorNotice: { text: string; startDate?: string; endDate?: string; sourceUrl: string } | null } | null;
  coordinates: { lat: number; lon: number; derived?: boolean; method?: string; verification: string };
  height: { value: number; unit: string; scope: 'structure' | 'total' | 'unknown'; precision: string; originalUnit?: string; originalValue?: number; researchOriginal?: { value: number; unit: string } } | null;
  heightM: number | null; modelKey: ModelKey | null; modelScope?: string | null; modelCollection?: ModelCollection; modelContext?:'tower-body'|'inferred-completion';
  heightDisplayRole?:string|null;comparisonEligible?:boolean|null;
  access?: 'private' | 'public' | 'unknown'; historicalAppearance?: boolean;
  communitySummary?: {zh:string;en:string;fr?:string}; priorSummary?: string;
  statedScale: { replicaToOriginal?: string | number | null; text: string } | null;
  history: { events: Array<{ kind: string; date: string; precision: string }> };
  story: { text: string } | null;
  appearance: { materials: Array<{ value: string }>; features: Array<{ text: string }> };
  photos: Photo[]; sources: Source[]; maps: { preferred: 'google' | 'amap'; google: string | null; amap: string | null; reason: string | null };
  gaps: string[];
  status?: { value: 'existing' | 'unknown' | 'removed' | 'temporary'; evidenceDate: string | null; sourceIds: string[]; notes: string[] };
  approximateLocation?: boolean;
  mapPlacement?: {basis:string;precisionLabel:{zh:string;en:string;fr:string};reason:string;sourceIds:string[];sourceUrls:string[]};
}
export type ModelCollection = 'core' | 'reference' | 'related' | 'other' | 'pending';
export interface ModelCase { id:string;modelKey:string;modelScope?:string;modelCollection?:ModelCollection;modelContext?:'tower-body'|'inferred-completion';name:string;nameEn?:string;communityNameReviewed?:boolean;communitySummary?:{zh:string;en:string;fr?:string};countryCode:string;countryName:string;heightM:number|null;heightApproximate?:boolean;hasMap:boolean;previewUrl:string;previewHash?:string;views?:Partial<Record<ModelView,{url:string;sha256:string}>>;status?:string;access?:'private'|'public'|'unknown';historicalAppearance?:boolean }
export interface AppCatalog { version: string; generatedAt?: string; communityRevision?: number; quizSetId: string; towers: Tower[]; approximateTowers?:Tower[]; modelCases?:ModelCase[]; researchCount: number; modeledCount: number;
  routes: Array<{id: string; title: string; intro: string; stops: string[]}>;
  families: Array<{ id: string; nameZh: string; landmarkType: string; status: string }>;
  geographicCredit: { name: string; url: string } }
export const toSceneTower = (tower: Tower): SceneTower => ({ id: tower.id, name: tower.label, countryCode: tower.countryCode,
  lat: tower.coordinates.lat, lon: tower.coordinates.lon, heightM: tower.heightM, heightText: heightLabel(tower), heightScope: tower.height?.scope ?? 'unknown', modelKey: tower.modelKey,modelScope:tower.modelScope,modelContext:tower.modelContext });
export function heightLabel(tower: Tower) {
  if (!tower.height) return displayHeightRange(tower.id,getLanguage())??t("待核对");
  const originalUnit = tower.height.originalUnit ?? tower.height.researchOriginal?.unit;
  const converted = tower.height.unit !== 'm' || (!!originalUnit && originalUnit !== 'm');
  return formatMetres(tower.heightM ?? toMetres(tower.height), tower.height.precision === 'approximate', converted, getLanguage());
}
export function replicaRatioLabel(value:string|number|null|undefined){
  if(typeof value==='number'&&Number.isFinite(value)&&value>0&&value<=1)return `1:${new Intl.NumberFormat('en',{maximumFractionDigits:3}).format(1/value)}`;
  return value??'—';
}
export function heightScope(tower: Tower) {
  if (!tower.height) {const estimate=displayHeightEvidence(tower.id);return estimate?.displayM?t(estimate.method==='user-estimate'?'用户估算':estimate.method==='photo-estimate'?'图片估算':'来源高度线索'):t("高度待补");}
  return tower.height.scope === 'total' ? t("总高度") : tower.height.scope === 'structure' ? t("结构高度") : t("参考高度");
}
export function builtLabel(tower: Tower) {
  const event = yearEvent(tower);
  if (!event || !/^\d{4}/.test(event.date)) return '—';
  return event.precision === 'decade' ? t("{0}0年代", event.date.slice(0, 3)) : event.date.slice(0, 4);
}
function yearEvent(tower: Tower) { return ['built', 'opened', 'rebuilt'].map((kind) => tower.history.events.find((event) => event.kind === kind && event.date)).find(Boolean); }
export function yearScope(tower: Tower) { const event = yearEvent(tower); return event?.kind === 'opened' ? t("开放") : event?.kind === 'rebuilt' ? t("重建") : t("建成"); }
export function strictComparison(towers: Tower[]) {
  return towers.length >= 2 && towers.every((tower) => tower.comparisonEligible !== false && tower.modelKey && tower.modelScope!=='visible-section' && tower.modelContext!=='inferred-completion' && tower.height && Number.isFinite(tower.heightM) && (tower.heightM ?? 0) > 0 && tower.height.scope !== 'unknown')
    && towers.every((tower) => tower.height?.scope === towers[0].height?.scope);
}

export function readCatalogLocation(towers: Tower[], search: string, pathname = typeof location === 'undefined' ? '' : location.pathname) {
  const params = new URLSearchParams(search);
  const requested = params.get('tower') || placeIdFromPath(pathname);
  const find = (id: string | null) => towers.find((tower) => tower.id === id || tower.aliases.includes(id ?? ''));
  const found = find(requested);
  const fallback = find('fr-paris-eiffel-tower') ?? towers[0];
  const defaultQueue = ['fr-paris-eiffel-tower', 'us-paris-texas', 'mo-cotai-parisian'];
  const requestedQueue = params.has('compare') ? (params.get('compare') ?? '').split(',') : defaultQueue;
  const comparisonIds = [...new Set(requestedQueue.map((id) => find(id)).filter((tower): tower is Tower =>
    !!tower?.modelKey).map((tower) => tower.id))].slice(0, 4);
  const viewMode: ViewMode = params.get('view') === 'comparison' ? 'comparison' : 'globe';
  const requestedKind = params.get('kind');
  const candidateKind: ComparisonKind = requestedKind === 'height' || requestedKind === 'reported' ? requestedKind : 'appearance';
  const queue = towers.filter(tower => comparisonIds.includes(tower.id));
  const metricAvailable = queue.length > 0 && queue.every(tower => tower.comparisonEligible !== false && tower.modelScope !== 'visible-section' && tower.modelContext !== 'inferred-completion' && Number.isFinite(tower.heightM) && (tower.heightM ?? 0) > 0);
  const comparisonKind = candidateKind !== 'appearance' && !metricAvailable ? 'appearance' : candidateKind === 'height' && !strictComparison(queue) ? 'reported' : candidateKind;
  return { selectedId: found?.id ?? fallback?.id ?? '', comparisonIds, viewMode, comparisonKind,
    focusId: requested && found && viewMode === 'globe' ? found.id : null, unavailableRequest: !!requested && !found };
}
