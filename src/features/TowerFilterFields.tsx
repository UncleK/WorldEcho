import { useId, useState } from 'react';
import { t, useLanguage } from '../i18n';
import { DEFAULT_TOWER_FILTERS, normalizeMinHeight, type TowerFilters } from '../domain/tower-filters';
import './tower-filters.css';

export default function TowerFilterFields({ filters, onChange }: { filters: TowerFilters; onChange: (next: TowerFilters) => void }) {
  useLanguage();
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  function commitHeight() {
    if (draft === null) return;
    onChange({ ...filters, minHeight: normalizeMinHeight(draft) });
    setDraft(null);
  }
  return <div className="tower-filter-fields">
    <label className="tower-filter-check"><input type="checkbox" checked={filters.includeReferences} onChange={event => onChange({ ...filters, includeReferences: event.target.checked })}/><span>{t('包含参考模型与其他类型')}</span></label>
    <label className="tower-filter-check"><input type="checkbox" checked={filters.includeUnmodeled} onChange={event=>onChange({...filters,includeUnmodeled:event.target.checked})}/><span>{t('显示暂无模型的资料点')}</span></label>
    <label className="tower-filter-check"><input type="checkbox" checked={filters.hideApproximate} onChange={event=>onChange({...filters,hideApproximate:event.target.checked})}/><span>{t('仅看已核实位置')}</span></label>
    <label className="tower-filter-check"><input type="checkbox" checked={filters.hidePast} onChange={event => onChange({ ...filters, hidePast: event.target.checked })}/><span>{t('隐藏临时、已拆除及历史模型')}</span></label>
    <label className="tower-filter-check"><input type="checkbox" checked={filters.hidePrivate} onChange={event => onChange({ ...filters, hidePrivate: event.target.checked })}/><span>{t('隐藏私人庭院、非公开场所')}</span></label>
    <div className="tower-filter-height"><label htmlFor={id}>{t('最低高度')}</label><div><input id={id} type="number" inputMode="decimal" min="0" max="10000" step="any" value={draft ?? String(filters.minHeight)} onChange={event => setDraft(event.target.value)} onBlur={commitHeight} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); commitHeight(); } }}/><span>m</span><button type="button" onClick={commitHeight}>{t('应用')}</button></div></div>
    <div className="tower-filter-presets" aria-label={t('常用高度门槛')}>{[0, 5, 10, 20].map(height => <button type="button" key={height} aria-pressed={filters.minHeight === height} onClick={() => { setDraft(null); onChange({ ...filters, minHeight: height }); }}>{height === 0 ? t('不限') : `${height} m`}</button>)}</div>
    <label className="tower-filter-check"><input type="checkbox" checked={filters.hideUnknownHeight} onChange={event => onChange({ ...filters, hideUnknownHeight: event.target.checked })}/><span>{t('隐藏高度待核')}</span></label>
    <label className="tower-filter-check"><input type="checkbox" checked={filters.hideUnknownStatus} onChange={event => onChange({ ...filters, hideUnknownStatus: event.target.checked })}/><span>{t('只看有现存依据的塔')}</span></label>
    <button type="button" className="tower-filter-reset" onClick={() => { setDraft(null); onChange({ ...DEFAULT_TOWER_FILTERS }); }}>{t('清除筛选')}</button>
  </div>;
}
