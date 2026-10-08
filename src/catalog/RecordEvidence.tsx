import { evidenceText } from '../i18n/evidence';
import { ExternalLink, Image } from 'lucide-react';
import { t, getLanguage } from '../i18n';
import { metricCopy } from '../domain/measurements.mjs';
import { EVENT_LABELS, MATERIAL_LABELS, SCOPE_LABELS, formatMeters } from './research';
import type { ResearchRow, ResearchSource } from './research';
import ResearchPhotoCredit from '../features/ResearchPhotoCredit';
import './record-evidence.css';
export function HeightText({ row }: { row: ResearchRow }) {
  return row.heightM === null ? <span className="cat-unknown">{t("待核")}</span> : <><strong>{row.heightApproximate ? '≈ ' : ''}{formatMeters(row.heightM, row.heightConverted)} <span className="cat-unit">m</span></strong><small>{t(SCOPE_LABELS[row.heightScope ?? 'unknown'])}</small></>;
}
export function EvidenceSources({ ids, sources }: { ids: string[]; sources: Map<string, ResearchSource> }) {
  const rows = ids.map(id => sources.get(id)).filter((row): row is ResearchSource => !!row);
  return <div className="cat-source-links">{rows.map((source, index) => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" title={source.title}>{index + 1}. {source.publisher || source.title}<ExternalLink size={11} /></a>)}</div>;
}

export default function RecordEvidence({row,sources}:{row:ResearchRow;sources:Map<string,ResearchSource>}) {
  return <div className="record-evidence">
      <div className="cat-evidence-grid">
        <section><h3>{t("高度记录")}<span>{t("统一米")}</span></h3><div className="cat-detail-height"><HeightText row={row} /></div>{row.heightM === null ? <p>{row.heightObservationCount ? t("有来源高度线索，但尚未选定可展示值。它们没有参与排序和高度排名。") : t("目前没有可采用的来源高度。")}</p> : <><p>{row.heightScope === 'unknown' ? t("来源端点尚待核对，不用于严格同口径比较。") : t("数值是来源公布的高度，保留原有口径。")}{row.heightApproximate && t(" 约数/单位换算值保留近似展示。")}</p><EvidenceSources ids={row.heightSourceIds} sources={sources} /></>}{row.heightNotes.map((note, index) => <p className="cat-detail-footnote" key={index}>{metricCopy(evidenceText(note),getLanguage())}</p>)}</section>
        <section><h3>{t("建造与开放")}<span>{t("分开记录")}</span></h3>{row.events.length ? <ol className="cat-timeline">{[...row.events].sort((a, b) => a.date.localeCompare(b.date)).map((event, index) => <li key={`${event.kind}-${event.date}-${index}`}><strong>{event.date}</strong><span>{t(EVENT_LABELS[event.kind] || event.kind)}</span>{event.notes.map((note, ni) => <p key={ni}>{metricCopy(evidenceText(note),getLanguage())}</p>)}<EvidenceSources ids={event.sourceIds} sources={sources} /></li>)}</ol> : <p className="cat-unknown">{t("建造与开放时间仍待核实")}</p>}</section>
        <section><h3>{t("材料记录")}<span>{t("字段级来源")}</span></h3>{row.materials.length ? row.materials.map((claim, index) => <div className="cat-material-claim" key={index}><strong>{claim.groups.map(group => t(MATERIAL_LABELS[group])).join(' · ')}</strong><p>{evidenceText(claim.value)}</p><EvidenceSources ids={claim.sourceIds} sources={sources} /></div>) : <p className="cat-unknown">{t("材料未确认；未根据外形推断钢或铁。")}</p>}</section>
      </div>
      {row.photos.length > 0 && <section className="research-photo-evidence"><h3>{t("实景资料")}<span>{row.photoCount}{t("张可用记录")}</span></h3><p>{t("网页副本可能经缩放与格式转换；照片不代表今天的现状。")}</p><div className="research-photo-list">{row.photos.map(item => <figure key={item.id}><a className="research-photo-preview" href={item.originPageUrl ?? item.pageUrl} target="_blank" rel="noopener noreferrer">{item.thumbnail || item.url ? <img src={item.thumbnail ?? item.url!} alt={`${row.name} ${item.capturedAt || ''}`} loading="lazy" /> : <Image size={24}/>}</a><figcaption><ResearchPhotoCredit photo={item}/></figcaption></figure>)}</div></section>}
      <section className="cat-detail-sources"><h3>{t("原始出处")}<span>{row.sourceIds.length}{t("个来源")}</span></h3>{row.sourceIds.map(id => sources.get(id)).filter((source): source is ResearchSource => !!source).map(source => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer"><span><strong>{source.title}</strong><small>{source.publisher || t("发布者见原页")} · {source.kind === 'primary' ? t("机构 / 原始来源") : source.kind === 'mapping' ? t("地图证据") : t("发现线索 / 社区资料")}</small></span><ExternalLink size={15} /></a>)}</section>
      {row.gaps.length > 0 && <details className="cat-gaps"><summary>{t("尚待补证")}{row.gaps.length}{t("项")}</summary><ul>{row.gaps.map((gap, index) => <li key={index}>{evidenceText(gap)}</li>)}</ul></details>}
  </div>;
}
