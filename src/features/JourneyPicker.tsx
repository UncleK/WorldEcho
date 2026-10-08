import type { RefObject } from 'react';
import { ArrowUpRight, MapPin, X } from 'lucide-react';
import { t } from '../i18n';
import type { AppCatalog, Tower } from '../domain/catalog';
import './journey-picker.css';

export default function JourneyPicker({ routes, towers, dialogRef, onStart, onClose }: {
  routes: AppCatalog['routes']; towers: Tower[]; dialogRef: RefObject<HTMLElement | null>;
  onStart: (id: string) => void; onClose: () => void;
}) {
  return <section ref={dialogRef} tabIndex={-1} className="journey-dialog" role="dialog" aria-modal="true" aria-labelledby="journey-heading" onClick={(event) => event.stopPropagation()}>
    <header><div><span className="eyebrow">A SMALL JOURNEY</span><h2 id="journey-heading">{t('挑一条路线，慢慢看世界')}</h2></div><button aria-label={t('关闭主题漫游')} onClick={onClose}><X size={20}/></button></header>
    <div className="journey-options">{routes.map((route) => <button key={route.id} onClick={() => onStart(route.id)}>
      <span className="journey-image-row" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => {
        const tower = towers.find((entry) => entry.id === route.stops[index]);
        return <span className="journey-image-slice" key={index}>{tower?.photos[0] ? <img src={tower.photos[0].url} alt="" loading="lazy"/> : <MapPin size={22}/>}</span>;
      })}</span>
      <span className="journey-card-copy"><strong>{route.title}</strong><span>{route.intro}</span><small>{route.stops.length}{t('站 · 开始漫游')}<ArrowUpRight size={14}/></small></span>
    </button>)}</div>
  </section>;
}
