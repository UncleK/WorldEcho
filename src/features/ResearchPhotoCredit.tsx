import type { ResearchPhoto } from '../catalog/research';
import { t } from '../i18n';

export default function ResearchPhotoCredit({ photo }: { photo: ResearchPhoto }) {
  const license = photo.license.text ? t(photo.license.text) : t('许可待核');
  return <>
    {photo.capturedAt || t('拍摄日期待核')} · {photo.author || t('作者见文件页')} · {' '}
    {photo.license.url ? <a href={photo.license.url} target="_blank" rel="noopener noreferrer">{license}</a> : <span>{license}</span>}
    {' · '}<a href={photo.originPageUrl ?? photo.pageUrl} target="_blank" rel="noopener noreferrer">{t('图片出处')}</a>
  </>;
}
