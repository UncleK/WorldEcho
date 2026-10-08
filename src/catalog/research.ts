import type { Tower as CanonicalTower, Height } from '../../data/types.v1';
import { galleryEligible, demoGalleryEligible, isMapAnchor } from '../../scripts/catalog-api.mjs';
import { DEFAULT_TOWER_FILTERS, readTowerFilters, towerMatchesFilters, writeTowerFilters, type TowerFilters } from '../domain/tower-filters.ts';
import { towerDisplayMetadata } from '../../scripts/tower-display-policy.mjs';
import { isPublicModel } from '../domain/model-publication.mjs';

export type Region = 'asia' | 'europe' | 'north-america' | 'south-america' | 'africa' | 'oceania' | 'other';
export type MaterialGroup = 'steel' | 'iron' | 'metal' | 'wood' | 'bamboo' | 'stone' | 'concrete' | 'plastic' | 'composite' | 'reused' | 'other';
export const REGION_LABELS: Record<Region, string> = { asia: '亚洲', europe: '欧洲', 'north-america': '北美洲', 'south-america': '南美洲', africa: '非洲', oceania: '大洋洲', other: '其他 / 待归属' };
export const MATERIAL_LABELS: Record<MaterialGroup, string> = { steel: '钢', iron: '铁', metal: '金属未分级', wood: '木材', bamboo: '竹材', stone: '石材 / 砖', concrete: '混凝土', plastic: '塑料', composite: '玻璃纤维等复合材料', reused: '再利用材料', other: '其他明确材料' };
export const CLASS_LABELS: Record<string, string> = { original: '原塔', replica: '复制版本', local_variant: '地方变体', inspired: '受启发建筑', unresolved: '身份待核' };
export const STATUS_LABELS: Record<string, string> = { existing: '来源记录现存', removed: '已拆除记录', temporary: '临时设施', unknown: '现状待核' };
export const SCOPE_LABELS: Record<string, string> = { total: '总高度', structure: '结构高度', unknown: '端点待核' };
export const EVENT_LABELS: Record<string, string> = { built: '建造', rebuilt: '重建', opened: '开放', renovated: '修缮', removed: '拆除', relocated: '迁移' };

export interface ResearchSource { id: string; title: string; url: string; publisher: string | null; kind: string }
export interface ResearchPhoto { id: string; url: string | null; thumbnail: string | null; pageUrl: string; author: string | null; capturedAt: string | null; license: { text: string; url: string|null }; reuseStatus?:string; demoDisplayStatus?:string|null; originPageUrl?:string|null }
export interface EvidenceEvent { kind: string; date: string; year: number; sourceIds: string[]; notes: string[] }
export interface MaterialClaim { value: string; groups: MaterialGroup[]; sourceIds: string[] }
export interface ResearchRow {
  id: string; aliasOf?: string | null; name: string; nameEn?: string | null; nameFr?: string | null; communityNameReviewed?: boolean; localName: string | null; aliases: string[]; label: string | null;
  countryCode: string; countryName: string; city: string | null; venue: string | null; region: Region;
  classification: string; familyId: string; landmarkType: string; status: string; statusSourceIds: string[];
  access?: 'private' | 'public' | 'unknown'; historicalAppearance?: boolean;
  heightM: number | null; heightScope: string | null; heightApproximate: boolean; heightConverted: boolean; heightSourceIds: string[];
  heightRankEligible?: boolean; heightDisplayRole?: string|null;
  heightObservationCount: number; heightNotes: string[];
  builtYear: number | null; openedYear: number | null; events: EvidenceEvent[];
  materials: MaterialClaim[]; materialGroups: MaterialGroup[];
  mapReady: boolean; globeAvailable: boolean; approximateLocation?:boolean; modelKey: string | null; modelScope?:string;
  modelCollection?:'core'|'reference'|'related'|'other'|'pending'; modelContext?:'tower-body'|'inferred-completion';
  maps: { google: string | null; amap: string | null; preferred: string }; coordinateSourceIds: string[];
  photoCount: number; displayPhotoCount: number; photos: ResearchPhoto[];
  summary: string | null; summarySourceIds: string[]; uses: string[]; gaps: string[]; sourceIds: string[];
  communitySummary?:{zh:string;en:string;fr?:string};priorSummary?:string;
  researchStatus: string; coverage: number; coverageFields: string[];
}
export interface ResearchDataset { version: string; generatedAt: string; communityRevision?: number; entries: ResearchRow[]; sources: ResearchSource[] }
export interface RawSource extends ResearchSource { [key: string]: unknown }
export interface RawMedia { id: string; pageUrl: string; author: string | null; capturedAt: string | null; license: { text: string; url: string|null }; [key: string]: unknown }
export interface PublicRow { id: string; label?: string; modelKey?: string | null; photos?: Array<ResearchPhoto> }

