import { lazy, Suspense, useState } from 'react';
import { Boxes } from 'lucide-react';
import type { ResearchRow } from '../catalog/research';
import type { TowerRenderStyle } from '../types';
import { t } from '../i18n';

const ModelCanvas=lazy(()=>import('./ModelCanvas'));
export default function RecordModelPreview({row}:{row:ResearchRow}) {
  const [style,setStyle]=useState<TowerRenderStyle>(row.modelCollection==='provisional'?'blueprint':'heritage');
  if(!row.modelKey)return <div className="record-model-empty"><Boxes size={28}/><p>{t(row.modelAvailability==='draft'?'已有模型草稿，身份或展示资格仍待核，暂未公开。':'3D模型尚未制作。')}</p></div>;
  return <section className="record-model-preview" aria-label={t('{0}三维模型',row.name)}>
    <Suspense fallback={<div className="record-model-loading" role="status">{t('正在打开模型…')}</div>}>
      <ModelCanvas modelKey={row.modelKey} style={style} name={row.name} className="record-model-canvas"/>
    </Suspense>
    <div className="record-model-toolbar"><select aria-label={t('建筑渲染风格')} value={style} onChange={event=>setStyle(event.target.value as TowerRenderStyle)}>
      {(['heritage','metal','porcelain','blueprint','illuminated'] as const).map((value,index)=><option key={value} value={value}>{t(['实景色','金属','瓷器','线稿','灯光夜景'][index])}</option>)}
    </select><span>{t('拖动旋转 · 滚轮缩放 · 中键或右键平移')}</span></div>
    <p className="record-model-caption">{t(row.modelCollection==='provisional'?'待核示意模型 · 外观或身份尚未确认':row.modelContext==='inferred-completion'?'根据实景与比例推测补全 · 自由旋转':'实景依据的简化模型 · 统一展示高度 · 自由旋转')}</p>
  </section>;
}
