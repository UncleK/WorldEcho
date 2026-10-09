import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Cloud, Globe2, Expand, Eye, EyeOff, Moon, RotateCcw, Palette, Ruler, Satellite, Shuffle, Shrink, Sun, Sunset, ZoomIn, ZoomOut, SlidersHorizontal } from 'lucide-react';
import type { EarthStyle, TowerRenderStyle } from '../types';
import { resolveEnvironment, type SkyPreset } from '../scene/sky';
import { t, useLanguage } from '../i18n';
import './explore-controls.css';
import TowerIcon from './TowerIcon';
import TowerFilterFields from './TowerFilterFields';
import { activeTowerFilters, type TowerFilters } from '../domain/tower-filters';
import { towerPlayCopy } from '../domain/tower-play';
const styles = [{ id: 'day', label: '微缩', Icon: Sun }, { id: 'porcelain', label: '瓷蓝', Icon: Palette }, { id: 'satellite', label: '实景地球', Icon: Satellite }] as const;
const towerStyles = [{id:'heritage',label:'实景色'}, {id:'metal',label:'金属'}, {id:'porcelain',label:'瓷器'}, {id:'blueprint',label:'线稿'}, {id:'illuminated',label:'灯光夜景'}] as const;
const skies=[{id:'morning',label:'晴日',Icon:Sun},{id:'cloudy',label:'薄云',Icon:Cloud},{id:'golden',label:'日落',Icon:Sunset},{id:'overcast',label:'阴天',Icon:Cloud},{id:'night',label:'星夜',Icon:Moon}] as const;
function ScaleControls({scale,onScale,onPreview,popover=false,onBegin,onCommit}:{scale:number;onScale:(value:number)=>void;onPreview?:(value:number)=>void;popover?:boolean;onBegin?:()=>void;onCommit?:()=>void}) {
  const [draft,setDraft]=useState(scale),latest=useRef(scale),dragging=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),frame=useRef(0);
  useEffect(()=>{setDraft(scale);latest.current=scale;},[scale]);
  useEffect(()=>()=>{clearTimeout(timer.current);cancelAnimationFrame(frame.current);},[]);
  const commit=()=>{clearTimeout(timer.current);cancelAnimationFrame(frame.current);dragging.current=false;onPreview?.(latest.current);onScale(latest.current);onCommit?.();};
  const preview=(value:number)=>{latest.current=value;setDraft(value);onBegin?.();cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(()=>onPreview?.(latest.current));if(!dragging.current){clearTimeout(timer.current);timer.current=setTimeout(commit,180);}};
  const id=popover?'exhibit-scale-mobile':'exhibit-scale';
  const apply = (value:number) => { latest.current=value;setDraft(value);commit(); };
  const shrink=<button title={t('缩小塔的展示比例')} aria-label={t('缩小塔的展示比例')} onClick={()=>apply(Math.max(.1,Math.round((scale-.1)*100)/100))}><Shrink size={16}/></button>;
  const grow=<button title={t('放大塔的展示比例')} aria-label={t('放大塔的展示比例')} onClick={()=>apply(Math.min(1.6,Math.round((scale+.1)*100)/100))}><Expand size={16}/></button>;
  return <div id={popover?'mobile-scale-panel':undefined} className={popover?'mobile-scale-controls':'tower-scale-track'} role={popover?'group':undefined} aria-label={popover?t('塔的展示比例'):undefined}>
    {!popover&&<Ruler size={15} aria-hidden="true"/>}
    {popover?grow:shrink}
    <input id={id} aria-label={t('塔的展示比例')} aria-orientation={popover?'vertical':'horizontal'} aria-valuetext={Math.round(draft*100)+'%'} type="range" min="0.1" max="1.6" step="0.05" value={draft} onPointerDown={event=>{dragging.current=true;event.currentTarget.setPointerCapture(event.pointerId);onBegin?.();}} onPointerUp={commit} onPointerCancel={commit} onBlur={commit} onKeyDown={()=>{dragging.current=true;onBegin?.();}} onKeyUp={event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key))commit();}} onChange={event=>preview(Number(event.target.value))}/>
    {popover?shrink:grow}
    <button className="scale-reset" title={t('恢复默认塔比例')} aria-label={t('恢复默认塔比例')} onClick={()=>apply(1)}><output htmlFor={id}>{Math.round(draft*100)}%</output></button>
  </div>;
}
export default function ExploreControls({ filters, onFilters, visibleCount, style, renderStyle, skyPreset, onSkyPreset, scale, showLabels, onLabels, onStyle, onRenderStyle, onScale, onScalePreview, onRandom, onJourneys, onZoom, onReset, onRotate }: {
  filters:TowerFilters;onFilters:(next:TowerFilters)=>void;visibleCount:number;
  skyPreset:SkyPreset;onSkyPreset:(preset:SkyPreset)=>void;
  style: EarthStyle; renderStyle: TowerRenderStyle; scale: number; onStyle: (style: EarthStyle) => void; onRenderStyle: (style: TowerRenderStyle) => void;
  showLabels:boolean;onLabels:(value:boolean)=>void;
  onScale: (scale: number) => void; onRandom: () => void; onJourneys: () => void; onZoom: (factor: number) => void; onReset: () => void; onRotate: (radians: number) => void;
  onScalePreview?: (scale: number) => void;
}) {
  const playCopy = towerPlayCopy(useLanguage()); const [menu,setMenu]=useState<'earth'|'tower'|'filters'|null>(null); const [scaleOpen,setScaleOpen]=useState(false); const root=useRef<HTMLDivElement>(null); const scalePanel=useRef<HTMLDivElement>(null);
  const scaleCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function beginScale() { if (scaleCloseTimer.current !== null) clearTimeout(scaleCloseTimer.current); }
  function commitScale() { beginScale(); scaleCloseTimer.current = setTimeout(() => { setScaleOpen(false); root.current?.querySelector<HTMLButtonElement>('.mobile-scale-toggle')?.focus({preventScroll:true}); }, 600); }
  useEffect(() => () => beginScale(), [scaleOpen]);
  const current=styles.find(item=>item.id===style)!;
  const environment = resolveEnvironment(style, skyPreset);
  useLayoutEffect(()=>{
    if(!menu&&!scaleOpen)return;
    const fit=()=>{
      const viewport=window.visualViewport,panel=root.current?.closest('.world-panel')?.getBoundingClientRect();
      const viewportTop=viewport?.offsetTop??0,top=Math.max(viewportTop,panel?.top??viewportTop),left=viewport?.offsetLeft??0,height=(viewport?.height??innerHeight)-(top-viewportTop),width=viewport?.width??innerWidth;
      for(const popover of root.current?.querySelectorAll<HTMLElement>('.style-popover,.tower-filter-popover,.mobile-scale-controls')??[]){
        popover.style.translate='0px 0px';
        popover.style.maxHeight=Math.max(80,height-24)+'px';
        const initial=popover.getBoundingClientRect(),bottom=Math.min(initial.bottom,top+height-12);
        popover.style.maxHeight=Math.max(80,bottom-top-12)+'px';
        const rect=popover.getBoundingClientRect();
        const x=rect.left<left+12?left+12-rect.left:rect.right>left+width-12?left+width-12-rect.right:0;
        const y=rect.top<top+12?top+12-rect.top:rect.bottom>top+height-12?top+height-12-rect.bottom:0;
        popover.style.translate=`${x}px ${y}px`;
      }
    };
    fit();window.addEventListener('resize',fit);window.addEventListener('scroll',fit,{passive:true});window.visualViewport?.addEventListener('resize',fit);window.visualViewport?.addEventListener('scroll',fit);
    return()=>{window.removeEventListener('resize',fit);window.removeEventListener('scroll',fit);window.visualViewport?.removeEventListener('resize',fit);window.visualViewport?.removeEventListener('scroll',fit);};
  },[menu,scaleOpen]);
  useEffect(() => {
    if (!menu && !scaleOpen) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target)) setMenu(null);
      if (!scalePanel.current?.contains(target) && !(target instanceof Element && target.closest('.mobile-scale-toggle'))) setScaleOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation();
      root.current?.querySelector<HTMLButtonElement>('button[aria-expanded=true]')?.focus();
      setMenu(null); setScaleOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape, true); };
  }, [menu, scaleOpen]);
  return <div ref={root} className="explore-controls" role="toolbar" aria-label={t('地球与建筑展示控制')}>
    <div className="style-control"><button className="current-style" title={t('地球样式与天气时刻')} aria-label={t('地球样式与天气时刻')} aria-expanded={menu==='earth'} onClick={()=>setMenu(menu==='earth'?null:'earth')}><Globe2 size={16}/><span>{t(current.label)}</span><ChevronDown size={11}/></button>{menu==='earth'&&<div className="style-popover earth-popover" role="group" aria-label={t('地球样式与天气时刻')}><small>{t('地球外观')}</small>{styles.map(({id,label})=><button key={id} aria-pressed={style===id} onClick={()=>onStyle(id)}><Globe2 size={15}/>{t(label)}</button>)}<div className="sky-preset-group"><small>{t('天气与时刻')}</small>{skies.map(({id,label,Icon})=><button key={id} aria-pressed={environment===id} onClick={()=>onSkyPreset(id)}><Icon size={15}/>{t(label)}</button>)}{environment==='dusk'&&<button aria-pressed="true" onClick={()=>onSkyPreset('dusk')}><Sunset size={15}/>{t('暮色')}</button>}</div></div>}</div>
    <div className="style-control"><button className="current-style" title={t('选择建筑渲染风格')} aria-label={t('选择建筑渲染风格')} aria-expanded={menu==='tower'} onClick={()=>setMenu(menu==='tower'?null:'tower')}><TowerIcon size={16}/><span>{t(towerStyles.find(item=>item.id===renderStyle)!.label)}</span><ChevronDown size={11}/></button>{menu==='tower'&&<div className="style-popover" role="group" aria-label={t('建筑渲染风格')}>{towerStyles.map(({id,label})=><button key={id} aria-pressed={renderStyle===id} onClick={()=>{onRenderStyle(id);setMenu(null);}}><TowerIcon size={14}/>{t(label)}</button>)}</div>}</div>
    <button className="toolbar-icon" title={t('随机一站')} aria-label={t('随机一站')} onClick={onRandom}><Shuffle size={17}/></button>
    <button className="toolbar-icon" title={t('选择主题漫游')} aria-label={t('选择主题漫游')} onClick={onJourneys}><BookOpen size={17}/></button>
    <div className="style-control filter-control"><button className="toolbar-icon tower-filter-button" title={t('筛选铁塔')} aria-label={t('筛选铁塔')} aria-expanded={menu==='filters'} aria-controls="tower-filter-panel" onClick={()=>{setScaleOpen(false);setMenu(menu==='filters'?null:'filters');}}><SlidersHorizontal size={17}/>{activeTowerFilters(filters)>0&&<span className="filter-count">{activeTowerFilters(filters)}</span>}</button>{menu==='filters'&&<div className="tower-filter-popover" id="tower-filter-panel" role="group" aria-label={t('铁塔筛选')}><strong aria-live="polite">{t('显示 {0} 处地点',visibleCount)}</strong><TowerFilterFields filters={filters} onChange={onFilters}/></div>}</div>
    <button className="toolbar-icon label-toggle" aria-pressed={!showLabels} title={showLabels?t('纯享模式：隐藏塔名'):t('显示塔名')} aria-label={showLabels?t('纯享模式：隐藏塔名'):t('显示塔名')} onClick={()=>onLabels(!showLabels)}>{showLabels?<Eye size={17}/>:<EyeOff size={17}/>}</button>
    <i className="toolbar-divider"/>
    <div className="camera-tools"><button title={t('靠近地球')} aria-label={t('靠近地球')} onClick={()=>onZoom(.82)}><ZoomIn size={18}/></button><button title={t('远离地球')} aria-label={t('远离地球')} onClick={()=>onZoom(1.22)}><ZoomOut size={18}/></button><button title={playCopy.reset} aria-label={playCopy.reset} onClick={onReset}><RotateCcw size={18}/></button><button className="rotate-tool" title={t('向左转动地球')} aria-label={t('向左转动地球')} onClick={()=>onRotate(-.3)}><ChevronLeft size={17}/></button><button className="rotate-tool" title={t('向右转动地球')} aria-label={t('向右转动地球')} onClick={()=>onRotate(.3)}><ChevronRight size={17}/></button></div>
    
    <i className="toolbar-divider scale-divider"/><ScaleControls scale={scale} onScale={onScale} onPreview={onScalePreview}/>
    <div ref={scalePanel} className="mobile-scale-anchor"><button className="current-style mobile-scale-toggle" title={t('模型比例')} aria-label={t('模型比例')} aria-expanded={scaleOpen} aria-pressed={scaleOpen} aria-controls="mobile-scale-panel" onClick={()=>{setMenu(null);setScaleOpen(value=>!value);}}><Ruler size={17}/><ChevronDown size={10}/></button>
      {scaleOpen&&<ScaleControls scale={scale} onScale={onScale} onPreview={onScalePreview} popover onBegin={beginScale} onCommit={commitScale}/>}
    </div>
  </div>;
}
