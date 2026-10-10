import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Box3, Group, Mesh, Quaternion, Vector3 } from 'three';
import type { SceneTower } from '../types';
import { useLanguage } from '../i18n';
import { TOWER_TRIGGERS, towerPlayCopy, type TowerPlayState, type TowerPlayAction } from '../domain/tower-play';
import { acquireHat } from './hat-cache';
import { useSceneWork } from './scene-work';
import { hatChoice, type EffectName } from '../playground/play-state';
import { EARTH_RADIUS, geoNormal, isPointVisibleFromCamera } from './geo';
import { HAT_FLIGHT_END, HAT_FLIGHT_START, HAT_SHOW_END, hatFlightProgress, smoothFlight, type HatFlightPlan } from './hat-flight';
import {WORLD_SHOW_DURATION} from './world-shows';
import type {PlayRuntime} from './play-runtime';
export type {PlayRuntime} from './play-runtime';

export function WorldPlaySequence({ runtime, action, reduced, suspended, onReveal, onSettled }: {
  runtime: PlayRuntime; action?: TowerPlayAction | null; reduced: boolean; suspended: boolean;
  onReveal: () => void; onSettled: () => void;
}) {
  const revealed = useRef(false), settled = useRef(false), lastDiagnostic = useRef(0);
  const { gl, invalidate } = useThree();
  useEffect(() => {
    runtime.age = action ? 0 : 99; runtime.effect = action?.effect ?? null; runtime.cancelled = false;
    if(action)runtime.started[action.effect]=runtime.seconds;
    revealed.current = false; settled.current = false; invalidate();
  }, [action, runtime, invalidate]);
  useFrame(({ scene }, delta) => {
    const end=action?.effect==='party'?WORLD_SHOW_DURATION.party:action?.effect==='water'?WORLD_SHOW_DURATION.water:HAT_SHOW_END;
    if (!suspended && !document.hidden) {
      const step=Math.min(.05,delta);runtime.age=reduced?99:runtime.age+step;
      if(!reduced)runtime.seconds+=step;
      else for(const effect of ['hats','party','water'] as const)if(runtime.seconds-runtime.started[effect]<99)runtime.started[effect]=runtime.seconds-99;
    }
    if (action && !suspended && !revealed.current && runtime.age > (action.effect === 'hats' ? .28 : action.effect==='water'?.85:.65)) {
      revealed.current = true; if (!runtime.cancelled) onReveal();
    }
    if (!settled.current && runtime.age > end+.3) { settled.current = true; onSettled(); }
    if (action && runtime.age < end+.3 && !suspended && !document.hidden && !reduced) invalidate();
    if (import.meta.env.DEV) Object.assign(gl.domElement.dataset, { echoAge: runtime.age.toFixed(2), echoFlight: String(action?.effect === 'hats' && runtime.age < HAT_FLIGHT_END+.6), echoRevealed: String(revealed.current), echoTrailProgress: String(hatFlightProgress(runtime.age)) });
    if (import.meta.env.DEV && performance.now()-lastDiagnostic.current > 120) {
      lastDiagnostic.current = performance.now(); let hats=0, falling=0, trail=false, premature=0;
      scene.traverse(object => { if(object.userData.echoTrail&&object.visible)trail=true; if (object.userData.echoHat && object.visible) { hats++; if (!object.userData.echoLanded) falling++; if(runtime.effect==='hats'&&runtime.age>.15&&runtime.age<object.userData.echoArrival-.025)premature++; } });
      Object.assign(gl.domElement.dataset, { echoHatCount: String(hats), echoFallingCount: String(falling), echoTrailVisible:String(trail),echoPrematureHats:String(premature), echoCamera: runtime.cancelled ? 'manual' : runtime.age < HAT_SHOW_END && action?.effect === 'hats' ? 'show' : 'idle' });
    }
  }, -1);
  return null;
}

