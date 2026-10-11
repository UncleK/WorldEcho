import { Boxes, MapPin } from 'lucide-react';
import type { ResearchRow } from './research';
import { STATUS_LABELS } from './research';
import { t } from '../i18n';
export default function CatalogCards({rows,onRecord,onModel}:{rows:ResearchRow[];onRecord:(id:string)=>void;onModel:(row:ResearchRow)=>void}) {
  return <div className="cat-cards">{rows.map(row=>{
    const photo=row.photos.find(photo=>photo.thumbnail||photo.url),image=photo?.thumbnail??photo?.url??(row.modelKey?`/assets/portraits/${row.modelKey}.webp`:null);
    return <article key={row.id}><button className={`cat-card-image${!photo&&row.modelKey?' is-model':''}`} onClick={()=>onRecord(row.id)} aria-label={t('打开{0}资料',row.name)}>{image?<img src={image} alt={photo?t('{0}实景照片',row.name):t('{0}模型渲染',row.name)} loading="lazy"/>:<MapPin size={30}/>}<span>{photo?t('实景照片'):row.modelKey?t('模型渲染'):t('照片待补')}</span></button>
      <div className="cat-card-copy"><p>{row.countryName} · {row.city||t('城市待核')}</p><h3><button onClick={()=>onRecord(row.id)}>{row.name}</button></h3><p>{t(STATUS_LABELS[row.status]||row.status)}</p><div className="cat-card-actions"><button onClick={()=>onRecord(row.id)}>{t('完整档案')}</button>{row.modelKey&&<button onClick={()=>onModel(row)}><Boxes size={13}/>{t('查看模型')}</button>}</div></div>
    </article>;
  })}</div>;
}
