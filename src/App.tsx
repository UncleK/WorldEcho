import ComparisonControls from "./features/ComparisonControls";
import type { ModelView } from "./types";
import type { SkyPreset } from "./scene/sky";
import { useTheme } from "./theme";
import SiteHeader from "./features/SiteHeader";
import ShareTower from "./features/ShareTower";
import RecordActions from './features/RecordActions';
import "./features/detail-records.css";
import { flushSync } from 'react-dom';
import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { ArrowUpRight, Check, ExternalLink, Globe2,
  Layers3, PanelLeftClose, PanelLeftOpen, MapPin, Maximize2, Minimize2, Plus, Search, X, Info, Flag } from 'lucide-react';
import WorldScene from './scene/WorldScene';
import { useTowerPlay } from './features/useTowerPlay';
import TowerPlayStatus from './features/TowerPlayStatus';
import { TOWER_TRIGGERS, towerPlayCopy } from './domain/tower-play';
import type { EffectName } from './playground/play-state';
import CommunityForm from './features/CommunityForm';
import type { CommunityMode } from './features/CommunityForm';
import { DEFAULT_TOWER_FILTERS, filterJourneyRoutes, readTowerFilters, towerMatchesFilters, mapTowerMatchesFilters, writeTowerFilters, type TowerFilters } from './domain/tower-filters';
import { t, useLanguage } from './i18n';
import { getEditorial } from './i18n/editorial';
import ExploreControls from './features/ExploreControls';
import ClusterPicker from './features/ClusterPicker';
import JourneyPicker from './features/JourneyPicker';
import JourneyProgress from './features/JourneyProgress';
import PhotoCarousel from './features/PhotoCarousel';
import PhotoQuiz from './features/PhotoQuiz';
import { validOpponentScore } from './domain/quiz';
import { placeIdFromPath } from './domain/place-entry.mjs';
import type { ComparisonKind, EarthStyle, ViewMode, WorldSceneHandle, TowerRenderStyle, FocusProgress } from './types';
import { builtLabel, heightLabel, heightScope, readCatalogLocation, replicaRatioLabel, strictComparison, toSceneTower, yearScope } from './domain/catalog';
import type { AppCatalog, Tower, ModelCase } from './domain/catalog';
import { usePublicData } from './domain/usePublicData';
import { useReducedMotion } from './domain/useReducedMotion';
import { toggleComparisonQueue } from './domain/comparison.mjs';
const TowerResearchDetails=lazy(()=>import('./features/TowerResearchDetails'));
const TowerPlayIntro=lazy(()=>import('./features/TowerPlayIntro'));
const ModelGallery=lazy(()=>import('./features/ModelGallery'));
const ModelViewer=lazy(()=>import('./features/ModelViewer'));

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="scene-fallback"><Globe2 size={52} /><h2>{t("继续探索铁塔资料")}</h2><p>{t("这台设备暂未能启用三维地球。照片、来源和地图仍可查看。")}</p><a href="/catalog.html">{t("打开资料目录")}<ArrowUpRight size={15} /></a></div> : this.props.children; }
}
function useCatalog() { return usePublicData<AppCatalog>('/catalog.v1.json'); }

function useDialogFocus(open: boolean, dialogRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
    const focusFirst = () => (focusable()[0] ?? dialog).focus();
    focusFirst();
    const trapTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0]; const last = items.at(-1);
      if (!first || !last) { event.preventDefault(); dialog.focus(); return; }
      if (!dialog.contains(document.activeElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault(); (event.shiftKey ? last : first).focus();
      }
    };
    const containFocus = (event: FocusEvent) => { if (!dialog.contains(event.target as Node)) focusFirst(); };
    document.addEventListener('keydown', trapTab, true);
    document.addEventListener('focusin', containFocus);
    return () => {
      document.removeEventListener('keydown', trapTab, true);
      document.removeEventListener('focusin', containFocus);
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected && !previous.closest('[inert]')) previous.focus();
    };
  }, [open, dialogRef]);
}

