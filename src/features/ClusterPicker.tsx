import { t } from '../i18n';
import { ArrowUpRight, MapPin, X } from 'lucide-react';
import type { RefObject } from 'react';
import { heightLabel } from '../domain/catalog';
import type { Tower } from '../domain/catalog';
import './cluster-picker.css';

export default function ClusterPicker({ towers, isModels, dialogRef, onSelect, onClose }: {
  towers: Tower[]; isModels: boolean; dialogRef: RefObject<HTMLElement | null>;
  onSelect: (id: string) => void; onClose: () => void;
}) {
  return <section ref={dialogRef} tabIndex={-1} className="cluster-dialog" role="dialog" aria-modal="true" aria-labelledby="cluster-heading" onClick={(event)=>event.stopPropagation()}>
    <header><div><h2 id="cluster-heading">{isModels ? t("{0} 座建筑，选一座近看", towers.length) : t("探索这一带的 {0} 座塔", towers.length)}</h2><p>{isModels ? t("不同轮廓、不同结构，从模型走进各地的故事。") : t("看照片，选一座靠近。缩小展示比例，也能让邻近的塔分开显示。")}</p></div><button aria-label={t("关闭地标选择")} onClick={onClose}><X size={20}/></button></header>
    <div className={`cluster-list${towers.length <= 4 ? ' cluster-list-small' : ''}`}>{towers.map((tower)=><button key={tower.id} aria-label={t("选择{0}，{1}", tower.label, heightLabel(tower))} onClick={()=>onSelect(tower.id)}>
      {tower.photos[0] ? <img src={tower.photos[0].url} alt="" loading="lazy"/> : <span className="cluster-no-photo"><MapPin size={28}/><small>{t("实景待补")}</small></span>}
      <span className="cluster-card-content"><strong>{tower.name}</strong><small>{[tower.countryName, tower.city].filter(Boolean).join(' · ')}</small><span className="cluster-card-meta"><span>{heightLabel(tower)}</span><span className="model-ready">{tower.modelKey ? t("可近看 3D") : t("实景与资料")}</span></span><span className="cluster-card-summary">{tower.editorial?.summary ?? t("从{0}发现这个熟悉轮廓的地方故事。", tower.label)}</span></span><ArrowUpRight className="cluster-card-arrow" size={18}/>
    </button>)}</div>
  </section>;
}