export function TowerHat({ tower, seed, detail, runtime, reduced, plan }: { tower: SceneTower; seed: string; detail: boolean; runtime: PlayRuntime; reduced: boolean; plan: HatFlightPlan }) {
  const choice = hatChoice(seed, tower.id), root = useRef<Group>(null);
  const queue = useSceneWork();
  const delay = plan.visits.get(tower.id)?.arrival ?? HAT_FLIGHT_END;
  const hatInfo=useMemo(()=>({echoHat:tower.id,echoLanded:false,echoArrival:delay}),[tower.id,delay]);
  useEffect(() => {
    let owned: ReturnType<typeof acquireHat> | undefined;
    const cancel = queue.add(() => { owned = acquireHat(choice.kind, choice.palette, detail ? 'detail' : 'overview'); root.current?.add(owned.object); }, 2-delay/20);
    return () => { cancel(); owned?.object.removeFromParent(); owned?.release(); };
  }, [choice.kind, choice.palette, detail, queue]);
  useFrame(() => {
    if (!root.current) return;
    const p = reduced || runtime.effect !== 'hats' ? 1 : Math.min(1, Math.max(0, (runtime.age-delay)/.75));
    const ease = 1-(1-p)**3;
    root.current.visible = p > 0; root.current.position.y = 1.005+(1-ease)*1.4+Math.sin(p*Math.PI*3)*(1-p)*.09;
    root.current.scale.setScalar((detail ? .84 : 1.08)*Math.max(.001,ease));
    root.current.rotation.z = choice.tilt + Math.sin(p*Math.PI*3)*(1-p)*.3;
    root.current.userData.echoLanded = p === 1;
    root.current.userData.echoArrival = delay;
  });
  return <group ref={root} position={[0, 1.005, 0]} rotation={[0, choice.tilt * 2, choice.tilt]} scale={.72} userData={hatInfo} dispose={null}/>;
}

function TexasHatFlight({ runtime, reduced, plan }: { runtime: PlayRuntime; reduced: boolean; plan: HatFlightPlan }) {
  const root = useRef<Group>(null), owned = useRef<{ source: Mesh; clone: Mesh; center: Vector3 } | null>(null);
  const { gl } = useThree();
  const scratch=useMemo(()=>({point:new Vector3(),normal:new Vector3(),inverse:new Quaternion(),orientation:new Quaternion(),up:new Vector3(0,1,0)}),[]);
  const release = () => { if (owned.current) { const { source, clone } = owned.current; source.visible = true; clone.removeFromParent(); clone.geometry.dispose(); for (const m of Array.isArray(clone.material) ? clone.material : [clone.material]) m.dispose(); owned.current = null; } };
  useEffect(() => () => { release(); delete gl.domElement.dataset.echoSourceHat; }, [gl]);
  useFrame(() => {
    if (!root.current) return;
    // The sibling is the owned, normalized tower model; its source geometry stays untouched.
    const source = root.current.parent?.parent?.children.find(child => child.userData.bodyPickProxy)?.getObjectByName('texas-enamel');
    if (source instanceof Mesh && source !== owned.current?.source) {
      release(); const center = source.geometry.boundingBox?.getCenter(new Vector3()) ?? new Box3().setFromBufferAttribute(source.geometry.attributes.position as import('three').BufferAttribute).getCenter(new Vector3());
      const clone = new Mesh(source.geometry.clone(), Array.isArray(source.material) ? source.material.map(m => m.clone()) : source.material.clone());
      clone.geometry.translate(-center.x,-center.y,-center.z); clone.raycast = () => {}; root.current.add(clone); owned.current = { source, clone, center };
    }
    const item = owned.current; if (!item) return;
    const age = runtime.age, flying = !reduced && runtime.effect === 'hats' && age < HAT_FLIGHT_END+.6;
    item.source.visible = !flying; item.clone.visible = flying;
    if (flying) {
      const p = Math.max(0, age-.12);
      item.clone.position.copy(item.center).add(new Vector3(p*.5, p*.95, Math.sin(p*1.8)*p*.25));
      item.clone.rotation.set(p*1.2,p*4,-p*.4);
      if(age>=HAT_FLIGHT_START){
        plan.curve.getPointAt(hatFlightProgress(age),scratch.point);scratch.normal.copy(scratch.point).normalize();
        scratch.point.addScaledVector(scratch.normal,.014);root.current.worldToLocal(scratch.point);
        const blend=smoothFlight((age-HAT_FLIGHT_START)/.32);item.clone.position.lerp(scratch.point,blend);
        root.current.getWorldQuaternion(scratch.inverse).invert();scratch.orientation.setFromUnitVectors(scratch.up,scratch.normal).premultiply(scratch.inverse);
        item.clone.quaternion.slerp(scratch.orientation,blend);item.clone.rotateY(age*2.5);
      }
      item.clone.scale.setScalar(age<HAT_FLIGHT_END?1:Math.max(.001,(HAT_FLIGHT_END+.6-age)/.6));
    }
    if (import.meta.env.DEV) gl.domElement.dataset.echoSourceHat = JSON.stringify({ flying, sourceVisible: item.source.visible, height: item.clone.position.y });
  });
  return <group ref={root}/>;
}