const REGION_COUNTRIES: Record<Region, string> = {
  asia: 'AE AF AM AZ BD BH BN BT CN GE HK ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TW UZ VN YE TR',
  europe: 'AD AL AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA XK',
  'north-america': 'AG AI AW BB BL BM BQ BS BZ CA CR CU CW DM DO GD GL GP GT HN HT JM KN KY LC MF MQ MS MX NI PA PM PR SV SX TC TT US VC VG VI',
  'south-america': 'AR BO BR CL CO EC FK GF GY PE PY SR UY VE',
  africa: 'AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TG TN TZ UG YT ZA ZM ZW',
  oceania: 'AS AU CC CK CX FJ FM GU KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV UM VU WF WS', other: '',
};
export function countryRegion(code: string): Region { return (Object.keys(REGION_COUNTRIES) as Region[]).find(region => REGION_COUNTRIES[region].split(' ').includes(code)) ?? 'other'; }
const unique = <T,>(values: T[]): T[] => [...new Set(values)];
const sourceUrl = (value: unknown): string | null => { if (typeof value !== 'string') return null; try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; } };
const publishedAsset = (value: unknown): string | null => typeof value === 'string' && /^\/assets\/photos\/[a-zA-Z0-9_.-]+\.(webp|jpg|png)$/.test(value) ? value : null;
export function heightInMeters(height: Height | null, sourceIds: Set<string>): number | null {
  if (!height || !Number.isFinite(height.value) || height.value <= 0 || !['m', 'ft'].includes(height.unit)
    || !height.sourceIds?.some(id => sourceIds.has(id))) return null;
  return height.value * (height.unit === 'ft' ? .3048 : 1);
}
export function classifyMaterial(value: string): MaterialGroup[] {
  const text = value.toLowerCase(); const groups: MaterialGroup[] = [];
  if (!text.trim() || /^(unknown|null|not\s+(known|reported)|未知|未确认|材料待核)$/.test(text.trim())) return [];
  if (/steel|钢/.test(text)) groups.push('steel');
  if (/iron|铁/.test(text) && !/钢/.test(text)) groups.push('iron');
  if (/wood|timber|木/.test(text)) groups.push('wood');
  if (/bamboo|竹/.test(text)) groups.push('bamboo');
  if (/stone|marble|brick|石|砖/.test(text)) groups.push('stone');
  if (/concrete|cement|混凝土|水泥/.test(text)) groups.push('concrete');
  if (/plastic|acrylic|塑料|亚克力/.test(text)) groups.push('plastic');
  if (/fibergla|fibre.?gla|composite|玻璃纤维|复合/.test(text)) groups.push('composite');
  if (/reused|recycled|scrap|offcuts|废|再利用|回收/.test(text)) groups.push('reused');
  if (!groups.some(group => ['steel', 'iron'].includes(group)) && /metal|金属/.test(text)) groups.push('metal');
  return groups.length ? unique(groups) : ['other'];
}

