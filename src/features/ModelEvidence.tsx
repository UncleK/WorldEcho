import type { ResearchRow } from '../catalog/research';
import { getLanguage, t } from '../i18n';
export default function ModelEvidence({ row }: { row: ResearchRow }) {
  if(row.aliasOf)return <section className="record-model-evidence"><h3>{t('模型与实景依据')}</h3><a href={`/catalog.html?entry=${encodeURIComponent(row.aliasOf)}`}>{t('打开合并后的档案')}</a></section>;
  if(!row.modelKey)return <section className="record-model-evidence"><h3>{t('模型与实景依据')}</h3><p>{t(row.modelAvailability==='draft'?'已有模型草稿，身份或展示资格仍待核，暂未公开。':'3D模型尚未制作。')}</p></section>;
  const language=getLanguage(),evidence=row.modelEvidence;
  const features=evidence?.features[language==='zh-CN'?'zh':language]??[];
  const collection={core:'核心模型',reference:'外观参考',related:'相关建筑参考',other:'其他类型',provisional:'待核示意模型',pending:'待核模型'};
  return <section className="record-model-evidence" aria-label={t('模型与实景依据')}>
    <h3>{t('模型与实景依据')}</h3>
    <p>{t(collection[row.modelCollection??'core'])} · {t(row.modelCollection==='provisional'?'依据已有线索绘制，不代表已核实外观。':'根据实景制作的简化模型')}</p>
    {row.modelCollection==='provisional'?<p>{t('这份示意用于浏览与继续补证。比例、颜色和构件可能与实物不同，不作为事实尺寸或现场照片。')}</p>:row.modelContext==='inferred-completion'&&<p>{t('含推测补全；被遮挡或缺失的部分按可见比例与对称关系表达，尚需更多照片核对。')}</p>}
    {row.modelScope==='visible-section'&&<p>{t('只呈现实景可见的塔段，未补造被遮挡的塔体。')}</p>}
    {row.modelContext==='tower-body'&&<p>{t('模型仅包含塔体，未包含实景高台座。')}</p>}
    {features.length>0&&<ul>{features.map((feature,index)=><li key={index}>{feature}</li>)}</ul>}
    {evidence&&<p className="record-review-date">{t(row.modelCollection==='provisional'?'示意模型检查：{0}':'模型外观核对：{0}',evidence.checkedAt)}</p>}
    <p>{t('模型展示尺寸不等于实际高度；现状与尺寸以各字段来源为准。')}</p>
  </section>;
}
