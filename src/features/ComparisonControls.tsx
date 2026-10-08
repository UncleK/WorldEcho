import { useId, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, Info, Trash2, X } from 'lucide-react';
import { t, useLanguage } from '../i18n';
import type { ComparisonKind, ModelView } from '../types';
import ModelViewButtons from './ModelViewButtons';
import './comparison-controls.css';

export interface ComparisonControlsProps {
  kind: ComparisonKind;
  metricAvailable: boolean;
  strict: boolean;
  view: ModelView;
  count: number;
  onKind: (kind: ComparisonKind) => void;
  onView: (view: ModelView) => void;
  onBack: () => void;
  onClear: () => void;
}

export function ComparisonControls({
  kind, metricAvailable, strict, view, count, onKind, onView, onBack, onClear,
}: ComparisonControlsProps) {
  const language = useLanguage();
  const [informationOpen, setInformationOpen] = useState(false);
  const informationId = useId();
  const informationButton = useRef<HTMLButtonElement>(null);
  const modeDescription = kind === 'height'
    ? t('同一地面、同一比例尺，使用一致的高度定义')
    : kind === 'reported'
      ? t('高度对照按档案米数同比例显示；约值与口径差异见各地标资料。')
      : t('统一展示高度，专看每座建筑的不同');

  return <div
    className="comparison-controls"
    lang={language}
    onKeyDown={event => {
      if (event.key === 'Escape' && informationOpen) {
        event.stopPropagation();
        setInformationOpen(false);
        informationButton.current?.focus();
      }
    }}
  >
    <div className="comparison-controls__toolbar" role="group" aria-label={t('三维铁塔比较')}>
      <button type="button" className="comparison-controls__icon comparison-controls__back" title={t('返回地球')} aria-label={t('返回地球')} onClick={onBack}>
        <ArrowLeft size={17} aria-hidden="true" />
      </button>
      <div className="comparison-controls__mode">
        <select
          aria-label={t('比较方式')}
          title={!metricAvailable ? t('高度对照需要全塔与可采用高度') : t('比较方式')}
          value={kind === 'appearance' ? 'appearance' : 'height'}
          onChange={event => {
            if (event.target.value === 'appearance') onKind('appearance');
            else if (metricAvailable) onKind(strict ? 'height' : 'reported');
          }}
        >
          <option value="appearance">{t('样式对照')}</option>
          <option value="height" disabled={!metricAvailable}>{t('高度对照')}</option>
        </select>
        <ChevronDown size={12} aria-hidden="true" />
      </div>
      <div className="comparison-controls__views"><ModelViewButtons value={view} onChange={onView} /></div>
      <button type="button" className="comparison-controls__icon comparison-controls__clear" disabled={count === 0} title={t('一键清空')} aria-label={t('一键清空')} onClick={onClear}>
        <Trash2 size={15} aria-hidden="true" />
      </button>
      <button
        ref={informationButton}
        type="button"
        className="comparison-controls__icon comparison-controls__info"
        title={t('详细说明')}
        aria-label={t('详细说明')}
        aria-expanded={informationOpen}
        aria-controls={informationId}
        onClick={() => setInformationOpen(value => !value)}
      >
        <Info size={16} aria-hidden="true" />
      </button>
    </div>
    <div id={informationId} className="comparison-controls__information" hidden={!informationOpen}>
      <p>{modeDescription}</p>
      <p>{t('高度对照至少需两座完整模型；高度未知或不可采用时不参与。')}</p>
      {count === 0 && <p>{t('从右侧加入你想比较的铁塔')}</p>}
    </div>
  </div>;
}

export interface ComparisonRemoveButtonProps {
  name: string;
  onRemove: () => void;
  visible: boolean;
}

/** Place at the upper-right of each model with a screen-facing Html anchor. */
export function ComparisonRemoveButton({ name, onRemove, visible }: ComparisonRemoveButtonProps) {
  useLanguage();
  return <button
    type="button"
    className="comparison-model-remove"
    data-visible={visible}
    title={t('移除{0}', name)}
    aria-label={t('移除{0}', name)}
    onPointerDown={event => event.stopPropagation()}
    onDoubleClick={event => event.stopPropagation()}
    onClick={event => {
      event.stopPropagation();
      onRemove();
    }}
  >
    <X size={12} aria-hidden="true" />
  </button>;
}

export default ComparisonControls;
