import { useEffect, useRef, useState } from 'react';
import { Flag, X } from 'lucide-react';
import { t, useLanguage } from '../i18n';
import CommunityForm from './CommunityForm';
import type { TowerRenderStyle } from '../types';
import type { ModelCollection } from '../domain/catalog';
import { usePublicData } from '../domain/usePublicData';
import type { ResearchDataset } from '../catalog/research';
import { localizeResearchRow } from './research-record';
import RecordPhotoGallery from './RecordPhotoGallery';
import ModelEvidence from './ModelEvidence';
import ModelCanvas from './ModelCanvas';
import './model-viewer.css';
export default function ModelViewer({ modelKey, towerId, name, partial=false, modelCollection, modelContext, initialStyle='heritage', onClose }: { modelKey:string;towerId:string;name:string;partial?:boolean;modelCollection?:ModelCollection;modelContext?:'tower-body'|'inferred-completion';initialStyle?:TowerRenderStyle;onClose:()=>void }) {
  const language=useLanguage(),dialog=useRef<HTMLDialogElement>(null);
  const {data:research}=usePublicData<ResearchDataset>('/research.v1.json');
  const sourceRow=research?.entries.find(row=>row.id===towerId);
  const row=sourceRow?localizeResearchRow(sourceRow,language):undefined;
  const [comparing,setComparing]=useState(false);
  const [style,setStyle]=useState<TowerRenderStyle>(initialStyle);
  const [feedbackOpen,setFeedbackOpen]=useState(false);
  useEffect(()=>{const opener=document.activeElement;dialog.current?.showModal();return()=>{dialog.current?.close();if(opener instanceof HTMLElement && opener.isConnected)opener.focus();};},[]);
  return <dialog ref={dialog} className={`model-viewer${comparing?' is-comparing':''}`} onCancel={event=>{event.preventDefault();event.stopPropagation();onClose();}} aria-labelledby="model-viewer-title" onClick={event=>{if(event.target===event.currentTarget)onClose();}}><header><div><h2 id="model-viewer-title">{name}</h2><p>{modelCollection==='provisional'?t('待核示意模型 · 外观或身份尚未确认'):modelContext==='inferred-completion'?(modelCollection==='related'?t('相关建筑参考 · 含推测补全 · 自由旋转'):t('根据实景与比例推测补全 · 自由旋转')):modelCollection==='other'?t('其他类型 · 保留的简化模型 · 自由旋转'):modelCollection==='related'?t("相关建筑参考 · 地方改造轮廓 · 自由旋转"):partial?t("仅可见塔段的模型 · 统一展示尺寸 · 自由旋转"):t('实景依据的简化模型 · 统一展示高度 · 自由旋转')}</p>{modelContext==='tower-body'&&<p>{t('模型仅包含塔体，未包含实景高台座。')}</p>}</div><button onClick={onClose} aria-label={t('关闭')}><X size={22}/></button></header><div className="model-viewer-body"><ModelCanvas modelKey={modelKey} style={style} name={name}/>{comparing&&<aside className="model-viewer-evidence" aria-label={t('实景对照')}>{row?<><RecordPhotoGallery key={row.id} photos={row.photos} name={row.name}/><ModelEvidence row={row}/></>:<p role="status">{t('正在整理地标资料…')}</p>}</aside>}</div><footer><button className="model-feedback" aria-pressed={comparing} onClick={()=>setComparing(value=>!value)}>{t('实景对照')}</button><select aria-label={t('建筑渲染风格')} value={style} onChange={event=>setStyle(event.target.value as TowerRenderStyle)}>{(['heritage','metal','porcelain','blueprint','illuminated'] as const).map((value,index)=><option key={value} value={value}>{t(['实景色','金属','瓷器','线稿','灯光夜景'][index])}</option>)}</select><span>{t('拖动旋转 · 滚轮缩放 · 中键或右键平移')}</span><button className="model-feedback" onClick={()=>setFeedbackOpen(true)} title={t('发现资料有误？告诉我们')}><Flag size={15}/>{t('反馈')}</button></footer>{feedbackOpen&&<CommunityForm mode={{type:'feedback',towerId,name}} onClose={()=>setFeedbackOpen(false)}/>}</dialog>;
}
