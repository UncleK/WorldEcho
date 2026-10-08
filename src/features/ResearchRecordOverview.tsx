import { EvidenceSources } from '../catalog/RecordEvidence';
import { CLASS_LABELS, STATUS_LABELS } from '../catalog/research';
import type { ResearchRow, ResearchSource } from '../catalog/research';
import { metricCopy } from '../domain/measurements.mjs';
import { getLanguage, t } from '../i18n';
import './research-record.css';

export default function ResearchRecordOverview({ row, sources }: { row: ResearchRow; sources: Map<string, ResearchSource> }) {
  return <div className="research-record-summary" data-research-record={row.id}>
    {row.aliasOf && <p className="cat-alias-notice">{t('这是一条已合并的别名记录。')} <a href={`/catalog.html?entry=${encodeURIComponent(row.aliasOf)}`}>{t('打开合并后的档案')}</a></p>}
    <div className="research-record-badges">
      <span>{t(CLASS_LABELS[row.classification] || row.classification)}</span>
      <span>{t(STATUS_LABELS[row.status] || row.status)}</span>
      <span>{row.coverage}{t('/5 基础字段')}</span>
    </div>
    <p className="research-record-story">{row.summary ? metricCopy(row.summary, getLanguage()) : t('目前保留为可追溯的调查记录；建造缘由、使用情况或现状仍需继续补证。')}</p>
    {row.summary && <EvidenceSources ids={row.summarySourceIds} sources={sources} />}
    {row.uses.length > 0 && <p className="research-record-uses">{t('来源记录用途：')}{row.uses.join(' · ')}</p>}
    <section className="research-record-location" aria-label={t('位置与现状')}>
      <h3>{t('位置与现状')}</h3>
      <p>{[row.countryName, row.city || t('城市待核'), row.venue].filter(Boolean).join(' · ')}</p>
      <p>{row.mapReady ? t('地图为已匹配塔体的展示锚点，可能来自轮廓推导。') : row.approximateLocation || row.globeAvailable ? t('已按大致位置加入地球，具体塔址可继续核对。') : t('塔体位置待核，暂未进入地球地图。')}</p>
      <EvidenceSources ids={row.coordinateSourceIds} sources={sources} />
      <p>{t(STATUS_LABELS[row.status] || row.status)}{row.status === 'unknown' && ` · ${t('现状待核，照片与模型保留历史来源。')}`}</p>
      <EvidenceSources ids={row.statusSourceIds} sources={sources} />
    </section>
    <div className="research-record-model">
      <p>{row.modelKey ? t('已有简化3D模型。') : t('3D模型尚未制作。')}</p>
      {row.modelContext === 'inferred-completion' && <p>{t('含推测补全')}</p>}
      {row.modelScope === 'visible-section' && <p>{t('只呈现实景可见的塔段，未补造被遮挡的塔体。')}</p>}
      {row.modelKey && row.heightM === null && <p>{t('这个模型采用独立展示尺寸；实际高度待核，不进入高度比较。')}</p>}
    </div>
  </div>;
}
