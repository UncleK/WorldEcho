import { useEffect, useId, useRef, useState } from 'react';
import { EvidenceSources } from '../catalog/RecordEvidence';
import { CLASS_LABELS, STATUS_LABELS } from '../catalog/research';
import type { ResearchRow, ResearchSource } from '../catalog/research';
import { metricCopy } from '../domain/measurements.mjs';
import { getLanguage, t } from '../i18n';
import './research-record.css';
import DisplayHeightEvidence from './DisplayHeightEvidence';
import ModelEvidence from './ModelEvidence';

export function ResearchRecordLocation({ row, sources }: { row: ResearchRow; sources: Map<string, ResearchSource> }) {
  return <section className="research-record-location" aria-label={t('位置与现状')}>
    <h3>{t('位置与现状')}</h3>
    <p>{[row.countryName, row.city || t('城市待核'), row.venue].filter(Boolean).join(' · ')}</p>
    <p>{row.mapReady ? t('地图为已匹配塔体的展示锚点，可能来自轮廓推导。') : row.approximateLocation || row.globeAvailable ? t('已按大致位置加入地球，具体塔址可继续核对。') : t('塔体位置待核，暂未进入地球地图。')}</p>
    <EvidenceSources ids={row.coordinateSourceIds} sources={sources} />
    <p>{t(STATUS_LABELS[row.status] || row.status)}{row.status === 'unknown' && ` · ${t('现状待核，照片与模型保留历史来源。')}`}</p>
    <EvidenceSources ids={row.statusSourceIds} sources={sources} />
  </section>;
}

export default function ResearchRecordOverview({ row, sources, showLocation=true, showModel=true, showAliasNotice=true, compact=false }: { row: ResearchRow; sources: Map<string, ResearchSource>; showLocation?:boolean;showModel?:boolean;showAliasNotice?:boolean;compact?:boolean }) {
  const storyRef=useRef<HTMLParagraphElement>(null),storyId=useId();
  const [expanded,setExpanded]=useState(false),[hasMore,setHasMore]=useState(false);
  useEffect(()=>{setExpanded(false);},[row.id]);
  useEffect(()=>{
    const story=storyRef.current;if(!story||!compact||expanded)return;
    const measure=()=>setHasMore(story.scrollHeight>story.clientHeight+1);
    const observer=new ResizeObserver(measure);observer.observe(story);measure();
    return()=>observer.disconnect();
  },[compact,expanded,row.id,row.summary]);
  return <div className="research-record-summary" data-research-record={row.id}>
    {showAliasNotice&&row.aliasOf && <p className="cat-alias-notice">{t('这是一条已合并的别名记录。')} <a href={`/catalog.html?entry=${encodeURIComponent(row.aliasOf)}`}>{t('打开合并后的档案')}</a></p>}
    <div className="research-record-badges">
      <span>{t(CLASS_LABELS[row.classification] || row.classification)}</span>
      <span>{t(STATUS_LABELS[row.status] || row.status)}</span>
      <span>{row.coverage}{t('/5 基础字段')}</span>
    </div>
    <p ref={storyRef} id={storyId} className={`research-record-story${compact&&!expanded?' is-collapsed':''}`}>{row.summary ? metricCopy(row.summary, getLanguage()) : t('目前保留为可追溯的调查记录；建造缘由、使用情况或现状仍需继续补证。')}</p>
    {compact&&hasMore&&<button className="record-story-toggle" type="button" aria-expanded={expanded} aria-controls={storyId} onClick={()=>setExpanded(value=>!value)}>{t(expanded?'收起概述':'展开完整概述')}</button>}
    {row.summary && <EvidenceSources ids={row.summarySourceIds} sources={sources} />}
    {!compact&&<DisplayHeightEvidence id={row.aliasOf??row.id} heightM={row.heightM}/>}
    {row.uses.length > 0 && <p className="research-record-uses">{t('来源记录用途：')}{row.uses.join(' · ')}</p>}
    {showLocation&&<ResearchRecordLocation row={row} sources={sources}/>}
    {showModel&&<ModelEvidence row={row}/>}
  </div>;
}
