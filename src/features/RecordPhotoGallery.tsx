import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Image, Maximize2, X } from 'lucide-react';
import type { ResearchPhoto } from '../catalog/research';
import { t } from '../i18n';
import ResearchPhotoCredit from './ResearchPhotoCredit';
import './record-photo-gallery.css';

function PhotoLightbox({ photos, name, initial, onClose }: { photos: ResearchPhoto[]; name: string; initial: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(initial);
  const photo = photos[index];
  const move = (step: number) => setIndex(value => (value + step + photos.length) % photos.length);
  useEffect(() => {
    const element=dialog.current, opener=document.activeElement;
    element?.showModal();
    return () => { element?.close(); if(opener instanceof HTMLElement && opener.isConnected) opener.focus({preventScroll:true}); };
  }, []);
  return <dialog className="record-photo-lightbox" ref={dialog} aria-label={t('{0}实景照片',name)} onCancel={event=>{event.preventDefault();event.stopPropagation();onClose();}}
    onClick={event=>{if(event.target===event.currentTarget)onClose();}}
    onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();move(event.key==='ArrowLeft'?-1:1);}}}>
    <header><strong>{name}</strong><span aria-live="polite">{index+1} / {photos.length}</span><button aria-label={t('关闭照片')} onClick={onClose}><X size={20}/></button></header>
    <img src={photo.url??photo.thumbnail!} alt={t('{0}实景，{1}',name,photo.capturedAt??t('拍摄日期未记录'))}/>
    <footer>{photos.length>1&&<button aria-label={t('上一张实景')} onClick={()=>move(-1)}><ChevronLeft/></button>}<ResearchPhotoCredit photo={photo}/>{photos.length>1&&<button aria-label={t('下一张实景')} onClick={()=>move(1)}><ChevronRight/></button>}</footer>
  </dialog>;
}

export default function RecordPhotoGallery({ photos, name }: { photos: ResearchPhoto[]; name: string }) {
  const visible=photos.filter(photo=>photo.url||photo.thumbnail);
  const [index,setIndex]=useState(0),[expanded,setExpanded]=useState(false);
  const safeIndex=Math.min(index,Math.max(0,visible.length-1)),photo=visible[safeIndex];
  return <div className="record-photo-gallery">
    {photo ? <>
      <figure><button className="record-photo-main" onClick={()=>setExpanded(true)} aria-label={t('查看完整实景照片')}><img src={photo.url??photo.thumbnail!} alt={t('{0}实景，{1}',name,photo.capturedAt??t('拍摄日期未记录'))}/><Maximize2 size={16}/></button>
        <figcaption><ResearchPhotoCredit photo={photo}/></figcaption></figure>
      {visible.length>1&&<div className="record-photo-thumbnails" aria-label={t('选择实景照片')}>{visible.map((item,i)=><button key={item.id} aria-label={t('第 {0} 张实景照片',i+1)} aria-pressed={i===safeIndex} onClick={()=>setIndex(i)}><img src={item.thumbnail??item.url!} alt="" loading="lazy"/></button>)}</div>}
      <p className="record-photo-note">{t('照片记录拍摄时的外观，不代表今天的现状。')}</p>
      {expanded&&<PhotoLightbox photos={visible} name={name} initial={safeIndex} onClose={()=>setExpanded(false)}/>}
    </> : <div className="cat-no-photo"><Image size={28}/><p>{t('还没有可用的实景照片')}</p>{photos[0]&&<a href={photos[0].pageUrl} target="_blank" rel="noopener noreferrer">{t('查看图片文件页')}</a>}</div>}
  </div>;
}
