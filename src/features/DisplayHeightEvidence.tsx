import { displayHeightEvidence, displayHeightRange } from '../domain/display-height.mjs';
import { getLanguage, t } from '../i18n';

export default function DisplayHeightEvidence({id,heightM}:{id:string;heightM:number|null}){
  const evidence=displayHeightEvidence(id);
  if(heightM!==null||!evidence?.displayM)return null;
  return <section className="display-height-evidence" aria-label={t('展示尺寸依据')}>
    <strong>{t(evidence.method==='user-estimate'?'用户估算':evidence.method==='photo-estimate'?'图片估算':'来源高度线索')} · {displayHeightRange(id,getLanguage())}</strong>
    <p>{evidence.method==='user-estimate'?t('用户根据照片提供的约数，用于展示尺度；尚无现场测量依据。'):evidence.method==='photo-estimate'?t('按照片中的人物、门窗或场景参照物粗略估算，透视与遮挡会影响结果。'):t('保留未采用的来源高度说法，用于区分地球上的展示尺寸。')}</p>
    <p>{t('实际高度仍待核实；不进入高度榜单或严格同口径比较。')}</p>
    {evidence.sourceUrls[0]&&<a href={evidence.sourceUrls[0]} target="_blank" rel="noopener noreferrer">{t('查看尺寸参考来源')} ↗</a>}
  </section>;
}