export function buildResearchDataset(input: { towers: CanonicalTower[]; sources: RawSource[]; media: RawMedia[]; published: PublicRow[]; approximate?:PublicRow[]; photoAssets?:PublicRow['photos'] }, generatedAt = new Date().toISOString()): ResearchDataset {
  const sources = input.sources.flatMap(row => { const url = sourceUrl(row.url); return url ? [{ id: row.id, title: row.title, url, publisher: row.publisher ?? null, kind: row.kind }] : []; });
  const sourceIds = new Set(sources.map(row => row.id));
  const validSources = (ids: string[] | undefined) => unique(ids ?? []).filter(id => sourceIds.has(id));
  const media = new Map(input.media.map(row => [row.id, row]));
  const published = new Map(input.published.map(row => [row.id, row]));
  const approximate=new Map((input.approximate??[]).map(row=>[row.id,row]));
  const byId=new Map(input.towers.map(tower=>[tower.id,tower]));
  const canonicalId=(tower:CanonicalTower)=>{const seen=new Set<string>();while(tower.aliasOf&&!seen.has(tower.id)){seen.add(tower.id);const next=byId.get(tower.aliasOf);if(!next)break;tower=next;}return tower.id;};
  const publicPhotos = new Map([...input.published.flatMap(row => (row.photos ?? []).map(photo => [photo.id, photo] as const)),...(input.photoAssets??[]).map(photo=>[photo.id,photo] as const)]);
  const countries = new Intl.DisplayNames(['zh-CN'], { type: 'region' });
  const entries = input.towers.map(tower => {
    const live = published.get(tower.id);
    const countryCode = tower.location.countryCode;
    const heightM = heightInMeters(tower.dimensions.height, sourceIds);
    const rawHeight = tower.dimensions.height;
    const materials = tower.appearance.materials.flatMap(claim => { const ids = validSources(claim.sourceIds), groups = classifyMaterial(claim.value); return ids.length && groups.length ? [{ value: claim.value, groups, sourceIds: ids }] : []; });
    const originalHeight = rawHeight as Height & { originalUnit?: string; researchOriginal?: { unit?: string } } | null;
    const converted = heightM !== null && (rawHeight!.unit === 'ft' || originalHeight?.originalUnit === 'ft' || originalHeight?.researchOriginal?.unit === 'ft');
    const events = tower.history.events.flatMap(event => {
      const ids = validSources(event.sourceIds), year = Number(event.date.slice(0, 4));
      return ids.length && Number.isInteger(year) && year > 0 && /^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(event.date)
        ? [{ kind: event.kind, date: event.date, year, sourceIds: ids, notes: event.notes ?? [] }] : [];
    }).sort((a, b) => a.date.localeCompare(b.date));
    const photos = unique(tower.mediaIds).flatMap(id => {
      const record = media.get(id);
      const exported = publicPhotos.get(id);
      if (!record || !(galleryEligible(record, tower.id) || (exported && demoGalleryEligible(record, tower.id)))) return [];
      const pageUrl = sourceUrl(record.pageUrl);
      if (!pageUrl) return [];
      return [{ id, pageUrl, url: publishedAsset(exported?.url), thumbnail: publishedAsset(exported?.thumbnail), author: record.author,
        capturedAt: record.capturedAt, license: record.license,
        reuseStatus:typeof record.reuseStatus === 'string' ? record.reuseStatus : undefined,
        demoDisplayStatus:record.demoDisplayStatus === 'demo_only_user_authorized' ? record.demoDisplayStatus : null,
        originPageUrl:typeof record.originPageUrl === 'string' ? sourceUrl(record.originPageUrl) : null }];
    });
    const firstYear = (kind: string) => events.filter(event => event.kind === kind).sort((a, b) => a.year - b.year)[0]?.year ?? null;
    const builtYear = firstYear('built'), openedYear = firstYear('opened');
    const mapReady = isMapAnchor(tower.location.selected) && tower.maps.status === 'available';
    const coverageFields = [heightM !== null && 'height', builtYear !== null && 'built', materials.length > 0 && 'material', mapReady && 'location', photos.length > 0 && 'photo'].filter((field): field is string => typeof field === 'string');
    const summarySources = validSources(tower.editorial?.sourceIds ?? tower.story?.sourceIds);
    const summary = summarySources.length ? tower.editorial?.summary ?? tower.story?.text ?? null : null;
    const linkedSources = unique([...validSources(tower.sourceIds), ...validSources(rawHeight?.sourceIds), ...materials.flatMap(claim => claim.sourceIds),
      ...events.flatMap(event => event.sourceIds), ...summarySources, ...validSources(tower.location.selected?.sourceIds), ...validSources(tower.status.sourceIds)]);
    let countryName: string; try { countryName = countries.of(countryCode) ?? countryCode; } catch { countryName = countryCode; }
    return {
      id: tower.id, aliasOf:tower.aliasOf??null, name: tower.names.zh, nameEn: tower.names.local ?? tower.location.venue ?? tower.location.city, localName: tower.names.local, aliases: tower.aliases, label: live?.label ?? null,
      countryCode, countryName, city: tower.location.city, venue: tower.location.venue, region: countryRegion(countryCode),
      classification: tower.classification, familyId: tower.familyId ?? 'eiffel', landmarkType: tower.landmarkType ?? 'tower',
      status: tower.status.value, statusSourceIds: validSources(tower.status.sourceIds),
      ...towerDisplayMetadata(tower.id),
      heightM, heightScope: heightM !== null ? rawHeight!.scope : null,
      heightApproximate: heightM !== null && (converted || rawHeight!.precision === 'approximate'),
      heightConverted: converted,
      heightRankEligible: tower.model?.collection !== 'pending' && tower.model?.collection !== 'other' && tower.model?.publicationEligibility !== 'held' && tower.dimensions.comparisonEligible !== false && tower.model?.normalizationScope !== 'visible-section' && tower.model?.modelContext !== 'inferred-completion',
      heightDisplayRole: tower.dimensions.heightDisplayRole ?? null,
      heightSourceIds: heightM !== null ? validSources(rawHeight!.sourceIds) : [],
      heightObservationCount: tower.dimensions.observations.filter(height => heightInMeters(height, sourceIds) !== null).length,
      heightNotes: Array.isArray((rawHeight as Height & { notes?: string[] } | null)?.notes) ? (rawHeight as Height & { notes: string[] }).notes : [],
      builtYear, openedYear, events, materials, materialGroups: unique(materials.flatMap(claim => claim.groups)),
      mapReady, globeAvailable:published.has(canonicalId(tower))||approximate.has(canonicalId(tower)),approximateLocation:approximate.has(canonicalId(tower)),
      modelKey: !isPublicModel(tower.model)||(!['original','replica','local_variant'].includes(tower.classification)&&tower.model?.collection!=='other')?null:tower.model?.key ?? null,
      modelScope:tower.model?.normalizationScope,modelCollection:tower.model?.collection,modelContext:tower.model?.modelContext,
      maps: { google: mapReady ? sourceUrl(tower.maps.google) : null, amap: mapReady ? sourceUrl(tower.maps.amap) : null, preferred: tower.maps.preferred },
      coordinateSourceIds: mapReady ? validSources(tower.location.selected?.sourceIds) : [],
      photos, photoCount: photos.length, displayPhotoCount: photos.filter(photo => photo.thumbnail).length,
      summary, summarySourceIds: summarySources, uses: tower.editorial?.currentUses ?? [], gaps: tower.gaps,
      sourceIds: linkedSources, researchStatus: tower.researchStatus, coverage: coverageFields.length, coverageFields,
    } satisfies ResearchRow;
  });
  return { version: '1.0', generatedAt, entries, sources };
}

