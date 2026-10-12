import { ExternalLink, Globe2, MapPin } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ResearchRow, ResearchSource } from '../catalog/research';
import RecordEvidence from '../catalog/RecordEvidence';
import { t } from '../i18n';
import ResearchRecordOverview, { ResearchRecordLocation } from './ResearchRecordOverview';
import RecordPhotoGallery from './RecordPhotoGallery';
import RecordActions from './RecordActions';
import RecordModelPreview from './RecordModelPreview';
import ModelEvidence from './ModelEvidence';
import './record-archive.css';

export default function RecordArchive({row,sources,comparisonAction}:{row:ResearchRow;sources:Map<string,ResearchSource>;comparisonAction?:ReactNode}) {
  const preferredMap=row.maps.preferred==='amap'?row.maps.amap:row.maps.google;
  return <>
    {row.aliasOf?<p className="record-alias-summary cat-alias-notice">{t('这是一条已合并的别名记录。')} <a href={`/catalog.html?entry=${encodeURIComponent(row.aliasOf)}`}>{t('打开合并后的档案')}</a></p>:<div className="record-media-grid">
      <RecordPhotoGallery key={row.id} photos={row.photos} name={row.name}/>
      <RecordModelPreview key={row.id} row={row}/>
    </div>}
    <div className="record-introduction-grid">
      <section className="record-introduction"><h3>{t('概述')}</h3><ResearchRecordOverview key={row.id} row={row} sources={sources} showLocation={false} showModel={false} showAliasNotice={false} compact/></section>
      <div><ResearchRecordLocation row={row} sources={sources}/>
        <RecordActions className="cat-detail-actions">
          {comparisonAction??(row.globeAvailable&&<a href={`/?tower=${encodeURIComponent(row.aliasOf??row.id)}${row.modelKey?'':'&unmodeled=1'}${row.modelCollection==='provisional'?'&provisional=1':''}${row.modelCollection==='related'||row.classification==='inspired'?'&related=1':''}`}><Globe2 size={15}/>{t('在地球上查看')}</a>)}
          {preferredMap&&<a href={preferredMap} target="_blank" rel="noopener noreferrer"><MapPin size={15}/>{row.maps.preferred==='amap'?t('高德地图'):t('Google地图')}<ExternalLink size={12}/></a>}
        </RecordActions>
      </div>
      <ModelEvidence row={row}/>
    </div>
    <RecordEvidence row={row} sources={sources} showPhotos={false}/>
  </>;
}
