import { useId, useState } from 'react';
import { t, useLanguage } from '../i18n';
import { DEFAULT_TOWER_FILTERS, normalizeMinHeight, type TowerFilters } from '../domain/tower-filters';
import './tower-filters.css';

const extraFields=[
  ['includeRelated','衍生或相似建筑'],['includeProvisional','待核示意模型'],['includeUnmodeled','无模型资料点'],
  ['hideApproximate','仅已核位置'],['hidePast','排除历史与临时'],['hidePrivate','排除私人场所'],
  ['hideUnknownHeight','排除高度待核'],['hideUnknownStatus','仅有现存依据'],
] as const;

export default function TowerFilterFields({ filters, onChange }: { filters: TowerFilters; onChange: (next: TowerFilters) => void }) {
  useLanguage();
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const scope=!filters.includeRelated&&!filters.includeProvisional?(filters.includeReferences?'standard':'core'):
    filters.includeReferences&&filters.includeRelated&&filters.includeProvisional?'all':'custom';
  const activeExtras=extraFields.filter(([key])=>filters[key]);
  const heightPreset=[0,5,10,20].includes(filters.minHeight)?String(filters.minHeight):'custom';
  function commitHeight() {
    if (draft === null) return;
    onChange({ ...filters, minHeight: normalizeMinHeight(draft) });
    setDraft(null);
  }
  return <div className="tower-filter-fields">
    <label className="tower-filter-select"><span>{t('模型范围')}</span><select value={scope} onChange={event=>{
      const value=event.target.value;
      onChange({...filters,includeReferences:value!=='core',includeRelated:value==='all',includeProvisional:value==='all'});
    }}><option value="standard">{t('核心与外观参考')}</option><option value="core">{t('仅核心模型')}</option>
      <option value="all">{t('全部（含衍生与待核）')}</option>{scope==='custom'&&<option value="custom">{t('自定义范围')}</option>}
    </select></label>
    <label className="tower-filter-select"><span>{t('最低高度')}</span><select value={heightPreset} onChange={event=>{
      setDraft(null);onChange({...filters,minHeight:normalizeMinHeight(event.target.value)});
    }}>{[0,5,10,20].map(height=><option key={height} value={height}>{height===0?t('不限'):`${height} m`}</option>)}
      {heightPreset==='custom'&&<option value="custom">{filters.minHeight} m</option>}
    </select></label>
    <details className="tower-filter-more"><summary>{t('更多条件')}{activeExtras.length>0&&<span>{activeExtras.length}</span>}</summary>
      <div className="tower-filter-extra-fields">
        {extraFields.map(([key,label])=><label key={key} className="tower-filter-check"><input type="checkbox" checked={filters[key]} onChange={event=>onChange({...filters,[key]:event.target.checked})}/><span>{t(label)}</span></label>)}
        <div className="tower-filter-height"><label htmlFor={id}>{t('自定最低高度')}</label><div><input id={id} type="number" inputMode="decimal" min="0" max="10000" step="any" value={draft??String(filters.minHeight)} onChange={event=>setDraft(event.target.value)} onBlur={commitHeight} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();commitHeight();}}}/><span>m</span><button type="button" onClick={commitHeight}>{t('应用')}</button></div></div>
      </div>
    </details>
    {activeExtras.length>0&&<small className="tower-filter-active">{t('已启用：')}{activeExtras.map(([,label])=>t(label)).join(' · ')}</small>}
    <button type="button" className="tower-filter-reset" onClick={() => { setDraft(null); onChange({ ...DEFAULT_TOWER_FILTERS }); }}>{t('清除筛选')}</button>
  </div>;
}
