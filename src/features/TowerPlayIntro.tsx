import { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { SceneTower } from '../types';
import { useLanguage } from '../i18n';
import { TOWER_TRIGGERS, towerPlayCopy, type TowerPlayState } from '../domain/tower-play';
import { Hero, type WorldProps } from '../playground/PlayWorld';
import { Studio, type PlayClock } from '../playground/stage-fx';
import type { EffectName } from '../playground/play-state';
const noop = () => {};

function MiniatureLayoutRefresh(){
  const {gl,invalidate}=useThree();
  useEffect(()=>{
    let frame=0;
    // Resizing the backing canvas clears it. Repaint after the detail-panel
    // layout has settled, and refresh projected hit targets after scrolling.
    const refresh=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>invalidate());};
    const observer=new ResizeObserver(refresh);observer.observe(gl.domElement);
    document.addEventListener('scroll',refresh,true);refresh();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('scroll',refresh,true);};
  },[gl,invalidate]);
  return null;
}

export default function TowerPlayIntro({ tower, state, onActivate, onVisit }: {
  tower: SceneTower; state: TowerPlayState; onActivate: (effect: EffectName) => void; onVisit: () => void;
}) {
  const copy = towerPlayCopy(useLanguage()), trigger = TOWER_TRIGGERS[tower.id];
  const clock = useMemo<PlayClock>(() => ({ seconds: 20, started: { hats: 0, party: 0, water: 0 } }), []);
  if (!trigger) return null;
  const character = copy[trigger.effect], active = state.effects.includes(trigger.effect);
  // The introduction is a demand-rendered miniature. Only the main globe runs the show.
  const props: WorldProps = { towers: [tower], state: { ...state, selectedId: tower.id, close: true }, action: null,
    reduced: true, paused: true, charge: 0, charging: false, clickOnly: true,
    onSelect: noop, onActivate, onReveal: noop, onHoldStart: noop, onHoldEnd: noop, onHoldCancel: noop, onHotspot: noop };
  return <section className={`tower-play-intro is-${trigger.effect}`} aria-label={copy.title}>
    <div className="tower-play-miniature">
      <Canvas key={tower.id} frameloop="demand" dpr={[1, 1.5]} camera={{ position: [4.3, 3.5, 5.5], fov: 37, near: .03, far: 40 }} gl={{ alpha: true, antialias: true }}>
        <Suspense fallback={null}><Studio/><MiniatureLayoutRefresh/><ambientLight intensity={.4}/><hemisphereLight args={['#d6e7f0', '#76553d', 1]}/>
          <directionalLight position={[4, 7, 5]} intensity={2.5} color="#ffe6c6"/><directionalLight position={[-3, 3, -2]} intensity={1.2} color="#aac9f2"/>
          <Hero tower={tower} props={props} clock={clock}/>
          <OrbitControls makeDefault target={[0, 1.35, 0]} enablePan={false} minDistance={5} maxDistance={12} minPolarAngle={.4} maxPolarAngle={1.45}/>
        </Suspense>
      </Canvas>
      <span className="tower-play-mini-hint">{character.hint}</span>
    </div>
    <div className="tower-play-intro-copy"><small>{copy.title}</small><h3>{character.name}</h3><p>{character.description}</p>
      <button className="tower-play-try" onClick={() => onActivate(trigger.effect)}>{character.hint}<span aria-hidden="true">↗</span></button>
      <p className="tower-play-result" role="status">{active ? character.result : copy.intro}</p>
      <button className="tower-play-visit" onClick={onVisit}>{copy.visit}<span aria-hidden="true"> →</span></button>
    </div>
  </section>;
}
