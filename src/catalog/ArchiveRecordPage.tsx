import { useEffect, useMemo, useState } from 'react';
import { Flag, Search } from 'lucide-react';
import type { ResearchDataset, ResearchRow } from './research';
import { usePublicData } from '../domain/usePublicData';
import { t, useLanguage } from '../i18n';
import SiteHeader from '../features/SiteHeader';
import RecordArchive from '../features/RecordArchive';
import { localizeResearchRow } from '../features/research-record';
import CommunityForm from '../features/CommunityForm';


export default function ArchiveRecordPage({id}:{id:string}) {
  const language=useLanguage(),{data,error,retry}=usePublicData<ResearchDataset>('/research.v1.json');
  const sources=useMemo(()=>new Map(data?.sources.map(source=>[source.id,source])??[]),[data]);
  const record=data?.entries.find(entry=>entry.id===id);
  const row:ResearchRow|undefined=record?localizeResearchRow(record,language):undefined;
  const [feedbackOpen,setFeedbackOpen]=useState(false);
  useEffect(()=>{if(row)document.title=`${row.name} · World Echo`;},[row?.name,language]);
  return <div className="catalog-app"><SiteHeader active="catalog"><a className="site-catalog-search" aria-label={t('搜索城市或铁塔')} href="/catalog.html#catalog-search"><Search size={17}/><span>{t('搜索城市或铁塔')}</span></a></SiteHeader><main className="cat-main record-page">
    <a className="cat-text-button" href="/catalog.html">← {t('返回资料集')}</a>
    {!row?<div className="cat-loading" role="status"><p>{error??(data?t('未找到这条资料'):t('正在整理地标资料…'))}</p>{error&&<button onClick={retry}>{t('重新加载')}</button>}</div>:<>
      <header className="record-page-heading"><span className="cat-kicker">{t('FIELD NOTES · 地标资料')}</span><h1>{row.name}</h1><p>{[row.countryName,row.city,row.venue].filter(Boolean).join(' · ')}</p></header>
      <RecordArchive row={row} sources={sources}/>
      <button className="feedback-button" onClick={()=>setFeedbackOpen(true)}><Flag size={14}/>{t('信息对吗？帮忙核对')}</button>
      {feedbackOpen&&<CommunityForm mode={{type:'feedback',towerId:row.id,name:row.name}} onClose={()=>setFeedbackOpen(false)}/>}
    </>}
  </main></div>;
}
