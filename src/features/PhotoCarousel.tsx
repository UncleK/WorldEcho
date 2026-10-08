import { t } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Pause, Play, MapPin } from 'lucide-react';
import type { Tower } from '../domain/catalog';
import { photoYear } from '../domain/photo-date';
import './photo-carousel.css';
import ModelViewButtons from './ModelViewButtons';
import ResearchPhotoCredit from './ResearchPhotoCredit';
import type { ModelView } from '../types';

export default function PhotoCarousel({ tower, index, onChange, onOpen, reducedMotion, suspended = false, portraits = [],modelView,onModelView, showCredit = false }: {
  tower: Tower; index: number; onChange: (index: number) => void; onOpen: () => void; reducedMotion: boolean; suspended?: boolean;
  portraits?: Array<{id:string;label:string;url:string}>;
  modelView:ModelView;onModelView:(value:ModelView)=>void;showCredit?:boolean;
}) {
  const [playing, setPlaying] = useState(!reducedMotion);
  const [paused, setPaused] = useState(false);
  const photos = tower.photos;
  const photo = photos[index] ?? photos[0];
  const mapScreenshot = photo?.assetRole === 'third_party_map_screenshot';
  const [portraitId,setPortraitId]=useState(tower.id);
  const pointerStart=useRef<{x:number;y:number}|null>(null);
  useEffect(()=>setPortraitId(tower.id),[tower.id]);
  const portraitIndex=Math.max(0,portraits.findIndex(entry=>entry.id===portraitId));
  const portrait=portraits[portraitIndex];
  const movePortrait=(step:number)=>setPortraitId(portraits[(portraitIndex+step+portraits.length)%portraits.length].id);
  useEffect(() => {
    if (!playing || paused || reducedMotion || suspended || photos.length < 2) return;
    const timer = setInterval(() => { if (!document.hidden) onChange((index + 1) % photos.length); }, 6000);
    return () => clearInterval(timer);
  }, [playing, paused, reducedMotion, suspended, photos.length, index, onChange]);
  function move(step: number) { setPlaying(false); onChange((index + step + photos.length) % photos.length); }
  return <div className="photo-carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setPaused(false); }}>
    <button className="photo-hero" disabled={!photo} onClick={onOpen} aria-label={t("查看完整实景照片")}>
      {photo ? <img key={photo.id} src={photo.url} alt={t("{0}实景，{1}", tower.label, photo.capturedAt ?? t("拍摄日期未记录"))} /> : <div className="no-photo"><MapPin size={34} /><span>{t("实景照片正在补充")}</span></div>}
    </button>
    <div className="photo-preview-caption image-preview-caption">
      {photos.length>1&&<button aria-label={t('上一张实景')} onClick={()=>move(-1)}><ChevronLeft size={14}/></button>}
      <span title={tower.name}><strong>{tower.name}</strong><small>{photoYear(photo?.capturedAt)??t('日期待补')}{photos.length>1&&` · ${index+1}/${photos.length}`}</small></span>
      {photos.length>1&&<button aria-label={t('下一张实景')} onClick={()=>move(1)}><ChevronRight size={14}/></button>}
    </div>
    {photo && <div className="carousel-controls">
      <span className="carousel-photo-label">{mapScreenshot ? t('地图截图') : t('实景 · {0}', photoYear(photo.capturedAt) ?? t('日期待补'))}</span>
      <div className="carousel-buttons">{photos.length > 1 && <><button className="carousel-previous" title={t('上一张实景')} aria-label={t('上一张实景')} onClick={() => move(-1)}><ChevronLeft size={16}/></button><span className="carousel-count">{index + 1} / {photos.length}</span><button className="carousel-next" title={t('下一张实景')} aria-label={t('下一张实景')} onClick={() => move(1)}><ChevronRight size={16}/></button><button title={playing ? t('暂停照片轮播') : t('播放照片轮播')} aria-label={playing ? t('暂停照片轮播') : t('播放照片轮播')} onClick={() => setPlaying(value => !value)} disabled={reducedMotion}>{playing && !reducedMotion ? <Pause size={14}/> : <Play size={14}/>}</button></>}
      <button className="photo-expand" title={t('查看完整实景照片')} aria-label={t('查看完整实景照片')} onClick={onOpen}><Maximize2 size={15}/></button></div>
    </div>}
    {showCredit && photo && <p className="photo-archive-credit"><ResearchPhotoCredit photo={photo}/></p>}
    {portrait && <div className="mobile-portrait-preview" role="region" aria-label={t('比较正视图预览')} tabIndex={portraits.length>1?0:undefined}
      onKeyDown={event=>{if(portraits.length>1&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();movePortrait(event.key==='ArrowLeft'?-1:1);}}}
      onPointerDown={event=>{if(portraits.length>1 && !(event.target as Element).closest('button')){pointerStart.current={x:event.clientX,y:event.clientY};event.currentTarget.setPointerCapture(event.pointerId);}}}
      onPointerCancel={()=>{pointerStart.current=null;}}
      onPointerUp={event=>{const start=pointerStart.current;pointerStart.current=null;if(start&&Math.abs(event.clientX-start.x)>30&&Math.abs(event.clientY-start.y)<60)movePortrait(event.clientX<start.x?1:-1);}}>
      <ModelViewButtons value={modelView} onChange={onModelView}/>
      <img key={`${portrait.id}-${modelView}`} src={portrait.url} alt={t('{0}模型视图',portrait.label)} draggable={false} loading="lazy"/>
      <div className="portrait-preview-caption image-preview-caption">{portraits.length>1&&<button aria-label={t('上一个比较模型')} onClick={()=>movePortrait(-1)}><ChevronLeft size={14}/></button>}<span title={portrait.label} aria-live="polite">{portrait.label}</span>{portraits.length>1&&<button aria-label={t('下一个比较模型')} onClick={()=>movePortrait(1)}><ChevronRight size={14}/></button>}</div>
    </div>}
  </div>;
}