export type CatalogSort = 'coverage' | 'name' | 'height-desc' | 'height-asc' | 'year-asc' | 'photos';
export interface CatalogQuery extends TowerFilters { q: string; region: string; country: string; classification: string; completeness: string; material: string; model: string; status: string; missing: string; sort: CatalogSort; page: number; pageSize: number; entry: string }
export const DEFAULT_QUERY: CatalogQuery = { ...DEFAULT_TOWER_FILTERS, q: '', region: '', country: '', classification: '', completeness: '', material: '', model: '', status: '', missing: '', sort: 'coverage', page: 1, pageSize: 25, entry: '' };
export function readQuery(search: string): CatalogQuery {
  const params = new URLSearchParams(search), sort = params.get('sort') ?? '';
  const result = { ...DEFAULT_QUERY, ...readTowerFilters(search) };
  for (const key of ['q', 'region', 'country', 'classification', 'completeness', 'material', 'model', 'status', 'missing', 'entry'] as const) result[key] = (params.get(key) ?? '').slice(0, key === 'q' ? 200 : 160);
  if (result.region && !(result.region in REGION_LABELS)) result.region = '';
  if (result.classification && !(result.classification in CLASS_LABELS)) result.classification = '';
  if (result.material && result.material !== 'unknown' && !(result.material in MATERIAL_LABELS)) result.material = '';
  if (!['', 'rich', 'partial', 'lead'].includes(result.completeness)) result.completeness = '';
  if (!['', 'yes', 'no', 'map', 'photo'].includes(result.model)) result.model = '';
  if (result.status && !(result.status in STATUS_LABELS)) result.status = '';
  if (!['', 'location', 'height', 'status', 'photo'].includes(result.missing)) result.missing = '';
  result.country = /^[A-Z]{2}$/.test(result.country.toUpperCase()) ? result.country.toUpperCase() : '';
  if (['coverage', 'name', 'height-desc', 'height-asc', 'year-asc', 'photos'].includes(sort)) result.sort = sort as CatalogSort;
  result.page = Math.max(1, Math.min(10000, Math.floor(Number(params.get('page')) || 1)));
  const size = Number(params.get('pageSize')); if ([25, 50, 100].includes(size)) result.pageSize = size;
  return result;
}
export function querySearch(query: CatalogQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (!(key in DEFAULT_TOWER_FILTERS) && value !== DEFAULT_QUERY[key as keyof CatalogQuery] && value !== '') params.set(key, String(value));
  writeTowerFilters(params, query);
  return params.size ? `?${params}` : '';
}
const searchKey = (value: string) => value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
const textCompare = (a: ResearchRow, b: ResearchRow) => a.name.localeCompare(b.name, 'zh-CN') || a.id.localeCompare(b.id);
const numeric = (a: number | null, b: number | null, descending = false) => a === null ? b === null ? 0 : 1 : b === null ? -1 : descending ? b - a : a - b;
export function filterRows(entries: ResearchRow[], query: CatalogQuery): ResearchRow[] {
  const words = searchKey(query.q).split(' ').filter(Boolean);
  const rows = entries.filter(row => {
    const text = searchKey([row.name, row.nameEn, row.nameFr, row.localName, row.id, row.label, row.countryName, row.countryCode, row.city, row.venue, ...row.aliases].filter(Boolean).join(' '));
    return towerMatchesFilters(row, query) && (!query.status || row.status === query.status)
      && (!query.missing || (query.missing === 'location' ? !row.mapReady : query.missing === 'height' ? row.heightM === null : query.missing === 'status' ? row.status === 'unknown' : row.photoCount === 0))
      && words.every(word => text.includes(word)) && (!query.region || row.region === query.region) && (!query.country || row.countryCode === query.country)
      && (!query.classification || row.classification === query.classification) && (!query.material || (query.material === 'unknown' ? !row.materials.length : row.materialGroups.includes(query.material as MaterialGroup)))
      && (!query.completeness || (query.completeness === 'rich' ? row.coverage >= 4 : query.completeness === 'partial' ? row.coverage > 0 && row.coverage < 4 : row.coverage === 0))
      && (!query.model || (query.model === 'yes' ? !!row.modelKey : query.model === 'map' ? row.mapReady : query.model === 'photo' ? row.photoCount > 0 : !row.modelKey));
  });
  return rows.sort((a, b) => {
    const order = query.sort === 'height-desc' ? numeric(a.heightM, b.heightM, true) : query.sort === 'height-asc' ? numeric(a.heightM, b.heightM)
      : query.sort === 'year-asc' ? numeric(a.builtYear ?? a.openedYear, b.builtYear ?? b.openedYear) : query.sort === 'photos' ? b.photoCount - a.photoCount
      : query.sort === 'coverage' ? b.coverage - a.coverage || Number(!!b.modelKey) - Number(!!a.modelKey) : 0;
    return order || textCompare(a, b);
  });
}
export function paginateRows(rows: ResearchRow[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize)), safePage = Math.max(1, Math.min(page, pageCount));
  return { entries: rows.slice((safePage - 1) * pageSize, safePage * pageSize), page: safePage, pageCount, total: rows.length };
}
export function calculateStats(rows: ResearchRow[]) {
  const inScope = (row: ResearchRow) => ['original', 'replica', 'local_variant'].includes(row.classification);
  const adoptedHeights = rows.filter(row => row.heightM !== null && row.heightSourceIds.length > 0 && ['original', 'replica', 'local_variant'].includes(row.classification));
  const heights = adoptedHeights.filter(row => row.heightRankEligible !== false);
  const replicas = heights.filter(row => row.classification !== 'original').sort((a, b) => b.heightM! - a.heightM!);
  return { research: rows.length, countries: unique(rows.map(row => row.countryCode)).length, mapped: rows.filter(row => inScope(row) && row.mapReady).length,
    modeled: rows.filter(row => inScope(row) && row.modelKey).length, photographed: rows.filter(row => row.photoCount > 0).length,
    materialKnown: rows.filter(row => row.materials.length).length, heightKnown: adoptedHeights.length,
    heightPending: rows.filter(row => row.heightM === null && row.heightObservationCount > 0).length,
    regions: (Object.keys(REGION_LABELS) as Region[]).map(region => ({ region, count: rows.filter(row => row.region === region).length })),
    materials: (Object.keys(MATERIAL_LABELS) as MaterialGroup[]).map(group => ({ group, count: rows.filter(row => row.materialGroups.includes(group)).length })).filter(row => row.count > 0),
    heights: replicas, highestReplica: replicas[0] ?? null, smallestReplica: replicas.at(-1) ?? null,
    original: heights.find(row => row.classification === 'original') ?? null };
}
export function formatMeters(value: number | null, converted = false): string { return value === null ? '待核' : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: value < 1 ? 2 : converted ? 1 : 2 }).format(value); }
