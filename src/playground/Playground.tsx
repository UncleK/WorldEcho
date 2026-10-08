import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, CirclePause, CirclePlay, Globe2, RotateCcw, Share2, Sparkles, Volume2, VolumeX } from 'lucide-react';
import type { AppCatalog, Tower } from '../domain/catalog';
import { toSceneTower } from '../domain/catalog';
import type { SceneTower } from '../types';
import { isTowerModelKey } from '../scene/tower-model';
import { useReducedMotion } from '../domain/useReducedMotion';
import PlayWorld, { type PlayAction } from './PlayWorld';
import { CHARACTERS, freshSeed, playUrl, readPlayState, type EffectName, type PlayState } from './play-state';
import './playground.css';
class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true};}render(){return this.state.failed?<div className="play-loading" role="alert">小世界暂时没能打开。<button onClick={()=>location.reload()}>重新打开</button></div>:this.props.children;}}
const CONTENT={
  hats:{eyebrow:'PARIS, TEXAS · THE HATMAKER',title:['借顶帽子，','给整个世界。'],intro:'在德州，巴黎会戴牛仔帽。按住它，再松手，把一场小小的恶作剧传出去。',button:'让帽子起飞',color:'#e8ae85',short:'帽子工坊',hint:'按住红帽子，再松手'},
  party:{eyebrow:'LAS VEGAS · THE NIGHT OWL',title:['天一黑，','整个世界开场。'],intro:'拉斯维加斯已经准备好了。点亮舞台，让远方的铁塔也加入今晚的演出。',button:'今晚，一起发光',color:'#c7a5eb',short:'午夜开场',hint:'按住小灯，点亮今晚'},
  water:{eyebrow:'RAWA PENING · THE DREAMER',title:['轻轻一点，','让世界荡漾。'],intro:'一座湖上的竹塔，做了一个很远的梦。轻触水面，看看涟漪会到哪里。',button:'送出一圈涟漪',color:'#8ccdc2',short:'湖上的梦',hint:'按住水面，松手造个梦'},
};
function Postmark({kind}:{kind:EffectName}){return <svg viewBox="0 0 90 76" fill="none" aria-hidden="true"><ellipse cx="46" cy="64" rx="32" ry="7" fill="currentColor" opacity=".13"/><path d="M30 62L40 33L44 14H48L52 33L63 62M37 45H55M41 30H52M35 54H58M40 61Q46 47 53 61" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>{kind==='hats'?<><path d="M31 15Q45 20 61 14Q54 7 50 11L48 4Q43 2 39 6L39 12Q33 8 31 15Z" fill="currentColor"/><path d="M38 13L52 13" stroke="#172130" strokeWidth="1.5"/></>:kind==='party'?<><path d="M19 50L29 17M72 49L66 11" stroke="currentColor" opacity=".4"/><path d="M69 15L72 22L80 25L72 28L69 35L66 28L59 25L66 22Z" fill="currentColor"/><circle cx="26" cy="22" r="3" fill="currentColor"/></>:<><ellipse cx="46" cy="65" rx="36" ry="9" stroke="currentColor" opacity=".4"/><path d="M15 41Q22 31 20 23Q28 35 23 41Z" fill="currentColor"/><circle cx="70" cy="41" r="3" stroke="currentColor"/></>}</svg>;}
export default function Playground(){
  const [catalog,setCatalog]=useState<{towers:SceneTower[];records:Tower[]}|null>(null),[error,setError]=useState('');
  useEffect(()=>{const abort=new AbortController();fetch(`${import.meta.env.BASE_URL}catalog.v1.json`,{signal:abort.signal}).then(async response=>{
    if(!response.ok||!response.headers.get('content-type')?.includes('json'))throw Error('地点目录暂时无法读取。');const data=await response.json() as AppCatalog;if(!Array.isArray(data.towers)||!Array.isArray(data.modelCases))throw Error('地点目录格式暂时无法识别。');
    const admitted=new Set(data.modelCases.filter(m=>m.modelCollection==='core').map(m=>m.id)),seen=new Set<string>();
    const records=data.towers.filter(t=>{const ok=admitted.has(t.id)&&!seen.has(t.id)&&!!t.modelKey&&isTowerModelKey(t.modelKey)&&Number.isFinite(t.coordinates?.lat)&&Number.isFinite(t.coordinates?.lon)&&Math.abs(t.coordinates.lat)<=90&&Math.abs(t.coordinates.lon)<=180&&t.status?.value!=='removed';if(ok)seen.add(t.id);return ok;});
    if(!records.length)throw Error('暂时没有可展示的地点。');setCatalog({records,towers:records.map(toSceneTower)});
  }).catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error?e.message:'暂时无法打开小世界。');});return()=>abort.abort();},[]);
  return catalog?<PlayApp catalog={catalog}/>:<div className="play-loading"><span className="loading-star">✦</span>{error||'把小世界放到你面前…'}</div>;
}
function PlayApp({catalog}:{catalog:{towers:SceneTower[];records:Tower[]}}){
  const [state,setState]=useState<PlayState>(()=>readPlayState(location.search,catalog.towers.map(t=>t.id))),[action,setAction]=useState<PlayAction|null>(null),[paused,setPaused]=useState(false),[charge,setCharge]=useState(0),[charging,setCharging]=useState(false),[shareLink,setShareLink]=useState(''),[copied,setCopied]=useState(false),[sound,setSound]=useState(false);
  const reduced=useReducedMotion(),hotspotButton=useRef<HTMLButtonElement>(null),holdStartTime=useRef<number|null>(null),holdFrame=useRef<number|undefined>(undefined),chargeRef=useRef(0),audio=useRef<AudioContext|null>(null),actionSerial=useRef(0);
  const character=CHARACTERS.find(c=>c.id===state.selectedId),kind=character?.effect??'hats',copy=CONTENT[kind],record=catalog.records.find(t=>t.id===state.selectedId)!;
  const positionHotspot=useCallback((x:number,y:number,visible:boolean)=>{const b=hotspotButton.current;if(!b)return;const stage=b.parentElement!;b.hidden=!visible;b.style.left=`${Math.max(8,Math.min(stage.clientWidth-190,x+30))}px`;b.style.top=`${Math.max(70,Math.min(stage.clientHeight-160,y-18))}px`;},[]);
  function chime(effect:EffectName){if(!sound)return;try{audio.current??=new AudioContext();void audio.current.resume();const ctx=audio.current,notes=effect==='hats'?[392,523,659,784]:effect==='party'?[261,329,392,523]:[523,659,880];notes.forEach((hz,i)=>{const oscillator=ctx.createOscillator(),gain=ctx.createGain(),time=ctx.currentTime+i*.1;oscillator.type='sine';oscillator.frequency.value=hz;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.035,time+.012);gain.gain.exponentialRampToValueAtTime(.001,time+.5);oscillator.connect(gain).connect(ctx.destination);oscillator.start(time);oscillator.stop(time+.55);});}catch{/* Sound is optional; the visual interaction still works. */}}
  const activate=useCallback((effect:EffectName,strength=.7)=>{
    if(!catalog.towers.some(t=>t.id===CHARACTERS.find(c=>c.effect===effect)?.id))return;
    setState(p=>({...p,effects:p.effects.includes(effect)?p.effects:[...p.effects,effect],seed:effect==='hats'&&p.effects.includes('hats')?freshSeed():p.seed}));
    setAction({effect,revision:++actionSerial.current,strength});setPaused(false);setShareLink('');chime(effect);
  },[catalog,sound]);
  function cancelHold(){if(holdFrame.current!==undefined)cancelAnimationFrame(holdFrame.current);holdFrame.current=undefined;holdStartTime.current=null;chargeRef.current=0;setCharge(0);setCharging(false);}
  function startHold(){if(holdStartTime.current!==null)return;holdStartTime.current=performance.now();setCharging(true);const tick=()=>{if(holdStartTime.current===null)return;const p=Math.min(1,(performance.now()-holdStartTime.current)/1100);chargeRef.current=p;setCharge(p);if(p<1)holdFrame.current=requestAnimationFrame(tick);};tick();}
  function finishHold(){if(holdStartTime.current===null)return;const power=.35+chargeRef.current*.65;cancelHold();activate(kind,power);}
  useEffect(()=>()=>{if(holdFrame.current!==undefined)cancelAnimationFrame(holdFrame.current);void audio.current?.close();},[]);
  useEffect(()=>{const hide=()=>{if(document.hidden)cancelHold();};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
  useEffect(()=>{history.replaceState({},'',playUrl(location.href,state));setShareLink('');setCopied(false);},[state]);
  useEffect(()=>{const apply=()=>{cancelHold();setAction(null);setState(readPlayState(location.search,catalog.towers.map(t=>t.id)));};window.addEventListener('popstate',apply);return()=>window.removeEventListener('popstate',apply);},[catalog]);
  const select=useCallback((id:string)=>{cancelHold();setState(p=>({...p,selectedId:id,close:true}));setAction(null);},[]);
  const reveal=useCallback(()=>setState(p=>({...p,close:false})),[]);
  function reset(){cancelHold();setState(p=>({...p,effects:[]}));setAction(null);setPaused(false);}
  async function share(){const url=playUrl(location.href,state);setShareLink(url);try{await navigator.clipboard.writeText(url);setCopied(true);}catch{setCopied(false);}}
  return <div className={`play-app mood-${kind} ${state.close?'is-close':'is-world'}`} style={{'--mood':copy.color} as React.CSSProperties}>
    <section className="play-stage" aria-label="铁塔微缩互动世界"><SceneBoundary><PlayWorld towers={catalog.towers} state={state} action={action} reduced={reduced} paused={paused} charge={charge} charging={charging} onSelect={select} onActivate={activate} onReveal={reveal} onHotspot={positionHotspot} onHoldStart={startHold} onHoldEnd={finishHold} onHoldCancel={cancelHold}/></SceneBoundary>
      {state.close&&<button ref={hotspotButton} hidden className={`play-hotspot ${charging?'is-charging':''}`} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);startHold();}} onPointerUp={finishHold} onPointerCancel={cancelHold} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();startHold();}}} onKeyUp={finishHold} aria-label={copy.hint}><span className="hotspot-dot"/>{charging?'松手，送出惊喜':copy.hint}<i style={{transform:`scaleX(${charge})`}}/></button>}
    </section>
    <header className="play-header"><a className="play-brand" href="https://worldecho.beaverstudio.net/zh/"><img src="/favicon.svg" alt=""/><span>WORLD ECHO<small>LITTLE WONDERS</small></span></a><span className="play-edition">一座塔 · 一个小宇宙</span><a className="play-back" href="https://worldecho.beaverstudio.net/zh/"><ArrowLeft size={14}/>回到探索</a></header>
    <main className="play-story">
      <div className="play-eyebrow"><span/> {state.close?(character?copy.eyebrow:record.label):'ONE LITTLE GESTURE. A WORLD OF ECHOES.'}</div>
      <h1>{state.close?<>{character?copy.title[0]:'这一顶，'}<br/><em>{character?copy.title[1]:'刚好属于你。'}</em></>:<>给世界，<br/><em>一点小意外。</em></>}</h1>
      <p className="play-intro">{state.close?(character?copy.intro:'在这个微缩展台里，近看它的新帽子。也可以再送出一轮，让远方一起换个心情。'):'转动地球，看看谁接住了你的惊喜。挑一座塔近看，或者找下一个小机关。'}</p>
      <div className="play-story-actions">{state.close?<button className="play-primary" onClick={()=>activate(kind)}><Sparkles size={17}/>{character?copy.button:'再送一轮帽子'}<ChevronRight size={16}/></button>:<button className="play-primary" onClick={share}>{copied?<Check size={17}/>:<Share2 size={17}/>}把这个世界送给朋友<ArrowUpRight size={16}/></button>}
      {state.close?<a className="play-fact-link" href={`https://worldecho.beaverstudio.net/zh/places/${record.id}.html`} target="_blank" rel="noreferrer">真实的它，长什么样<ArrowUpRight size={13}/></a>:<button className="play-quiet" onClick={()=>setState(p=>({...p,close:true}))}>回到小场景</button>}</div>
      <div className="play-combinations" aria-label="当前世界的效果">{state.effects.map(effect=><button key={effect} onClick={()=>setState(p=>({...p,effects:p.effects.filter(e=>e!==effect)}))} aria-label={`关闭${CONTENT[effect].short}`}><span style={{background:CONTENT[effect].color}}/>{CONTENT[effect].short}<i>×</i></button>)}</div>
      {shareLink&&<label className="play-share-link">{copied?'已复制，带着这个世界出发。':'复制链接，带着这个世界出发。'}<input readOnly value={shareLink} onFocus={e=>e.currentTarget.select()}/></label>}
    </main>
    <div className="play-tools"><button title={state.close?'看看全世界':'回到小场景'} aria-label={state.close?'看看全世界':'回到小场景'} onClick={()=>setState(p=>({...p,close:!p.close}))}><Globe2 size={18}/></button><button onClick={()=>setPaused(p=>!p)} disabled={reduced||!state.effects.length} aria-label={paused?'继续动画':'暂停动画'}>{paused?<CirclePlay size={18}/>:<CirclePause size={18}/>}</button><button onClick={()=>setSound(p=>!p)} aria-label={sound?'关闭声音':'开启声音'}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><button onClick={reset} disabled={!state.effects.length} aria-label="恢复世界"><RotateCcw size={17}/></button><button onClick={share} aria-label="分享这个世界"><Share2 size={17}/></button></div>
    <footer className="play-bottom"><div className="play-discovery"><span>继续发现</span><small>{state.effects.length} / 3 个小惊喜</small></div><nav className="play-characters" aria-label="选择铁塔的小机关">{CHARACTERS.map((entry,index)=><button key={entry.id} disabled={!catalog.towers.some(t=>t.id===entry.id)} className={entry.id===state.selectedId?'is-selected':''} aria-pressed={entry.id===state.selectedId} onClick={()=>select(entry.id)} style={{'--card-color':CONTENT[entry.effect].color} as React.CSSProperties}><Postmark kind={entry.effect}/><span><small>0{index+1} / {entry.effect==='hats'?'TEXAS':entry.effect==='party'?'LAS VEGAS':'RAWA PENING'}</small><strong>{CONTENT[entry.effect].short}</strong></span><i>{state.effects.includes(entry.effect)?<Check size={14}/>:<ChevronRight size={14}/>}</i></button>)}</nav><p className="play-footnote">World Echo Playroom<br/>微缩场景与互动为艺术演绎</p></footer>
  </div>;
}
