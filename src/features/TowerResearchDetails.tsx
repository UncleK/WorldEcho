import { useMemo, type ReactNode } from 'react';
import type { ResearchDataset } from '../catalog/research';
import { usePublicData } from '../domain/usePublicData';
import { t, useLanguage } from '../i18n';
import RecordArchive from './RecordArchive';
import { localizeResearchRow } from './research-record';

export default function TowerResearchDetails({ towerId, comparisonAction }: { towerId: string; comparisonAction?: ReactNode }) {
  const language = useLanguage();
  const { data, error } = usePublicData<ResearchDataset>('/research.v1.json');
  const sources = useMemo(() => new Map(data?.sources.map(source => [source.id, source]) ?? []), [data]);
  if (!data) {
    const status = <p role="status">{error ?? t('正在整理地标资料…')}</p>;
    return status;
  }
  const sourceRow = data.entries.find(entry => entry.id === towerId);
  if (!sourceRow) {
    const missing = <p>{t('请打开资料集查看完整档案。')} <a href={`/catalog.html?entry=${encodeURIComponent(towerId)}`}>{t('打开资料目录')}</a></p>;
    return missing;
  }
  const row = localizeResearchRow(sourceRow, language);
  return <RecordArchive row={row} sources={sources} comparisonAction={comparisonAction}/>;
}
