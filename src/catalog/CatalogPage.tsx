import SiteHeader from "../features/SiteHeader";
import RecordEvidence, { HeightText } from "./RecordEvidence";
import ResearchRecordOverview from '../features/ResearchRecordOverview';
import RecordActions from '../features/RecordActions';
import ResearchPhotoCredit from '../features/ResearchPhotoCredit';
import { localizeResearchRow } from '../features/research-record';
import { usePublicData } from '../domain/usePublicData';
import CommunityForm from '../features/CommunityForm';
import type { CommunityMode } from '../features/CommunityForm';
import TowerFilterFields from '../features/TowerFilterFields';
import { activeTowerFilters } from '../domain/tower-filters';
import { t, useLanguage, getLanguage } from '../i18n';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownUp, ArrowUpRight, Boxes, ChevronLeft, ChevronRight, ExternalLink, Globe2, Image, Info,
  Flag, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { calculateStats, CLASS_LABELS, DEFAULT_QUERY, filterRows, formatMeters, MATERIAL_LABELS,
  paginateRows, querySearch, readQuery, REGION_LABELS, STATUS_LABELS } from './research';
import type { CatalogQuery, CatalogSort, ResearchDataset, ResearchRow, ResearchSource } from './research';

const ModelViewer = lazy(()=>import('../features/ModelViewer'));
const FIELD_LABELS: Record<string, string> = { height: '采用高度', built: '建造年', material: '材料来源', location: '塔体位置', photo: '可用实景' };
const count = (value: number) => value.toLocaleString(getLanguage());
const rowTitle = (row: ResearchRow) => row.label || row.name;
function helpField(row:ResearchRow):'height'|'location'|'status'|'photo'|'other' {return !row.mapReady?'location':row.heightM===null?'height':row.status==='unknown'?'status':row.photoCount===0?'photo':'other';}
const HELP_LABELS:Record<string,string>={location:'位置',height:'高度',status:'现状',photo:'照片',other:'资料'};
function DetailDialog({ row, sources, onClose, onModel }: { row: ResearchRow; sources: Map<string, ResearchSource>; onClose: () => void; onModel: (row: ResearchRow) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  useEffect(() => { const element = dialog.current; if (!element) return; element.showModal(); const previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { element.close(); document.body.style.overflow = previousOverflow; if (opener.current?.isConnected) opener.current.focus({ preventScroll: true }); }; }, []);
  const [feedbackOpen,setFeedbackOpen]=useState(false);
  const photo = row.photos.find(item => item.url);
  const preferredMap = row.maps.preferred === 'amap' ? row.maps.amap : row.maps.google;
  return <dialog className="cat-dialog" ref={dialog} aria-labelledby="catalog-detail-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="cat-dialog-head"><div><span className="cat-kicker">{t("FIELD NOTES · 地标资料")}</span><h2 id="catalog-detail-title">{row.name}</h2><p>{row.countryName} · {row.city || t("城市待核")}{row.venue ? ` · ${row.venue}` : ''}</p></div><button className="cat-icon-button" aria-label={t("关闭资料详情")} onClick={onClose}><X size={20} /></button></div>
    <div className="cat-dialog-content">
      <div className="cat-detail-summary">
        {photo ? <figure><img src={photo.url!} alt={t("{0}实景，{1}", row.name, photo.capturedAt || t("日期未记录"))} /><figcaption><ResearchPhotoCredit photo={photo}/><br />{t("网页副本可能经缩放与格式转换；照片不代表今天的现状。")}</figcaption></figure> : <div className="cat-no-photo"><Image size={28} /><p>{row.photoCount ? t("照片已入研究资料，网页副本尚未准备") : t("还没有可用的实景照片")}</p>{row.photos[0] && <a href={row.photos[0].pageUrl} target="_blank" rel="noopener noreferrer">{t("查看图片文件页")}<ExternalLink size={12} /></a>}</div>}
        <div><ResearchRecordOverview row={row} sources={sources}/><RecordActions className="cat-detail-actions">{row.modelKey && <button onClick={()=>onModel(row)}><Boxes size={15}/>{t("查看模型")}</button>}{row.globeAvailable && <a href={`/?tower=${encodeURIComponent(row.aliasOf??row.id)}${row.modelKey?'':'&unmodeled=1'}`}><Globe2 size={15}/>{t("在地球上查看")}<ArrowUpRight size={14}/></a>}{preferredMap && <a href={preferredMap} target="_blank" rel="noopener noreferrer"><MapPin size={14}/>{row.maps.preferred === 'amap' ? t("高德地图") : t("Google地图")}<ExternalLink size={12}/></a>}</RecordActions></div>
      </div>
      <RecordEvidence row={row} sources={sources}/>
      <button className="feedback-button" onClick={()=>setFeedbackOpen(true)}><Flag size={14}/>{t('信息对吗？帮忙核对')}</button>
    </div>
    {feedbackOpen&&<CommunityForm mode={{type:'feedback',towerId:row.id,name:row.name,initialField:helpField(row)}} onClose={()=>setFeedbackOpen(false)}/>} 
  </dialog>;
}

export default function CatalogPage() {
  const {data:rawData,error,retry}=usePublicData<ResearchDataset>('/research.v1.json');
  const lang=useLanguage(); const [submissionOpen,setSubmissionOpen]=useState(false); const [feedbackMode,setFeedbackMode]=useState<CommunityMode|null>(null); const [viewModel,setViewModel]=useState<ResearchRow|null>(null);
  useEffect(()=>{document.title=lang==='fr'?'Atlas des monuments · World Echo':lang==='en'?'Landmark archive · World Echo':'地标资料集 · World Echo';},[lang]);
  const data=useMemo(()=>rawData ? {...rawData,entries:rawData.entries.map(row=>localizeResearchRow(row,lang))} : null,[rawData,lang]);
  const [query, setQuery] = useState<CatalogQuery>(() => readQuery(location.search));
  const queryRef = useRef(query);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => { const restore = () => { const next = readQuery(location.search); queryRef.current = next; setQuery(next); }; addEventListener('popstate', restore); return () => removeEventListener('popstate', restore); }, []);
  const update = useCallback((patch: Partial<CatalogQuery>, replace = false) => {
    const next = { ...queryRef.current, ...patch }; queryRef.current = next; setQuery(next);
    const params=new URLSearchParams(querySearch(next));params.set('lang',getLanguage());const url = `/catalog.html?${params}`;
    if (url !== location.pathname + location.search) history[replace ? 'replaceState' : 'pushState']({}, '', url);
  }, []);
  const filter = (patch: Partial<CatalogQuery>, replace = false) => update({ ...patch, page: 1 }, replace);
  const filtered = useMemo(() => data ? filterRows(data.entries, query) : [], [data, query]);
  const page = useMemo(() => paginateRows(filtered, query.page, query.pageSize), [filtered, query.page, query.pageSize]);
  useEffect(() => { if (data && query.page !== page.page) update({ page: page.page }, true); }, [data, page.page, query.page, update]);
  const stats = useMemo(() => data ? calculateStats(data.entries) : null, [data]);
  const heightPreview = useMemo(() => stats ? [...new Map([...stats.heights.slice(0, 4), ...(stats.smallestReplica ? [stats.smallestReplica] : [])].map(row => [row.id, row])).values()] : [], [stats]);
  const sourceMap = useMemo(() => new Map(data?.sources.map(source => [source.id, source]) ?? []), [data]);
  const countryOptions = useMemo(() => data ? [...new Map(data.entries.filter(row => !query.region || row.region === query.region).map(row => [row.countryCode, row.countryName])).entries()].sort((a, b) => a[1].localeCompare(b[1], lang)) : [], [data, query.region]);
  const selected = data?.entries.find(row => row.id === query.entry) ?? null;
  const active = Object.entries(query).filter(([key, value]) => ['region', 'country', 'classification', 'completeness', 'material', 'model', 'status', 'missing'].includes(key) && value).length + activeTowerFilters(query);
  const reset = () => update({ ...DEFAULT_QUERY, pageSize: query.pageSize });
  const chartFilter = (patch: Partial<CatalogQuery>) => { filter(patch); document.querySelector('.cat-results')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); };
  const sortHeight = () => filter({ sort: query.sort === 'height-desc' ? 'height-asc' : 'height-desc' });

  return <div className="catalog-app">
    <SiteHeader active="catalog"/>
    <main className="cat-main">
      <section className="cat-intro"><div><span className="cat-kicker">{t("LANDMARK ARCHIVE · 地标资料集")}</span><h1>{t("同一地标，许多回响。")}</h1><p>{t("从原塔到各地版本，把位置、材料、故事和真实照片放进一张可查的目录。")}</p>{data && <a className="cat-browse-link" href="#catalog-results-title">{t("浏览")} {count(data.entries.length)} {t("条记录")}<ChevronRight size={12} /></a>}</div><div className="cat-dataset-note"><span className="cat-live-dot" />{t("持续收集的研究资料")}<br /><small>{data ? t("更新于 {0}", new Intl.DateTimeFormat(lang, { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit' }).format(new Date(data.generatedAt))) : t("正在读取本地资料")}</small></div></section>
      <section className="community-cta"><div><h2>{t('你的家乡也有一座埃菲尔铁塔吗？')}</h2><p>{t('补充新塔，也帮已有记录核对位置、现状和高度。')}</p></div><div className="community-cta-actions"><button onClick={()=>setSubmissionOpen(true)}><MapPin size={15}/>{t('补充家乡的塔')}</button><button onClick={()=>{setFiltersOpen(true);chartFilter({missing:'location'});}}><Flag size={15}/>{t('帮忙补齐资料')}</button></div></section>
      {!data ? <div className="cat-loading" role="status">{error ? <><h2>{t("资料暂未加载成功")}</h2><p>{t("仍可以查看保存的目录和来源链接。")}</p><a className="cat-primary-link" href="/catalog-static.html">{t("打开静态资料目录")}<ArrowUpRight size={15} /></a><button className="cat-text-button" onClick={retry}>{t("重新加载")}</button></> : <><span className="cat-loader" /><p>{t("正在整理地标资料…")}</p><div className="cat-loading-rows" aria-hidden="true">{[0,1,2,3].map(row=><span key={row}><i/><i/><i/></span>)}</div></>}</div> : <>
      <section className="cat-metrics" aria-label={t("全集收集进度")}>
        {[{ number: stats!.research, label: t("研究收录"), sub: t("包含候选、历史与待核记录"), icon: <Boxes size={18} /> },
          { number: stats!.countries, label: t("国家 / 地区"), sub: t("按资料中的地点归属计数"), icon: <Globe2 size={18} /> },
          { number: stats!.mapped, label: t("已有塔体位置"), sub: t("原塔与复刻的展示锚点"), icon: <MapPin size={18} /> },
          { number: stats!.modeled, label: t("已有3D模型"), sub: t("建模与研究范围分别推进"), icon: <Boxes size={18} /> },
          { number: stats!.photographed, label: t("已有可用实景"), sub: t("主体与许可核对后的图片"), icon: <Image size={18} /> }].map(item => <div key={item.label} className="cat-metric"><div><span>{item.label}</span>{item.icon}</div><strong>{count(item.number)}</strong><small>{item.sub}</small></div>)}
      </section>
      <section className="cat-insights" aria-label={t("资料中的发现")}>
        <article className="cat-insight"><header><h2>{t("地标都在哪儿")}</h2><span>{stats!.countries}{t("个国家 / 地区")}</span></header><div className="cat-region-bars">{stats!.regions.filter(item => item.count).sort((a, b) => b.count - a.count).map(item => <button key={item.region} onClick={() => chartFilter({ region: query.region === item.region ? '' : item.region, country: '' })} aria-pressed={query.region === item.region}><span>{t(REGION_LABELS[item.region])}</span><i><b style={{ width: `${item.count / stats!.research * 100}%` }} /></i><strong>{item.count}</strong></button>)}</div><p className="cat-chart-note">{t("点击地区可筛选下方全集。收录数量展示调查覆盖，不表示现存数量。")}</p></article>
        <article className="cat-insight"><header><h2>{t("材料也会变")}</h2><span>{stats!.materials.length}{t("类 ·")}{stats!.materialKnown}{t("条有来源")}</span></header><div className="cat-material-chart">{stats!.materials.length ? stats!.materials.map(item => <button key={item.group} onClick={() => chartFilter({ material: query.material === item.group ? '' : item.group })} aria-pressed={query.material === item.group}><span>{t(MATERIAL_LABELS[item.group])}</span><i><b style={{ width: `${item.count / Math.max(...stats!.materials.map(row => row.count)) * 100}%` }} /></i><strong>{item.count}</strong></button>) : <p>{t("材料证据仍在整理")}</p>}</div><p className="cat-chart-note">{t("多标签计数可重复；再利用材料也可能是钢或铁。另有")}{stats!.research - stats!.materialKnown}{t("条材料待核。")}</p></article>
        <article className="cat-insight cat-height-insight"><header><h2>{t("高度范围")}</h2><span>{stats!.heightKnown}{t("条采用记录")}</span></header><div className="cat-height-extremes">{[{ row: stats!.highestReplica, label: t("最高复制 / 地方版本") }, { row: stats!.smallestReplica, label: t("最低复制 / 地方版本") }].map(item => <button key={item.label} disabled={!item.row} onClick={() => item.row && update({ entry: item.row.id })}><span>{item.label}</span><strong>{item.row ? `${item.row.heightApproximate ? '≈ ' : ''}${formatMeters(item.row.heightM, item.row.heightConverted)}` : '—'}<small> m</small></strong><small>{item.row ? rowTitle(item.row) : t("还没有可采用高度")}</small></button>)}</div>{stats!.original && <div className="cat-origin-baseline"><span>{t("原塔基准 ·")}{rowTitle(stats!.original)}</span><strong>{formatMeters(stats!.original.heightM)} m</strong></div>}<div className="cat-height-bars">{heightPreview.map(row => <button key={row.id} onClick={() => update({ entry: row.id })}><span>{rowTitle(row)}</span><i><b style={{ width: `${row.heightM! / (stats!.highestReplica?.heightM || 1) * 100}%` }} /></i><strong>{formatMeters(row.heightM, row.heightConverted)}<small> m</small></strong></button>)}</div><p className="cat-chart-note">{t("仅为已采用资料中的参考极值，口径可能不同；不是全球实测排名。")}{stats!.heightPending}{t("条另有高度线索待整理。")}</p></article>
      </section>
      <section className="cat-results" aria-labelledby="catalog-results-title">
        <div className="cat-results-heading"><div><h2 id="catalog-results-title">{t("全部研究记录")}<span>{count(filtered.length)}</span></h2><p>{t("主地球按位置与模型质量选择，资料集保留完整调查线索。")}</p></div><a href="/catalog-static.html" className="cat-static-link">{t("静态备份")}<ArrowUpRight size={12} /></a></div>
        <div className="cat-search-row"><label className="cat-search"><Search size={17} /><span className="cat-sr-only">{t("搜索国家、城市、地标或别名")}</span><input id="catalog-search" value={query.q} onChange={event => filter({ q: event.target.value }, true)} placeholder={t("搜索国家、城市、地标或别名")} type="search" autoComplete="off" />{query.q && <button aria-label={t("清除搜索")} onClick={() => filter({ q: '' }, true)}><X size={15} /></button>}</label><button className="cat-filter-toggle" onClick={() => setFiltersOpen(value => !value)} aria-expanded={filtersOpen}><SlidersHorizontal size={16} />{t("筛选")}{active > 0 && <span>{active}</span>}</button><label className="cat-sort"><span>{t("排序")}</span><select value={query.sort} onChange={event => filter({ sort: event.target.value as CatalogSort })}><option value="coverage">{t("基础字段较多优先")}</option><option value="name">{t("名称")}</option><option value="height-desc">{t("参考高度 · 从高到低")}</option><option value="height-asc">{t("参考高度 · 从低到高")}</option><option value="year-asc">{t("年份记录 · 从早到晚")}</option><option value="photos">{t("实景图片较多优先")}</option></select></label></div>
        <div className={`cat-filter-row ${filtersOpen ? 'is-open' : ''}`}>
          <label><span>{t("地区")}</span><select value={query.region} onChange={event => filter({ region: event.target.value, country: '' })}><option value="">{t("全部地区")}</option>{Object.entries(REGION_LABELS).map(([key, label]) => <option value={key} key={key}>{t(label)}</option>)}</select></label>
          <label><span>{t("国家 / 地区")}</span><select value={query.country} onChange={event => filter({ country: event.target.value })}><option value="">{t("全部国家 / 地区")}</option>{countryOptions.map(([code, name]) => <option value={code} key={code}>{name}</option>)}</select></label>
          <label><span>{t("记录类型")}</span><select value={query.classification} onChange={event => filter({ classification: event.target.value })}><option value="">{t("全部类型")}</option>{Object.entries(CLASS_LABELS).map(([key, label]) => <option value={key} key={key}>{t(label)}</option>)}</select></label>
          <label><span>{t("资料完整度")}</span><select value={query.completeness} onChange={event => filter({ completeness: event.target.value })}><option value="">{t("全部完整度")}</option><option value="rich">{t("4–5 项基础字段")}</option><option value="partial">{t("1–3 项基础字段")}</option><option value="lead">{t("仅来源线索")}</option></select></label>
          <label><span>{t("材料")}</span><select value={query.material} onChange={event => filter({ material: event.target.value })}><option value="">{t("全部材料")}</option>{Object.entries(MATERIAL_LABELS).map(([key, label]) => <option value={key} key={key}>{t(label)}</option>)}<option value="unknown">{t("材料待核")}</option></select></label>
          <label><span>{t("可探索内容")}</span><select value={query.model} onChange={event => filter({ model: event.target.value })}><option value="">{t("全部记录")}</option><option value="yes">{t("已有3D模型")}</option><option value="map">{t("已有塔体位置")}</option><option value="photo">{t("已有可用实景")}</option><option value="no">{t("尚未建模")}</option></select></label>
          <label><span>{t('记录现状')}</span><select value={query.status} onChange={event=>filter({status:event.target.value})}><option value="">{t('全部现状')}</option>{Object.entries(STATUS_LABELS).map(([key,label])=><option key={key} value={key}>{t(label)}</option>)}</select></label>
          <label><span>{t('待补字段')}</span><select value={query.missing} onChange={event=>filter({missing:event.target.value})}><option value="">{t('不限')}</option>{Object.entries(HELP_LABELS).filter(([key])=>key!=='other').map(([key,label])=><option key={key} value={key}>{t('待补：')}{t(label)}</option>)}</select></label>
          <details className="cat-contribution-filter"><summary>{t('场所、现状与高度筛选')}{activeTowerFilters(query)>0&&` · ${activeTowerFilters(query)}`}</summary><TowerFilterFields filters={query} onChange={next=>filter(next)}/></details>
          {(active > 0 || query.q) && <button className="cat-clear" onClick={reset}>{t("清除条件")}<X size={12} /></button>}
        </div>
        <div className="cat-table-note"><span><Info size={13} />{t("基础字段：采用高度、建造年、材料、位置、实景；完整度不等同于现状已确认。")}</span><span className="cat-mobile-scroll">{t("表格可左右滑动")}</span></div>
        {page.total === 0 ? <div className="cat-empty"><Search size={29} /><h3>{t("没有匹配的研究记录")}</h3><p>{t("可以减少筛选条件，或用国家、城市和别名继续查找。")}</p><button className="cat-primary-link" onClick={reset}>{t("显示完整资料集")}</button></div> : <div className="cat-table-wrap"><table><thead><tr><th scope="col">{t("地标名称")}</th><th scope="col">{t("国家 / 城市")}</th><th scope="col">{t("记录类型")}</th><th scope="col" aria-sort={query.sort === 'height-desc' ? 'descending' : query.sort === 'height-asc' ? 'ascending' : 'none'}><button onClick={sortHeight}>{t("参考高度")}<ArrowDownUp size={12} /></button></th><th scope="col">{t("年份记录")}</th><th scope="col">{t("材料")}</th><th scope="col">{t("位置 / 模型 / 实景")}</th><th scope="col">{t("出处")}</th></tr></thead><tbody>{page.entries.map(row => {
          const image = row.photos.find(photo => photo.thumbnail); const source = row.sourceIds.map(id => sourceMap.get(id)).find(item => item?.kind === 'primary') ?? sourceMap.get(row.sourceIds[0]);
          return <tr key={row.id}><td><div className="cat-name-cell">{image ? <img src={image.thumbnail!} alt="" loading="lazy" /> : <span className="cat-row-symbol"><MapPin size={17} /></span>}<div><button className="cat-row-name" onClick={() => update({ entry: row.id })} title={row.name}>{row.name}</button><div className="cat-coverage" title={row.coverageFields.map(field => t(FIELD_LABELS[field])).join(' · ') || t("还没有采用的基础字段")}><span>{Array.from({ length: 5 }, (_, index) => <i key={index} className={index < row.coverage ? 'filled' : ''} />)}</span><small>{row.coverage}{t("/5 基础字段")}</small></div><button className="cat-help-row" onClick={()=>setFeedbackMode({type:'feedback',towerId:row.id,name:row.name,initialField:helpField(row)})}><Flag size={10}/>{helpField(row)==='other'?t('核对资料'):t('补充：{0}',t(HELP_LABELS[helpField(row)]))}</button></div></div></td><td><strong className="cat-country">{row.countryName}</strong><small>{row.city || t("城市待核")}</small></td><td><span className={`cat-tag class-${row.classification}`}>{t(CLASS_LABELS[row.classification] || row.classification)}</span><small className={`cat-status status-${row.status}`}>{t(STATUS_LABELS[row.status] || row.status)}</small></td><td className="cat-height-cell"><HeightText row={row} /></td><td>{row.builtYear ? <><strong>{row.builtYear}</strong><small>{t("建造")}{row.openedYear && row.openedYear !== row.builtYear ? t(" · {0}开放", row.openedYear) : ''}</small></> : row.openedYear ? <><strong>{row.openedYear}</strong><small>{t("开放记录")}</small></> : <span className="cat-unknown">{t("待核")}</span>}</td><td><div className="cat-material-tags">{row.materialGroups.length ? row.materialGroups.map(group => <span key={group}>{t(MATERIAL_LABELS[group])}</span>) : <span className="cat-unknown">{t("材料待核")}</span>}</div></td><td><div className="cat-assets">{row.globeAvailable ? <a href={`/?tower=${encodeURIComponent(row.aliasOf??row.id)}${row.modelKey?'':'&unmodeled=1'}`} ><MapPin size={12} />{t("地球")}<ArrowUpRight size={10} /></a> : row.mapReady ? <span><MapPin size={12} />{t("已定位")}</span> : <span className="cat-asset-muted">{t("位置待核")}</span>}{row.modelKey && <button className="cat-model-tag" onClick={()=>setViewModel(row)} title={t("查看模型")} aria-label={t("查看模型")}><Boxes size={12} />{t("查看模型")}</button>}{row.photoCount > 0 && <button onClick={() => update({ entry: row.id })}><Image size={12} />{row.photoCount}{t("张")}</button>}</div></td><td>{source ? <a className="cat-row-source" href={source.url} target="_blank" rel="noopener noreferrer" aria-label={t("查看{0}资料来源", row.name)} title={source.title}><ExternalLink size={15} /></a> : <span className="cat-unknown">{t("待补")}</span>}</td></tr>;
        })}</tbody></table></div>}
        <div className="cat-pagination"><span role="status" aria-live="polite">{page.total ? t("{0}–{1} / {2} 条", (page.page - 1) * query.pageSize + 1, Math.min(page.page * query.pageSize, page.total), count(page.total)) : t("0 条匹配记录")}</span><div><label>{t("每页")}<select aria-label={t("每页行数")} value={query.pageSize} onChange={event => filter({ pageSize: Number(event.target.value) })}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><button aria-label={t("上一页")} disabled={page.page === 1} onClick={() => update({ page: page.page - 1 })}><ChevronLeft size={17} /></button><strong>{page.page}<span> / {page.pageCount}</span></strong><button aria-label={t("下一页")} disabled={page.page === page.pageCount} onClick={() => update({ page: page.page + 1 })}><ChevronRight size={17} /></button></div></div>
      </section>
      <footer className="cat-footer"><span>{t("World Echo · 世界回响")}</span><p>{t("高度区分已采用记录、来源线索与图片估算；排序与榜单仍只使用已采用记录。")}</p><a href="/">{t("回到地标星球")}<ArrowUpRight size={13} /></a></footer>
      </>}
    </main>
    {viewModel?.modelKey && <Suspense fallback={null}><ModelViewer towerId={viewModel.id} modelKey={viewModel.modelKey} name={data?.entries.find(entry=>entry.id===viewModel.id)?.name??viewModel.name} partial={viewModel.modelScope==='visible-section'} modelCollection={viewModel.modelCollection} modelContext={viewModel.modelContext} onClose={()=>setViewModel(null)}/></Suspense>}
    {feedbackMode && <CommunityForm mode={feedbackMode} onClose={()=>setFeedbackMode(null)}/>}
    {submissionOpen && <CommunityForm mode={{type:'submission'}} onClose={()=>setSubmissionOpen(false)}/>}
    {selected && <DetailDialog key={selected.id} row={selected} sources={sourceMap} onModel={setViewModel} onClose={() => update({ entry: '' })} />}
  </div>;
}