export function TowerPlayTrigger({ tower, height, disabled, onActivate }: {
  tower: SceneTower; height: number; disabled: boolean; onActivate: (effect: EffectName) => void;
}) {
  const trigger = TOWER_TRIGGERS[tower.id], copy = towerPlayCopy(useLanguage());
  const mesh = useRef<Mesh>(null), label = useRef<HTMLSpanElement>(null), allowed = useRef(false);
  const { gl, size } = useThree();
  const scratch = useMemo(() => ({ world: new Vector3(), low: new Vector3(), high: new Vector3() }), []);
  useEffect(() => () => { gl.domElement.style.cursor = ''; delete gl.domElement.dataset.echoTarget; }, [gl, tower.id]);
  useFrame(({ camera, size }) => {
    if (!mesh.current || !trigger) return;
    const point = mesh.current.getWorldPosition(scratch.world);
    const low = scratch.low.copy(point).project(camera), high = scratch.high.copy(point).addScaledVector(geoNormal(tower.lat, tower.lon), height).project(camera);
    const pixels = Math.hypot((high.x-low.x)*size.width, (high.y-low.y)*size.height)/2;
    allowed.current = !disabled && camera.position.distanceTo(point) < height * 11 && pixels > 65
      && low.z > -1 && low.z < 1 && isPointVisibleFromCamera(camera.position, point, EARTH_RADIUS);
    if (label.current) label.current.style.display = allowed.current ? '' : 'none';
    if (import.meta.env.DEV) gl.domElement.dataset.echoTarget = JSON.stringify({ id: tower.id, effect: trigger.effect, near: allowed.current, x: size.left+(low.x+1)*size.width/2, y: size.top+(1-low.y)*size.height/2 });
  });
  if (!trigger) return null;
  const activate = (event: ThreeEvent<MouseEvent>) => {
    if (!allowed.current || event.button !== 0 || event.delta > 5) return;
    event.stopPropagation(); onActivate(trigger.effect);
  };
  return <>
    <mesh ref={mesh} position={[0, trigger.y, 0]} onClick={activate}
      raycast={function(ray, hits) { if (allowed.current && mesh.current) Mesh.prototype.raycast.call(mesh.current, ray, hits); }}
      onPointerOver={event => { if (allowed.current) { event.stopPropagation(); gl.domElement.style.cursor = 'pointer'; } }}
      onPointerOut={() => { gl.domElement.style.cursor = ''; }}>
      <boxGeometry args={trigger.size}/><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false}/>
    </mesh>
    {trigger.effect === 'party' && <mesh position={[0, .43, .135]} raycast={() => {}}><sphereGeometry args={[.023, 12, 8]}/><meshStandardMaterial color="#eacb84" emissive="#edbc62" emissiveIntensity={2}/></mesh>}
    <Html position={[size.width < 600 ? .48 : .27, trigger.y+.015, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[4, 0]}>
      <span ref={node => { label.current = node; if (node) node.style.display = allowed.current ? '' : 'none'; }} className={`tower-play-hint is-${trigger.effect}`}>{copy[trigger.effect].hint}</span>
    </Html>
  </>;
}

export function TowerPlayDecoration({ tower, selected, height, state, disabled, onActivate, runtime, reduced, plan }: {
  tower: SceneTower; selected: boolean; height: number; state?: TowerPlayState; disabled: boolean; onActivate?: (effect: EffectName) => void; runtime: PlayRuntime; reduced: boolean; plan: HatFlightPlan;
}) {
  return <group scale={height}>
    {state?.effects.includes('hats') && (tower.id === 'us-paris-texas' ? <TexasHatFlight runtime={runtime} reduced={reduced} plan={plan}/> : <TowerHat tower={tower} seed={state.seed} detail={selected} runtime={runtime} reduced={reduced} plan={plan}/>)}
    {selected && TOWER_TRIGGERS[tower.id] && onActivate && <TowerPlayTrigger tower={tower} height={height} disabled={disabled} onActivate={onActivate}/>}
  </group>;
}
