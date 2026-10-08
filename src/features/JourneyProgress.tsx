import { ChevronDown, Pause, Play, X } from 'lucide-react';
import { t } from '../i18n';
import './journey-progress.css';

export default function JourneyProgress({ title, stops, index, progress, playing, complete, onToggle, onStop, onVisit }: {
  title:string; stops:Array<{id:string;name:string}>; index:number; progress:number;
  playing:boolean; complete:boolean; onToggle:()=>void; onStop:()=>void; onVisit:(id:string)=>void;
}) {
  return <aside className="journey-rail" aria-label={t('主题漫游进度')} title={title}>
    <button className="journey-close" title={t('结束漫游')} aria-label={t('结束漫游')} onClick={onStop}><X size={13}/></button>
    <span className="journey-counter" aria-live="polite">{Math.max(0,index)+1}<small>/{stops.length}</small></span>
    <div className="journey-vertical-track">
      <i role="progressbar" aria-label={t('路线进度')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress*100)} style={{height:`${progress*100}%`}}/>
      {stops.map((stop,i)=><button key={stop.id} className={i===index?'current':i<index||complete?'visited':''} style={{top:`${stops.length<=1?0:i/(stops.length-1)*100}%`}} title={stop.name} aria-label={t('前往{0}',stop.name)} aria-current={i===index?'step':undefined} onClick={()=>onVisit(stop.id)}><span>{i+1}</span></button>)}
    </div>
    <button title={playing?t('暂停'):complete?t('再漫游一次'):t('继续漫游')} aria-label={playing?t('暂停'):complete?t('再漫游一次'):t('继续漫游')} onClick={onToggle}>{playing?<Pause size={14}/>:<Play size={14}/>}</button>
    <button disabled={index>=stops.length-1} title={t('下一站')} aria-label={t('下一站')} onClick={()=>onVisit(stops[index+1].id)}><ChevronDown size={16}/></button>
  </aside>;
}
