import { useMemo } from 'react';
import RecordEvidence from '../catalog/RecordEvidence';
import type { ResearchDataset } from '../catalog/research';
import { usePublicData } from '../domain/usePublicData';
import { t } from '../i18n';

export default function TowerResearchDetails({ towerId, name }: { towerId: string; name: string }) {
  const { data, error } = usePublicData<ResearchDataset>('/research.v1.json');
  const sources = useMemo(() => new Map(data?.sources.map(source => [source.id, source]) ?? []), [data]);
  if (!data) return <p role="status">{error ?? t('正在整理地标资料…')}</p>;
  const row = data.entries.find(entry => entry.id === towerId);
  if (!row) return <p>{t('请打开资料集查看完整档案。')} <a href={`/catalog.html?entry=${encodeURIComponent(towerId)}`}>{t('打开资料目录')}</a></p>;
  return <RecordEvidence row={{ ...row, name }} sources={sources}/>;
}