interface GameRequest { setId: string; seed: string; opponentScore?: number }
function gameFromLocation(): GameRequest | null {
  const params = new URLSearchParams(location.search); const setId = params.get('quiz');
  if (!setId) return null;
  const score = params.has('vs') ? Number(params.get('vs')) : undefined;
  return { setId, seed: params.get('seed') ?? 'hello-world', opponentScore: validOpponentScore(score) ? score : undefined };
}
export default function App() {
  const theme=useTheme();
  const { data: rawData, error } = useCatalog();
  const lang = useLanguage();
  const towerPlay = useTowerPlay(), playCopy = towerPlayCopy(lang);
  const pendingIntroPlay = useRef<EffectName | null>(null);
  const data = useMemo(() => {
    if(!rawData)return rawData;
    const merged={...rawData,towers:[...new Map([...(rawData.approximateTowers??[]),...rawData.towers].map(tower=>[tower.id,tower])).values()]};
    if(lang==='zh-CN')return merged;
    const localized = getEditorial(lang).towers as Record<string, {label:string;name:string;summary:string;currentUses:string[];city?:string;venue?:string;visitorNotice?:{text:string}}>;
    const routes = getEditorial(lang).routes as Record<string, {title:string;intro:string}>;
    const countries = new Intl.DisplayNames([lang], {type:'region'});
    return {...rawData, modelCases:rawData.modelCases?.map(entry=>({...entry,name:entry.communityNameReviewed?entry.nameEn??entry.name:localized[entry.id]?.name??entry.nameEn??entry.name})), towers:merged.towers.map(tower => { const copy=localized[tower.id]; return {...tower, name:tower.communityNameReviewed ? tower.nameEn ?? tower.name : copy?.name ?? tower.nameEn ??tower.name, label:copy?.label ?? tower.city, city:copy?.city??tower.city, venue:copy?.venue??tower.venue, countryName:countries.of(tower.countryCode) ?? tower.countryCode, editorial:tower.editorial ? {...tower.editorial,summary:(lang==='fr'?tower.communitySummary?.fr??tower.communitySummary?.en:tower.communitySummary?.en)??copy?.summary??tower.editorial.summary,currentUses:copy?.currentUses??tower.editorial.currentUses,visitorNotice:tower.editorial.visitorNotice ? {...tower.editorial.visitorNotice,text:copy?.visitorNotice?.text??tower.editorial.visitorNotice.text} : null} : null}; }), routes:rawData.routes.map(route=>({...route,...routes[route.id]}))};
  }, [rawData, lang]);
  const scene = useRef<WorldSceneHandle>(null);
  const readyMode = useRef<ViewMode | null>(null);
  const currentMode = useRef<ViewMode>('globe');
  const pendingFocus = useRef<string | null>(null);
  const focusFrame = useRef<number | null>(null);
  const photoDialog = useRef<HTMLElement>(null);
  const clusterDialog = useRef<HTMLElement>(null);
  const journeyDialog = useRef<HTMLElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState('fr-paris-eiffel-tower');
  const [comparisonIds, setComparisonIds] = useState<string[]>(['fr-paris-eiffel-tower', 'us-paris-texas', 'mo-cotai-parisian']);
  const [viewMode, setViewMode] = useState<ViewMode>('globe');
  const [comparisonKind, setComparisonKind] = useState<ComparisonKind>('appearance');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [modelView,setModelView]=useState<ModelView>(()=>{const value=new URLSearchParams(location.search).get("angle");return value==="front"||value==="side"?value:"axonometric";});
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [researchSummaryTarget, setResearchSummaryTarget] = useState<HTMLDivElement | null>(null);
  const detailPanel = useRef<HTMLElement>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [communityMode, setCommunityMode] = useState<CommunityMode>({type:'submission'});
  const [towerFilters, setTowerFilters] = useState<TowerFilters>(()=>readTowerFilters(location.search));
  const [modelGalleryOpen,setModelGalleryOpen]=useState(false),[previewModel,setPreviewModel]=useState<ModelCase|null>(null);
  const [skyPreset,setSkyPreset]=useState<SkyPreset>(()=>{const value=new URLSearchParams(location.search).get("sky");return ["morning","golden","dusk","night","cloudy","overcast"].includes(value??"")?value as SkyPreset:"auto";});
  const [renderStyle, setRenderStyle] = useState<TowerRenderStyle>('heritage');
  const daytimeRenderStyle = useRef<TowerRenderStyle>('heritage');
  const [showLabels,setShowLabels]=useState(true);
  const [journeyPlaying, setJourneyPlaying] = useState(false);
  const [journeyComplete, setJourneyComplete] = useState(false);
  const [dwell, setDwell] = useState(0);
  const [focusProgress, setFocusProgress] = useState<FocusProgress>({id:'',phase:'idle',progress:0});
  const onFocusProgress = useCallback((state:FocusProgress) => setFocusProgress(state), []);
  const onUserInteract = useCallback(() => { setJourneyPlaying(false); pendingIntroPlay.current = null; }, []);
  const [earthStyle, setEarthStyle] = useState<EarthStyle>('day');
  const [exhibitScale, setExhibitScale] = useState(1);
  const [clusterIds, setClusterIds] = useState<string[]>([]);
  const [modelPicker, setModelPicker] = useState(false);
  const [journeysOpen, setJourneysOpen] = useState(false);
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [game, setGame] = useState<GameRequest | null>(gameFromLocation);
  const [discovered, setDiscovered] = useState<string[]>(() => { try { const value=JSON.parse(localStorage.getItem('landmark-atlas.explored.v1') ?? '[]'); return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(0,1000) : []; } catch { return []; } });
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState('');
  const reducedMotion = useReducedMotion();
  const overlayOpen = modelGalleryOpen || !!previewModel || communityOpen || photoOpen || clusterIds.length > 0 || journeysOpen || !!game;
  const towers = useMemo(()=>data?.towers.filter(tower=>mapTowerMatchesFilters(tower,towerFilters))??[],[data,towerFilters]);
  const modelCases = useMemo(()=>data?.modelCases?.filter(entry=>towerMatchesFilters(entry,towerFilters))??[],[data,towerFilters]);
  const routes = useMemo(()=>filterJourneyRoutes(data?.routes??[],new Set(towers.map(tower=>tower.id))),[data,towers]);
  const selected = towers.find((tower) => tower.id === selectedId) ?? towers[0];
  const playTrigger = selected ? TOWER_TRIGGERS[selected.id] : undefined;
  const comparing = comparisonIds.map((id) => towers.find((tower) => tower.id === id)).filter((tower): tower is Tower => !!tower && !!tower.modelKey);
  const metricComparisonAvailable = comparing.length >= 2 && comparing.every(tower => tower.comparisonEligible !== false && tower.modelScope !== 'visible-section' && tower.modelContext !== 'inferred-completion' && Number.isFinite(tower.heightM) && (tower.heightM ?? 0) > 0);
  const strict = strictComparison(comparing);
  const portraitPreview = (selected && comparisonIds.includes(selected.id) ? comparing : selected ? [selected] : []).flatMap(tower=>{
    const entry=data?.modelCases?.find(model=>model.id===tower.id);
    const view=entry?.views?.[modelView],url=view?.url??entry?.previewUrl,digest=view?.sha256??entry?.previewHash;
    return entry&&url?[{id:tower.id,label:tower.name,url:digest?url+'?v='+digest.slice(0,12):url}]:[];
  });
  const journey = routes.find((route) => route.id === journeyId);
  const journeyIndex = journey?.stops.indexOf(selectedId) ?? -1;
  const sceneTowers = useMemo(() => towers.map(toSceneTower), [towers]);
  const playOrigins = useMemo(() => data?.towers.filter(tower=>TOWER_TRIGGERS[tower.id]).map(toSceneTower)??[],[data]);
  useEffect(() => {
    if (pendingIntroPlay.current && focusProgress.phase === 'arrived' && focusProgress.id === selectedId) {
      const effect = pendingIntroPlay.current; pendingIntroPlay.current = null; towerPlay.activate(effect);
    }
  }, [focusProgress, selectedId, towerPlay.activate]);
  useDialogFocus(photoOpen, photoDialog);
  useDialogFocus(clusterIds.length > 0, clusterDialog);
  useDialogFocus(journeysOpen, journeyDialog);

  const flushFocus = useCallback(() => {
    if (currentMode.current !== 'globe' || readyMode.current !== 'globe' || !pendingFocus.current || !scene.current) return;
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null;
      if (currentMode.current !== 'globe' || readyMode.current !== 'globe' || !pendingFocus.current || !scene.current) return;
      const id = pendingFocus.current;
      pendingFocus.current = null;
      scene.current.focusTower(id);
    });
  }, []);
  useEffect(() => () => { if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current); }, []);
  const onSceneReady = useCallback(() => {
    if (viewMode !== currentMode.current) return;
    readyMode.current = viewMode;
    setReady(true);
    flushFocus();
  }, [viewMode, flushFocus]);

  useEffect(() => {
    if (!data) return;
    const apply = () => {
      const filters = readTowerFilters(location.search);
      const explicitParams=new URLSearchParams(location.search);
      if(!explicitParams.has('unmodeled')&&(explicitParams.has('tower')||location.pathname.includes('/places/'))){
        const requested=readCatalogLocation(data.towers,location.search);
        if(data.towers.find(tower=>tower.id===requested.selectedId)?.modelKey===null)filters.includeUnmodeled=true;
      }
      setTowerFilters(filters);
      const visible = data.towers.filter(tower=>mapTowerMatchesFilters(tower,filters));
      const next = readCatalogLocation(visible, location.search);
      const nextGame = gameFromLocation(); setGame(nextGame);
      const params = new URLSearchParams(location.search);
      const route = filterJourneyRoutes(data.routes,new Set(visible.map(tower=>tower.id))).find((item) => item.id === params.get('route'));
      if (route && !params.has('tower') && next.viewMode === 'globe') { next.selectedId = route.stops[0]; next.focusId = route.stops[0]; }
      setJourneyId(route && route.stops.includes(next.selectedId) && next.viewMode === 'globe' ? route.id : null);
      setJourneysOpen(false); setJourneyPlaying(false); setJourneyComplete(false); setCommunityOpen(false); setModelGalleryOpen(false); setPreviewModel(null);
      const towerStyle = params.get('towerStyle');
      const style = params.get('style');
      const environment = params.get('sky');
      const nextSky: SkyPreset = ['morning','golden','dusk','night','cloudy','overcast'].includes(environment ?? '') ? environment as SkyPreset : style === 'night' ? 'night' : 'auto';
      setSkyPreset(nextSky);
      const nextTowerStyle = towerStyle === 'metal' || towerStyle === 'porcelain' || towerStyle === 'blueprint' || towerStyle === 'illuminated' ? towerStyle : !params.has('towerStyle') && nextSky === 'night' ? 'illuminated' : 'heritage';
      setRenderStyle(nextTowerStyle);
      if (nextTowerStyle !== 'illuminated') daytimeRenderStyle.current = nextTowerStyle;
      const angle=params.get("angle");setModelView(angle==="front"||angle==="side"?angle:"axonometric");
      setShowLabels(params.get('labels')!=='0');
      setPhotoOpen(false);  setClusterIds([]);
      setEarthStyle(style === 'porcelain' || style === 'satellite' ? style : 'day');
      const rawScale = params.has('scale') ? parseFloat(params.get('scale') ?? '') : 1;
      setExhibitScale(Number.isFinite(rawScale) ? Math.round(Math.max(.1, Math.min(1.6, rawScale)) * 20) / 20 : 1);
      if (next.viewMode !== currentMode.current) readyMode.current = null;
      currentMode.current = next.viewMode;
      pendingFocus.current = next.focusId;
      setSelectedId(next.selectedId); setComparisonIds(next.comparisonIds);
      setViewMode(next.viewMode); setComparisonKind(next.comparisonKind);
      flushFocus();
      if (next.unavailableRequest) setToast(data.towers.some(tower=>tower.id===params.get('tower'))?t('这座塔被当前筛选隐藏，清除筛选可查看。'):t("这条资料尚未进入地球，完整研究目录中仍保留。"));
    };
    apply(); window.addEventListener('popstate', apply); return () => window.removeEventListener('popstate', apply);
  }, [data, flushFocus]);
  useEffect(() => { setPhotoIndex(0); setDwell(0); }, [selectedId]);
  useEffect(() => {
    const pageId = placeIdFromPath(location.pathname);
    const place = pageId ? data?.towers.find(tower => tower.id === pageId || tower.aliases.includes(pageId)) : null;
    document.title = place ? `${place.label} · World Echo` : lang === 'en' ? 'World Echo · Eiffel towers around the world' : lang === 'fr' ? 'World Echo · Les tours Eiffel dans le monde' : t("World Echo · 世界回响");
  }, [lang, data]);
  useEffect(() => {
    if (!journeyPlaying || !journey || viewMode !== 'globe') return;
    const timer=setInterval(() => {
      if (document.hidden || photoOpen || journeysOpen || clusterIds.length || game || communityOpen || focusProgress.phase !== 'arrived') return;
      setDwell(previous=>previous+150);
    },150);
    return()=>clearInterval(timer);
  }, [journeyPlaying,journey,viewMode,photoOpen,journeysOpen,clusterIds.length,game,communityOpen,focusProgress.phase]);
  useEffect(() => {
    if (!journeyPlaying || !journey || dwell < 8000) return;
    if (journeyIndex >= journey.stops.length-1) { setJourneyPlaying(false); setJourneyComplete(true); setToast(t('这条路线已参观完成')); }
    else { setDwell(0); explore(journey.stops[journeyIndex+1],journey.id); }
  }, [dwell,journeyPlaying,journey?.id,journeyIndex]);
  useEffect(() => { if (!selected || game) return; setDiscovered((previous) => previous.includes(selected.id) ? previous : [...previous, selected.id]); }, [selected?.id, game]);
  useEffect(() => { try { localStorage.setItem('landmark-atlas.explored.v1', JSON.stringify(discovered)); } catch { /* Browsing remains usable when storage is disabled. */ } }, [discovered]);
  useEffect(() => { if (comparisonKind === 'height' && !strict) setComparisonKind('reported'); }, [strict, comparisonKind]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3600); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || modelGalleryOpen || previewModel || communityOpen || game) return;
      if (photoOpen) setPhotoOpen(false);
      else if (detailsExpanded) changeDetailsExpansion(false);
      else if (clusterIds.length) setClusterIds([]);
      else if (journeysOpen) setJourneysOpen(false);
      else if (searchOpen) setSearchOpen(false);
      else if (viewMode === 'comparison') changeView('globe');
    };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  });

  function updateUrl(id: string, mode: ViewMode, queue: string[], kind: ComparisonKind, replace = false) {
    const url = new URL(location.href); url.searchParams.set('tower', id);
    const activeRoute = routes.find((route) => route.id === url.searchParams.get('route'));
    if (mode !== 'globe' || (activeRoute && !activeRoute.stops.includes(id))) { url.searchParams.delete('route'); setJourneyId(null); }
    if (mode === 'comparison') { url.searchParams.set('view', mode); url.searchParams.set('compare', queue.join(',')); url.searchParams.set('kind', kind); }
    else { url.searchParams.delete('view'); url.searchParams.delete('kind'); url.searchParams.set('compare', queue.join(',')); }
    history[replace ? 'replaceState' : 'pushState']({}, '', url);
  }
  function select(id: string) {
    setJourneyPlaying(false);
    if (currentMode.current === 'globe' && readyMode.current !== 'globe') pendingFocus.current = id;
    setSelectedId(id); setSearchOpen(false); setQuery(''); updateUrl(id, viewMode, comparisonIds, comparisonKind);
  }
  function changeView(mode: ViewMode, focusId?: string) {
    if(mode==='comparison') setJourneyPlaying(false);
    const switched = mode !== currentMode.current;
    if (switched) readyMode.current = null;
    currentMode.current = mode;
    pendingFocus.current = mode === 'globe' ? focusId ?? (switched ? selected?.id ?? selectedId : pendingFocus.current) : null;
    setViewMode(mode); updateUrl(selected?.id ?? selectedId, mode, comparisonIds, comparisonKind);
    flushFocus();
  }
  function changeKind(kind: ComparisonKind) { setComparisonKind(kind); updateUrl(selectedId, viewMode, comparisonIds, kind, true); }
  function toggleCompare(tower: Tower) {
    if (!tower.modelKey) { setToast(t('这座塔的模型正在补充。')); return; }
    const result = toggleComparisonQueue(comparisonIds, tower.id), next = result.ids;
    if (result.replaced) setToast(t('已用{0}替换最早加入的{1}', tower.label, towers.find(entry=>entry.id===result.replaced)?.label ?? result.replaced));
    setComparisonIds(next); const newStrict = strictComparison(towers.filter((item) => next.includes(item.id))); const kind = comparisonKind === 'height' && !newStrict ? 'reported' : comparisonKind;
    const metric = next.every(id=>{const entry=towers.find(item=>item.id===id);return entry && entry.comparisonEligible!==false && entry.modelScope!=='visible-section' && entry.modelContext!=='inferred-completion' && Number.isFinite(entry.heightM) && (entry.heightM??0)>0;});
    const effectiveKind = !metric ? 'appearance' : kind;
    setComparisonKind(effectiveKind); updateUrl(selectedId, viewMode, next, effectiveKind, true);
  }
  function changeModelView(value:ModelView){if(value===modelView&&viewMode==='comparison')scene.current?.resetView();setModelView(value);const url=new URL(location.href);url.searchParams.set("angle",value);history.replaceState({},"",url);}
  function clearComparison() { setComparisonIds([]);setComparisonKind('appearance');updateUrl(selectedId,viewMode,[],'appearance',true);setToast(t('已清空比较')); }
  function explore(id: string, routeId?: string) {
    if(!routeId) { setJourneyPlaying(false); setJourneyComplete(false); }
    if (!towers.some((tower) => tower.id === id)) { setToast(t("这个地点的档案仍在，地图展示正在更新。")); return; }
    setGame(null); setClusterIds([]); setJourneyId(routeId ?? null); setJourneysOpen(false); setSelectedId(id); setSearchOpen(false); setQuery(''); setDetailsOpen(true);
    if (currentMode.current !== 'globe') readyMode.current = null;
    currentMode.current = 'globe'; pendingFocus.current = id; setViewMode('globe');
    const url = new URL(location.href); for (const key of ['quiz','seed','vs']) url.searchParams.delete(key); if (routeId) url.searchParams.set('route', routeId); else url.searchParams.delete('route'); history.replaceState({},'',url);
    updateUrl(id, 'globe', comparisonIds, comparisonKind); flushFocus();
  }
  function startJourney(id:string) { const route=routes.find(item=>item.id===id); if(!route)return; setJourneyComplete(false); setDwell(0); setJourneyPlaying(true); explore(route.stops[0],route.id); }
  function changeTowerFilters(nextFilters:TowerFilters) {
    const url=new URL(location.href);writeTowerFilters(url.searchParams,nextFilters);
    const visible=data?.towers.filter(tower=>mapTowerMatchesFilters(tower,nextFilters))??[];
    const next=readCatalogLocation(visible,url.search);
    if(next.selectedId)url.searchParams.set('tower',next.selectedId);else url.searchParams.delete('tower');
    url.searchParams.set('compare',next.comparisonIds.join(','));
    if(viewMode==='comparison')url.searchParams.set('kind',next.comparisonKind);
    url.searchParams.delete('route');history.pushState({},'',url);
    setTowerFilters(nextFilters);setSelectedId(next.selectedId);setComparisonIds(next.comparisonIds);setComparisonKind(next.comparisonKind);
    setJourneyPlaying(false);setJourneyId(null);setJourneyComplete(false);setClusterIds([]);setPhotoOpen(false);setPhotoIndex(0);
    if(selectedId!==next.selectedId&&next.selectedId){pendingFocus.current=next.selectedId;flushFocus();}
  }
  function askCommunity(mode:CommunityMode) {setJourneyPlaying(false);setModelGalleryOpen(false);setCommunityMode(mode);setCommunityOpen(true);}
  function changeRenderStyle(style:TowerRenderStyle) {
    if (style === 'illuminated' && renderStyle !== 'illuminated') daytimeRenderStyle.current = renderStyle;
    else if (style !== 'illuminated') daytimeRenderStyle.current = style;
    setRenderStyle(style);
    const url = new URL(location.href); url.searchParams.set('towerStyle', style);
    if (style === 'illuminated') { setSkyPreset('night'); url.searchParams.set('sky','night'); }
    url.searchParams.delete('connections'); history.replaceState({},'',url);
  }
  function changeEnvironment(preset: SkyPreset) {
    const url = new URL(location.href); setSkyPreset(preset); url.searchParams.set('sky', preset);
    if (preset === 'night') {
      if (renderStyle !== 'illuminated') daytimeRenderStyle.current = renderStyle;
      setRenderStyle('illuminated'); url.searchParams.set('towerStyle','illuminated');
    } else if (renderStyle === 'illuminated') {
      setRenderStyle(daytimeRenderStyle.current); url.searchParams.set('towerStyle',daytimeRenderStyle.current);
    }
    url.searchParams.delete('connections'); history.replaceState({},'',url);
  }
  function changeLabels(value:boolean) {setShowLabels(value);const url=new URL(location.href);if(value)url.searchParams.delete('labels');else url.searchParams.set('labels','0');history.replaceState({},'',url);}
  function randomStop() { const candidates=towers.filter((tower)=>tower.id!==selectedId && (tower.photos.length || tower.modelKey)); if(candidates.length) explore(candidates[Math.floor(Math.random()*candidates.length)].id); }
  function startGame() {
    if (!data?.quizSetId) return;
    const seed = [...crypto.getRandomValues(new Uint32Array(2))].map((n)=>n.toString(36)).join('-');
    const request={setId:data.quizSetId,seed}; setGame(request); setPhotoOpen(false);  setClusterIds([]); setJourneysOpen(false); setSearchOpen(false);
    const url=new URL(location.href); url.searchParams.set('quiz',request.setId);url.searchParams.set('seed',seed);url.searchParams.delete('vs');history.pushState({},'',url);
  }
  function closeGame() { setGame(null); const url=new URL(location.href);for(const key of ['quiz','seed','vs'])url.searchParams.delete(key);history.replaceState({},'',url); }
  function changeEarthStyle(style: EarthStyle) {
    setEarthStyle(style);
    const url = new URL(location.href);
    if (style === 'day') url.searchParams.delete('style'); else url.searchParams.set('style', style);
    url.searchParams.delete('connections'); history.replaceState({}, '', url);
  }
  function changeExhibitScale(value: number) { const scale=Math.max(.1,Math.min(1.6,value));setExhibitScale(scale);const url=new URL(location.href);if(scale===1)url.searchParams.delete('scale');else url.searchParams.set('scale',scale.toFixed(2));history.replaceState({},'',url); }
  function openCluster(ids: string[]) { setModelPicker(false); setClusterIds(ids); }
  function openModels() { setJourneyPlaying(false); if(data?.modelCases?.length)setModelGalleryOpen(true);else {setModelPicker(true);setClusterIds(towers.filter(tower=>tower.modelKey).map(tower=>tower.id));} }
  const changeDetailsExpansion = useCallback((expanded: boolean) => {
    setJourneyPlaying(false);
    detailPanel.current?.scrollTo({ top: 0, behavior: 'instant' });
    const update = () => flushSync(() => setDetailsExpanded(expanded));
    if (!reducedMotion && document.startViewTransition) {
      document.documentElement.classList.add('detail-transition');
      const transition = document.startViewTransition(update);
      void transition.finished.catch(() => {}).finally(() => document.documentElement.classList.remove('detail-transition'));
    } else update();
  }, [reducedMotion]);
  useEffect(() => {
    if (!detailsExpanded || !detailsOpen || overlayOpen) return;
    const closeOutside = (event: MouseEvent) => {
      if (!detailPanel.current?.contains(event.target as Node)) changeDetailsExpansion(false);
    };
    document.addEventListener('click', closeOutside, true);
    return () => document.removeEventListener('click', closeOutside, true);
  }, [detailsExpanded, detailsOpen, overlayOpen, changeDetailsExpansion]);
  useEffect(() => {
    if (!data?.quizSetId || new URLSearchParams(location.search).get('challenge') !== '1') return;
    const url = new URL(location.href); url.searchParams.delete('challenge'); history.replaceState({}, '', url);
    startGame();
  }, [data?.quizSetId]);

  const searchResults = towers.filter((tower) => `${tower.name} ${tower.label} ${tower.city} ${tower.countryName}`.toLowerCase().includes(query.toLowerCase()));
  const photo = selected?.photos[photoIndex];
  const mapUrl = selected?.maps[selected.maps.preferred] ?? selected?.maps.google;

  return <div className="app-shell">
    <div className="app-content" inert={overlayOpen}>
    <SiteHeader active={viewMode} onExplore={() => changeView('globe')} onCompare={() => changeView('comparison')} onChallenge={startGame} challengeDisabled={!data} comparisonCount={comparing.length}>
      <div className="search-wrap" onClick={(event) => { if (!(event.target as Element).closest('button, .search-results')) searchInput.current?.focus(); }}><Search size={17} /><input ref={searchInput} aria-label={t("搜索城市或铁塔")} placeholder={t("搜索城市或铁塔")} value={query} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} />{query && <button aria-label={t("清空搜索")} onClick={() => setQuery('')}><X size={15} /></button>}
        {searchOpen && data && <div className="search-results"><div className="search-heading">{query ? t("{0} 个地点", searchResults.length) : t("地球上的地点")}</div>{searchResults.length ? searchResults.map((tower) => <button key={tower.id} onClick={() => explore(tower.id)}><MapPin size={15} /><span><strong>{tower.label}</strong><small>{tower.countryName} · {tower.modelKey ? t("可近看模型") : t("查看地点与资料")}</small></span><ArrowUpRight size={15} /></button>) : <p>{t("没有匹配当前搜索与筛选的地点。")}<a href="/catalog.html">{t("查看完整目录")}</a></p>}</div>}
      </div>
    </SiteHeader>

    <main className={`workspace${detailsOpen && selected ? '' : ' detail-collapsed'}${detailsExpanded ? ' detail-expanded' : ''}`}>
      <section className={`world-panel ${journeyPlaying ? 'journey-active' : ''} ${viewMode === 'comparison' ? 'is-comparison' : ''}`} aria-label={viewMode === 'globe' ? t("三维铁塔地球") : t("三维铁塔比较")}>
        <button className="detail-visibility" title={detailsOpen?t("全屏浏览"):t("退出全屏浏览")} aria-label={detailsOpen?t("全屏浏览"):t("退出全屏浏览")} aria-expanded={detailsOpen} aria-controls="tower-detail-panel" onClick={() => setDetailsOpen((open) => !open)}>{detailsOpen ? <Maximize2 size={17} /> : <Minimize2 size={17} />}</button>
        {data && <SceneBoundary><Suspense fallback={<div className="scene-loading"><span className="loading-orbit" />{t("正在点亮地标世界")}</div>}><WorldScene comparisonView={modelView} skyPreset={viewMode==='globe'&&towerPlay.state.effects.includes('party')?'night':skyPreset} uiTheme={theme} ref={scene} onRemoveComparison={id=>{const tower=towers.find(item=>item.id===id);if(tower&&comparisonIds.includes(id))toggleCompare(tower);}} towers={sceneTowers} selectedId={selected?.id ?? selectedId} comparisonIds={comparisonIds} viewMode={viewMode} comparisonKind={comparisonKind} reducedMotion={reducedMotion} earthStyle={earthStyle} renderStyle={renderStyle} showLabels={showLabels} animationSuspended={overlayOpen || detailsExpanded} onFocusProgress={onFocusProgress} onUserInteract={onUserInteract} exhibitScale={exhibitScale} onClusterSelect={openCluster} onSelect={select} onReady={onSceneReady} playOrigins={playOrigins} towerPlay={towerPlay.state} towerPlayAction={towerPlay.action} onTowerPlay={effect=>{setJourneyPlaying(false);towerPlay.activate(effect);}} /></Suspense></SceneBoundary>}
        {viewMode==='globe' && <TowerPlayStatus state={towerPlay.state}/>}
        {!ready && !error && <div className="loading-caption" aria-live="polite">{t("正在载入地球与建筑")}</div>}
        {error && <div className="scene-fallback"><h2>{error}</h2><a href="/catalog.html">{t("打开资料目录")}</a></div>}
        {viewMode === 'comparison' && <ComparisonControls kind={comparisonKind} metricAvailable={metricComparisonAvailable} strict={strict} view={modelView} count={comparing.length} onKind={changeKind} onView={changeModelView} onBack={()=>changeView('globe')} onClear={clearComparison}/>} 
        {viewMode === 'globe' && <ExploreControls filters={towerFilters} onFilters={changeTowerFilters} visibleCount={towers.length} skyPreset={skyPreset} onSkyPreset={changeEnvironment} style={earthStyle} renderStyle={renderStyle} scale={exhibitScale} showLabels={showLabels} onLabels={changeLabels} onStyle={changeEarthStyle} onRenderStyle={changeRenderStyle} onScale={changeExhibitScale} onRandom={randomStop} onJourneys={() => setJourneysOpen(true)} onZoom={factor=>{setJourneyPlaying(false);scene.current?.zoomBy(factor);}} onReset={()=>{setJourneyPlaying(false);pendingIntroPlay.current=null;towerPlay.remove();scene.current?.resetView();}} onRotate={angle=>{setJourneyPlaying(false);scene.current?.rotateBy(angle);}} />}
        {data && !towers.length && <div className="filter-empty" role="status"><p>{t('当前筛选没有匹配地点')}</p><button onClick={()=>changeTowerFilters({...DEFAULT_TOWER_FILTERS})}>{t('清除筛选')}</button></div>}
        {journey && viewMode==='globe' && <JourneyProgress title={journey.title} stops={journey.stops.map(id=>({id,name:towers.find(tower=>tower.id===id)?.name??id}))} index={journeyIndex} progress={journeyComplete?1:(Math.max(0,journeyIndex)+Math.min(1,dwell/8000))/journey.stops.length} playing={journeyPlaying} complete={journeyComplete} onStop={()=>{setJourneyId(null);setJourneyPlaying(false);const url=new URL(location.href);url.searchParams.delete("route");history.replaceState({},"",url);}} onToggle={()=>{if(journeyComplete)startJourney(journey.id);else {setJourneyPlaying(value=>!value);if(focusProgress.phase!=="arrived")scene.current?.focusTower(selectedId);}}} onVisit={id=>{setDwell(0);setJourneyComplete(false);explore(id,journey.id);}}/>}
      </section>

      {selected && detailsOpen && <aside ref={detailPanel} id="tower-detail-panel" className={`detail-panel${detailsExpanded ? ' is-expanded' : ''}`} aria-label={t("所选铁塔资料")}>
        <div className="detail-overview"><PhotoCarousel showCredit={detailsExpanded} modelView={modelView} onModelView={changeModelView} tower={selected} index={photoIndex} onChange={setPhotoIndex} onOpen={() => setPhotoOpen(true)} reducedMotion={reducedMotion} suspended={detailsExpanded || photoOpen || !!game || clusterIds.length > 0 || journeysOpen} portraits={portraitPreview}/>
        <div className="detail-content">
          {!detailsExpanded&&selected.approximateLocation&&<button className="approximate-location-badge" onClick={()=>askCommunity({type:"feedback",towerId:selected.id,name:selected.name,initialField:"location"})}><MapPin size={12}/>{t("大致位置")} · {selected.mapPlacement?.precisionLabel[lang==="zh-CN"?"zh":lang]}<span>{t("纠正位置")}</span></button>}
          <h1><button type="button" className="tower-title-focus" title={t('近看建筑')} onClick={()=>{if(detailsExpanded)changeDetailsExpansion(false);explore(selected.id);}}>{selected.label}</button></h1>{new Set(towers.map((tower)=>tower.familyId)).size > 1 && <p className="family-label">{data?.families.find((family)=>family.id===selected.familyId)?.nameZh}</p>}<div className="detail-location-row"><p className="location-line"><MapPin size={14} /><span>{selected.label} · {selected.countryName}</span></p><div className="detail-header-actions"><ShareTower key={selected.id} title={selected.name}/><button className="subtle-icon detail-expand" title={t(detailsExpanded ? '收起详细资料' : '展开详细资料')} aria-label={t(detailsExpanded ? '收起详细资料' : '展开详细资料')} aria-expanded={detailsExpanded} aria-controls="tower-research-details" onClick={()=>changeDetailsExpansion(!detailsExpanded)}>{detailsExpanded ? <PanelLeftOpen size={16}/> : <PanelLeftClose size={16}/>}</button></div></div>
          {!detailsExpanded && selected.status?.value === 'unknown' && <p className="status-disclosure">{t('现状待核，照片与模型保留历史来源。')}</p>}
          <div className="tower-contribution"><div><button onClick={()=>askCommunity({type:'feedback',towerId:selected.id,name:selected.name,initialField:selected.heightM===null?'height':selected.status?.value==='unknown'?'status':'other'})}><Flag size={13}/>{t('信息对吗？帮忙核对')}</button><button onClick={()=>askCommunity({type:'submission'})}><Plus size={13}/>{t('补充家乡的塔')}</button></div></div>
          {detailsExpanded ? <div ref={setResearchSummaryTarget} className="research-record-summary-slot"/> : <>
          <div className="facts-row"><div><strong>{heightLabel(selected)}</strong><span>{heightScope(selected)}</span></div><div><strong>{builtLabel(selected)}</strong><span>{builtLabel(selected) === '—' ? t("年代待补") : yearScope(selected)}</span></div></div>
          {selected.modelContext==='inferred-completion' && <p className="model-scale-disclosure">{t('含推测补全')}</p>}{selected.modelScope==="visible-section" && <p className="model-scale-disclosure">{t("只呈现实景可见的塔段，未补造被遮挡的塔体。")}</p>}{selected.modelKey && selected.heightM === null && <p className="model-scale-disclosure">{t("这个模型采用独立展示尺寸；实际高度待核，不进入高度比较。")}</p>}
          <p className="tower-story">{selected.editorial?.summary ?? t("这座地标位于{0}。它的地方故事与更多实景正在补充，先从地图和已有照片认识这里。", selected.label)}</p>
          {!!selected.editorial?.currentUses.length && <div className="use-tags" aria-label={t("主要用途")}>{selected.editorial.currentUses.map((use)=><span key={use}>{use}</span>)}</div>}
          {selected.editorial?.visitorNotice && (!selected.editorial.visitorNotice.endDate || new Date(selected.editorial.visitorNotice.endDate+'T23:59:59').getTime() >= Date.now()) && <a className="visitor-notice" href={selected.editorial.visitorNotice.sourceUrl} target="_blank" rel="noreferrer"><Info size={13} />{selected.editorial.visitorNotice.text}</a>}
          {selected.statedScale?.replicaToOriginal && <div className="scale-note"><Layers3 size={13} /><span>{t("约")}{selected.statedScale.replicaToOriginal}{t("复刻比例")}</span></div>}
          </>}
          <RecordActions className="detail-actions"><button className="secondary-button compare-membership" title={comparisonIds.includes(selected.id) ? t('从比较中移除') : t('加入比较')} aria-label={comparisonIds.includes(selected.id) ? t('从比较中移除') : t('加入比较')} aria-pressed={comparisonIds.includes(selected.id)} disabled={!selected.modelKey} onClick={() => toggleCompare(selected)}>{comparisonIds.includes(selected.id) ? <Check size={17}/> : <Plus size={17}/>} {t('比较')}</button>
            <a className="secondary-button" href={mapUrl ?? undefined} target="_blank" rel="noreferrer" title={t('在{0}地图中查看', selected.maps.preferred === 'amap' ? t('高德') : 'Google')} aria-label={t('在{0}地图中查看', selected.maps.preferred === 'amap' ? t('高德') : 'Google')}><MapPin size={17}/>{selected.maps.preferred==='amap'?t('高德地图'):t('Google地图')}</a>
          </RecordActions>
          {playTrigger && <button className="tower-play-discover" onClick={()=>changeDetailsExpansion(true)}><span><strong>{playCopy[playTrigger.effect].hint}</strong><small>{playCopy.learn}</small></span><span aria-hidden="true">↗</span></button>}
        </div></div>
        {detailsExpanded && data && <section id="tower-research-details" className="tower-research-details" aria-label={t('详细资料')}><Suspense fallback={<p role="status">{t('正在整理地标资料…')}</p>}>
          {playTrigger && <TowerPlayIntro tower={toSceneTower(selected)} state={towerPlay.state} onActivate={effect=>{changeDetailsExpansion(false);if(viewMode==='globe'&&focusProgress.phase==='arrived'&&focusProgress.id===selected.id)towerPlay.activate(effect);else{pendingIntroPlay.current=effect;explore(selected.id);}}} onVisit={()=>{changeDetailsExpansion(false);explore(selected.id);}}/>}
          <TowerResearchDetails towerId={selected.id} summaryTarget={researchSummaryTarget}/></Suspense></section>}
      </aside>}
    </main>
    <footer className="app-footer"><span>{t('地图 {0} 处',towers.length)}<i/><button className="model-catalog-button" title={t("包含位置待核的独立模型")} onClick={openModels}>{t('模型 {0} 座',modelCases.length)}<ArrowUpRight size={10}/></button><i/><span className="passport-count">{t('已发现 {0} 座',towers.filter(tower=>discovered.includes(tower.id)).length)}</span></span><span><a href="/agents.html">Agents</a><i/><a href="/catalog.html">{t('研究目录')}<ArrowUpRight size={12}/></a></span></footer>
    </div>
    {game && <PhotoQuiz setId={game.setId} seed={game.seed} opponentScore={game.opponentScore} onClose={closeGame} onExplore={explore} onNewGame={startGame} onToast={setToast} />}
    {clusterIds.length > 0 && <div className="modal-backdrop portrait-backdrop cluster-backdrop" onClick={() => setClusterIds([])}><ClusterPicker towers={clusterIds.map((id)=>towers.find((tower)=>tower.id===id)).filter((tower):tower is Tower=>!!tower)} isModels={modelPicker} dialogRef={clusterDialog} onSelect={explore} onClose={()=>setClusterIds([])}/></div>}
    {journeysOpen && <div className="modal-backdrop portrait-backdrop" onClick={() => setJourneysOpen(false)}><JourneyPicker routes={routes} towers={towers} dialogRef={journeyDialog} onStart={startJourney} onClose={() => setJourneysOpen(false)}/></div>}
    {modelGalleryOpen && data?.modelCases && <Suspense fallback={null}><ModelGallery cases={modelCases} mappedCount={towers.length} filters={towerFilters} onFilters={changeTowerFilters} onHelp={entry=>askCommunity({type:'feedback',towerId:entry.id,name:entry.name,initialField:!entry.hasMap?'location':entry.heightM===null?'height':'status'})} onExplore={explore} onPreview={setPreviewModel} onClose={()=>setModelGalleryOpen(false)}/></Suspense>}
    {previewModel && <Suspense fallback={null}><ModelViewer initialStyle={renderStyle} towerId={previewModel.id} modelKey={previewModel.modelKey} name={data?.modelCases?.find(entry=>entry.id===previewModel.id)?.name??previewModel.name} partial={previewModel.modelScope==='visible-section'} modelCollection={previewModel.modelCollection} modelContext={previewModel.modelContext} onClose={()=>setPreviewModel(null)}/></Suspense>}
    {communityOpen && <CommunityForm mode={communityMode} onClose={()=>setCommunityOpen(false)}/>}
    {toast && <div className="toast" role="status">{toast}</div>}
    {photoOpen && photo && selected && <div className="modal-backdrop photo-backdrop" onClick={() => setPhotoOpen(false)}><section ref={photoDialog} tabIndex={-1} className="full-photo" role="dialog" aria-modal="true" aria-label={t("完整实景照片")} onClick={(event) => event.stopPropagation()}><button className="photo-close" aria-label={t("关闭完整照片")} onClick={() => setPhotoOpen(false)}><X size={22} /></button><img src={photo.url} alt={t("{0}完整实景", selected.label)} /><footer><strong>{selected.label}</strong><span>{photo.capturedAt ?? t("拍摄日期待核")} · {photo.author}</span><a href={photo.pageUrl} target="_blank" rel="noreferrer">{t("原图来源")}<ExternalLink size={12} /></a></footer></section></div>}
  </div>;
}
