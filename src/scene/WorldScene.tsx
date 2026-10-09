import { t } from '../i18n';
import {
  forwardRef, Suspense, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { CameraControls, CameraControlsImpl, Html } from '@react-three/drei';
import {
  Group, Material, Mesh, MeshBasicMaterial, OrthographicCamera, PerspectiveCamera, Box3, Ray, Matrix4,
  PlaneGeometry, PMREMGenerator, PointsMaterial, Quaternion, SphereGeometry, Vector3, DirectionalLight, CatmullRomCurve3, TubeGeometry, type Object3D,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { EarthStyle, FocusProgress, ModelView, SceneTower, TowerRenderStyle, WorldSceneHandle, WorldSceneProps } from '../types';
import { useProgressiveLand, useProgressiveModels } from './useProgressiveWorld';
import { globeZoomAfterFactor, globeCloseView, MIN_GLOBE_ZOOM, MAX_GLOBE_ZOOM } from './globe-zoom';
import GlobeLoading from '../features/GlobeLoading';
import { useEarthAtlas, type EarthAtlas, type EarthAtlasStatus } from './useEarthAtlas';
import { angularDistance, clusterTowers, exhibitTowerHeight, hasExhibitModel, modelPresentation } from './density';
import { advanceFocusOpacity, findFocusOccluders, installFocusFade } from './focus-occlusion';
import { TOWER_TRIGGERS } from '../domain/tower-play';
import { createTowerModel, getTowerIllumination, updateTowerIllumination } from './tower-model';
import {
  COMPARISON_UNITS_PER_METER, EARTH_RADIUS, cameraSurfaceDollyCorrection, fitSphereDistance, geoEast, geoNormal,
  geoNorth, geoPosition, geoRotation, hasUsableHeight,
  isPointVisibleFromCamera,
} from './geo';
import { createContactShadowMaterial, createPlanetSurface, createSpaceMaterial, createStarGeometry, LAND_RELIEF } from './planet';
import { earthSunDirection } from './realistic-earth';
import { createCloudSkyMaterial, SKY_LIGHTING, resolveEnvironment, cloudCoverage, type SkyPreset } from './sky';
import { createEarthWeather, shadeTowerByWeather, type EarthWeather } from './earth-weather';
import { ComparisonRemoveButton } from '../features/ComparisonControls';
import { COMPARISON_VIEW_POSES, comparisonCameraPose, comparisonFrame } from './comparison-view';
import { TowerPlayDecoration, WorldPlaySequence, type PlayRuntime } from './TowerPlay';
import {effectSeconds} from './play-runtime';
import {createWorldShowPlan,showActivation,worldShowPose,WORLD_SHOW_DURATION,type WorldShowPlan} from './world-shows';
import {WorldShowField,WorldShowInstances} from './WorldShowEffects';
import {installShowMaterials} from './show-materials';
import HatLightTrail from './HatLightTrail';
import { createHatFlightPlan, hatChasePose, HAT_FLIGHT_END, HAT_SHOW_END, smoothFlight, type HatFlightPlan } from './hat-flight';

const HOME_DIRECTION = geoNormal(28, 55);
const GLOBAL_UP = new Vector3(0, 1, 0);
const SAFE_TRANSIT_RADIUS = 2.35;
const MIN_CAMERA_RADIUS = EARTH_RADIUS + LAND_RELIEF + 0.025;
const FOV = 48;
let webgl2Available: boolean | undefined;

function supportsWebgl2(force=false) {
  if (!force && webgl2Available !== undefined) return webgl2Available;
  try {
    const probe = document.createElement('canvas');
    const context = probe.getContext('webgl2');
    webgl2Available = !!context;
    context?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl2Available = false;
  }
  return webgl2Available;
}

type CameraNavigation = {
  id: string;
  startedAt: number;
  duration: number;
  local: boolean;
  startPosition: Vector3;
  startTarget: Vector3;
  startUp: Vector3;
  destination: Vector3;
  target: Vector3;
  up: Vector3;
  transitRadius: number;
  orbit: Quaternion;
  mode: 'overview' | 'focus';
};

const easeCamera = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

function interpolateUp(from: Vector3, to: Vector3, t: number): Vector3 {
  const rotation = new Quaternion().setFromUnitVectors(from, to);
  return from.clone().applyQuaternion(new Quaternion().slerp(rotation, t)).normalize();
}

function disposeModel(group: Group): void {
  const geometries = new Set<NonNullable<Mesh['geometry']>>();
  const materials = new Set<Material>();
  group.traverse((object: Object3D) => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function LocalEnvironment({ earthStyle, realistic = false, night = earthStyle === 'night' }: { earthStyle: EarthStyle; realistic?: boolean; night?: boolean }) {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const generator = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = generator.fromScene(room, 0.06);
    const previousEnvironment = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    scene.environment = target.texture;
    scene.environmentIntensity = realistic ? night ? .14 : .34 : night ? .24 : .52;
    room.dispose();
    generator.dispose();
    invalidate();
    return () => {
      if (scene.environment === target.texture) scene.environment = previousEnvironment;
      scene.environmentIntensity = previousIntensity;
      target.dispose();
    };
  }, [gl, scene, invalidate, earthStyle, realistic, night]);
  return null;
}

interface SceneIlluminationClock { seconds: number; ticks: number }

/** One demand-render timer for the scene; every model reads the same paused clock. */
function SceneIlluminationDriver({ clock, active, mobile, reducedMotion, suspended }: {
  clock: SceneIlluminationClock; active: boolean; mobile: boolean; reducedMotion: boolean; suspended: boolean;
}) {
  const { invalidate, gl } = useThree();
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let previous = 0;
    const fps = mobile ? 12 : 24;
    const publish = () => {
      if (import.meta.env.DEV) Object.assign(gl.domElement.dataset, {
        illuminationTimerCount: timer === undefined ? '0' : '1', illuminationFps: timer === undefined ? '0' : String(fps),
        illuminationSeconds: clock.seconds.toFixed(3), illuminationTicks: String(clock.ticks),
        illuminationPaused: document.hidden ? 'hidden' : suspended ? 'overlay' : reducedMotion ? 'reduced-motion' : active ? 'running' : 'inactive',
      });
    };
    const stop = () => { if (timer !== undefined) clearInterval(timer); timer = undefined; publish(); };
    const resume = () => {
      stop();
      if (!active || reducedMotion || suspended || document.hidden) {
        if (reducedMotion) clock.seconds = 0;
        publish();
        if (!document.hidden) invalidate();
        return;
      }
      previous = performance.now();
      timer = setInterval(() => {
        if (document.hidden) { stop(); return; }
        const now = performance.now();
        clock.seconds += Math.max(0, now - previous) / 1000;
        previous = now;
        clock.ticks += 1;
        publish();
        invalidate();
      }, 1000 / fps);
      publish();
      invalidate();
    };
    document.addEventListener('visibilitychange', resume);
    resume();
    return () => { stop(); document.removeEventListener('visibilitychange', resume); };
  }, [clock, active, mobile, reducedMotion, suspended, gl, invalidate]);
  return null;
}

function Space({ mobile, earthStyle, uiTheme='dark', skyPreset='auto', realistic=false, focusAnchor }: { mobile: boolean; earthStyle: EarthStyle; uiTheme?:'dark'|'light';skyPreset?:SkyPreset; realistic?:boolean; focusAnchor?:Vector3 }) {
  const { gl } = useThree();
  const stars = useMemo(() => createStarGeometry(mobile ? 320 : 620), [mobile]);
  const starMaterial = useMemo(() => new PointsMaterial({ size: mobile ? 1.25 : 1.5, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false }), [mobile]);
  const cloudSeed=useMemo(()=>Math.random()*100,[]);
  const resolvedSky=resolveEnvironment(earthStyle,skyPreset);
  const night = resolvedSky === 'night';
  const light=SKY_LIGHTING[resolvedSky];
  const skyMaterial = useMemo(()=>realistic && uiTheme === 'dark' ? createSpaceMaterial() : createCloudSkyMaterial(uiTheme,resolvedSky,cloudSeed), [uiTheme,resolvedSky,cloudSeed,realistic]);
  const skyGeometry = useMemo(() => new SphereGeometry(70, 32, 20), []);
  const cameraFill = useRef<DirectionalLight>(null);
  const solarLight = useRef<DirectionalLight>(null);
  const solarDirection = useMemo(() => earthSunDirection(earthStyle, skyPreset, focusAnchor), [earthStyle, skyPreset, focusAnchor]);
  const shadowTarget = useMemo(() => new Vector3(), []);
  useFrame(({ camera }) => {
    cameraFill.current?.position.copy(camera.position);
    const sun = solarLight.current;
    if (!sun || !focusAnchor) return;
    const near = camera.position.length() < 1.9 && focusAnchor;
    if (near) shadowTarget.copy(focusAnchor); else shadowTarget.set(0, 0, 0);
    const span = near ? resolvedSky === 'golden' || resolvedSky === 'dusk' ? 1.2 : .48 : 2.1;
    const changed = sun.target.position.distanceToSquared(shadowTarget) > 1e-9 || sun.shadow.camera.right !== span;
    sun.position.copy(solarDirection).multiplyScalar(6).add(shadowTarget);
    sun.target.position.copy(shadowTarget); sun.target.updateMatrixWorld();
    if (changed) {
      Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span });
      sun.shadow.camera.updateProjectionMatrix(); gl.shadowMap.needsUpdate = true;
    }
  });
  useEffect(() => () => stars.dispose(), [stars]);
  useEffect(() => () => starMaterial.dispose(), [starMaterial]);
  useEffect(() => () => skyGeometry.dispose(), [skyGeometry]);
  useEffect(() => () => skyMaterial.dispose(), [skyMaterial]);
  return (
    <>
      <color attach="background" args={[uiTheme==='light'?'#e7eef4':'#030813']} />
      <mesh geometry={skyGeometry} material={skyMaterial} renderOrder={-100} frustumCulled={false} dispose={null} />
      <points visible={uiTheme!=='light'} geometry={stars} material={starMaterial} frustumCulled={false} dispose={null} />
      <hemisphereLight color={light.hemi} groundColor={light.ground} intensity={realistic ? night ? .27 : light.ambient + .18 : light.ambient} />
      <directionalLight ref={solarLight} position={solarDirection.clone().multiplyScalar(6).toArray()} color={light.key} intensity={light.intensity} castShadow
        shadow-mapSize-width={mobile?512:2048} shadow-mapSize-height={mobile?512:2048}
        shadow-camera-left={-2.1} shadow-camera-right={2.1} shadow-camera-top={2.1} shadow-camera-bottom={-2.1}
        shadow-camera-near={0.1} shadow-camera-far={15} shadow-bias={-0.00008} shadow-normalBias={0.0004} shadow-radius={2} />
      <directionalLight position={[-4, -0.5, 3]} color={light.fill} intensity={realistic ? .035 : light.fillIntensity*.6} />
      <directionalLight position={[-2, 3, -4]} color={light.edge} intensity={realistic ? .08 : light.edgeIntensity} />
      <directionalLight ref={cameraFill} color={light.fill} intensity={realistic ? night ? .24 : .65 : light.fillIntensity} />
      <LocalEnvironment earthStyle={earthStyle} realistic={realistic} night={night} />
    </>
  );
}

/** Small, height-banded quadrants fill lattice gaps without filling the lower arch. */
function installTowerBodyPicking(model: Group) {
  const bands = 28;
  const volumes = Array.from({ length: bands * 4 }, () => new Box3());
  const vertex = new Vector3();
  model.updateMatrixWorld(true);
  model.traverse(object => {
    if (!(object instanceof Mesh) || object.userData.displayDecoration) return;
    const positions = object.geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index += 1) {
      vertex.fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld);
      const band = Math.max(0, Math.min(bands - 1, Math.floor(vertex.y * bands)));
      const quadrant = (vertex.x >= 0 ? 1 : 0) + (vertex.z >= 0 ? 2 : 0);
      volumes[band * 4 + quadrant].expandByPoint(vertex);
    }
  });
  const boxes = volumes.filter(box => !box.isEmpty()).map(box => {
    box.expandByScalar(0.004);
    box.min.y = Math.max(0, box.min.y);
    return box;
  });
  const envelope = boxes.reduce((bounds, box) => bounds.union(box), new Box3());
  const inverse = model.matrixWorld.clone(), localRay = new Ray(), localPoint = new Vector3(), worldPoint = new Vector3();
  model.userData.bodyPickProxy = true;
  model.userData.bodyPickVolumes = boxes;
  model.userData.bodyPickEnvelope = envelope;
  model.raycast = (raycaster, intersections) => {
    inverse.copy(model.matrixWorld).invert();
    localRay.copy(raycaster.ray).applyMatrix4(inverse);
    if (!localRay.intersectsBox(envelope)) return false;
    let closest = Infinity;
    const hit = new Vector3();
    for (const box of boxes) {
      if (!localRay.intersectBox(box, localPoint)) continue;
      worldPoint.copy(localPoint).applyMatrix4(model.matrixWorld);
      const distance = raycaster.ray.origin.distanceTo(worldPoint);
      if (distance < raycaster.near || distance > raycaster.far || distance >= closest) continue;
      if (!isPointVisibleFromCamera(raycaster.ray.origin, worldPoint, EARTH_RADIUS)) continue;
      closest = distance; hit.copy(worldPoint);
    }
    if (Number.isFinite(closest)) {
      intersections.push({ distance: closest, point: hit, object: model });
      return false; // A matched volume avoids testing every thin triangle again.
    }
    // Sparse antenna/ornament bands retain the exact mesh fallback.
  };
}

function TowerModel({ tower, height, detail, renderStyle, bodyPicking = false, reducedMotion, illuminationClock, weather,show }: { tower: SceneTower; height: number; detail: 'overview' | 'detail'; renderStyle: TowerRenderStyle; bodyPicking?: boolean; reducedMotion: boolean; illuminationClock: SceneIlluminationClock; weather?: EarthWeather | null;show?:{runtime:PlayRuntime;party:boolean;water:boolean;partyArrival:number;waterArrival:number} }) {
  const [model, setModel] = useState<Group | null>(null);
  const materialEffects=useRef<ReturnType<typeof installShowMaterials>|null>(null);
  const focusFade=useRef<ReturnType<typeof installFocusFade>|null>(null);
  // Three objects can notify the attached renderer while they are assembled.
  // Create and retire owned GPU resources in commit, outside React render.
  useLayoutEffect(() => {
    if (!tower.modelKey) { setModel(null); return; }
    const group = createTowerModel(tower.modelKey, detail, renderStyle);
    if (weather) shadeTowerByWeather(group, weather);
    // The model factory enables structural shadows and excludes glass/light sprites.
    // Keep those per-material choices so illuminated billboards do not cast opaque shadows.
    if (bodyPicking) installTowerBodyPicking(group);
    materialEffects.current=bodyPicking?installShowMaterials(group):null;
    focusFade.current=bodyPicking?installFocusFade(group):null;
    setModel(group);
    return () => disposeModel(group);
  }, [tower.modelKey, detail, renderStyle, bodyPicking, weather]);
  useFrame(({gl}) => {
    if(model&&focusFade.current?.(model.parent?.userData.focusOpacity??1))gl.shadowMap.needsUpdate=true;
    if (model && renderStyle === 'illuminated') updateTowerIllumination(model, illuminationClock.seconds, !reducedMotion);
    if(show&&materialEffects.current){
      const partyAge=effectSeconds(show.runtime,'party',reducedMotion),waterAge=effectSeconds(show.runtime,'water',reducedMotion);
      const nightGain=show.party?showActivation(partyAge,show.partyArrival,reducedMotion)*(reducedMotion?1:.88+.22*(.5+.5*Math.sin(partyAge*4.2))**2):1;
      const waterGain=show.water?showActivation(waterAge,show.waterArrival,reducedMotion):0;
      materialEffects.current(nightGain,waterGain,waterAge);if(model){model.userData.echoPartyGain=nightGain;model.userData.echoWaterGain=waterGain;}
    }
  });
  if (!model) return null;
  return <primitive object={model} scale={height} dispose={null} />;
}

interface HotspotLabelRegistration {
  button: HTMLButtonElement;
  label: HTMLSpanElement;
  badge: HTMLSpanElement | null;
  leader: SVGLineElement | null;
  point: Vector3;
  priority: number;
}

interface ScreenLabelCandidate {
  id: string; priority: number; distance: number;
  left: number; right: number; buttonBottom: number; height: number;
}

/** Place only screen text; geographic models and clickable point anchors never move. */
function layoutTowerNameLabels(candidates: ScreenLabelCandidate[], bounds: { top: number; bottom: number; left: number; right: number }, reserved: { top: number; bottom: number; left: number; right: number }[]) {
  const occupied = [...reserved];
  const result = new Map<string, { visible: boolean; bottom: number }>();
  for (const candidate of [...candidates].sort((a, b) => b.priority - a.priority || a.distance - b.distance || a.id.localeCompare(b.id))) {
    let placement: { visible: boolean; bottom: number } | undefined;
    for (const bottom of [35, 61, 87, 9, -28]) {
      const rect = { left: candidate.left - 3, right: candidate.right + 3, top: candidate.buttonBottom - bottom - candidate.height - 2, bottom: candidate.buttonBottom - bottom + 2 };
      if (rect.left < bounds.left + 5 || rect.right > bounds.right - 5 || rect.top < bounds.top + 5 || rect.bottom > bounds.bottom - 5) continue;
      if (occupied.some(other => rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top)) continue;
      placement = { visible: true, bottom };
      occupied.push(rect);
      break;
    }
    // Keep selected/hovered names inside the canvas even near a low viewport's top edge.
    if (!placement && candidate.priority >= 2) {
      const bottom = Math.max(candidate.buttonBottom - bounds.bottom + 7,
        Math.min(35, candidate.buttonBottom - bounds.top - candidate.height - 7));
      placement = { visible: true, bottom };
      occupied.push({ left: candidate.left - 3, right: candidate.right + 3,
        top: candidate.buttonBottom - bottom - candidate.height - 2, bottom: candidate.buttonBottom - bottom + 2 });
    }
    result.set(candidate.id, placement ?? { visible: candidate.priority >= 2, bottom: 35 });
  }
  return result;
}

function HotspotNameLayout({ registry, showLabels }: { registry: Map<string, HotspotLabelRegistration>; showLabels: boolean }) {
  const { gl, camera } = useThree();
  useFrame(() => {
    const entries = [...registry].filter(([, entry]) => entry.button.style.opacity !== '0');
    const bounds = gl.domElement.getBoundingClientRect();
    const reserved = entries.flatMap(([, entry]) => entry.badge ? [entry.badge.getBoundingClientRect()] : []);
    const candidates = entries.map(([id, entry]) => {
      const button = entry.button.getBoundingClientRect();
      const center = button.left + button.width / 2;
      return { id, priority: entry.priority, distance: camera.position.distanceToSquared(entry.point), left: center - entry.label.offsetWidth / 2, right: center + entry.label.offsetWidth / 2, buttonBottom: button.bottom, height: entry.label.offsetHeight };
    });
    const placements = showLabels ? layoutTowerNameLabels(candidates, bounds, reserved) : new Map<string, { visible: boolean; bottom: number }>();
    let visible = 0;
    for (const [id, entry] of registry) {
      const placement = placements.get(id);
      const shown = !!placement?.visible;
      entry.label.style.visibility = shown ? 'visible' : 'hidden';
      entry.label.style.bottom = `${placement?.bottom ?? 35}px`;
      entry.button.dataset.nameVisible = String(shown);
      if (entry.leader) {
        const bottom = placement?.bottom ?? 35;
        entry.leader.setAttribute('y2', String(22 - bottom));
        const offset = Math.abs(Number(entry.leader.getAttribute('x1') ?? 0)) > 0 || bottom !== 35;
        entry.leader.style.opacity = shown && offset ? entry.priority >= 2 ? '0.5' : '0.22' : '0';
      }
      if (shown) visible += 1;
    }
    if (import.meta.env.DEV) Object.assign(gl.domElement.dataset, { visibleNameLabelCount: String(visible), collisionHiddenNameCount: String(showLabels ? entries.length - visible : 0) });
  });
  return null;
}

function TowerHotspot({ tower, point, selected, onSelect, active, clusterIds, onClusterSelect, neighboringPoint, showLabels, labelRegistry, mobile }: {
  tower: SceneTower; point: Vector3; selected: boolean; active: boolean; onSelect: (id: string) => void;
  clusterIds: string[]; onClusterSelect?: (ids: string[]) => void;
  neighboringPoint?: { id: string; point: Vector3 };
  showLabels: boolean;
  labelRegistry: Map<string, HotspotLabelRegistration>;
  mobile: boolean;
}) {
  const { camera, invalidate } = useThree();
  const element = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const leader = useRef<SVGLineElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  const nameLabel = useRef<HTMLSpanElement>(null);
  const countBadge = useRef<HTMLSpanElement>(null);
  useEffect(() => { invalidate(); }, [active, selected, hovered, point, showLabels, invalidate]);
  useEffect(() => () => { labelRegistry.delete(tower.id); }, [labelRegistry, tower.id]);
  useFrame(({ size }) => {
    if (!element.current || !active) { labelRegistry.delete(tower.id); return; }
    const projected=point.clone().project(camera);
    const visible = isPointVisibleFromCamera(camera.position, point, EARTH_RADIUS + LAND_RELIEF * 0.55)&&Math.abs(projected.x)<1.2&&Math.abs(projected.y)<1.2&&projected.z>=-1&&projected.z<=1;
    element.current.style.opacity = visible ? '1' : '0';
    // Only visible glyph/text descendants receive clicks. Transparent 44px HTML
    // boxes must not swallow a neighbouring building's body raycast.
    element.current.style.pointerEvents = 'none';
    element.current.tabIndex = visible ? 0 : -1;
    element.current.setAttribute('aria-hidden',String(!visible));
    let labelShift = 0;
    const own = point.clone().project(camera);
    const width = size.width, height = size.height;
    if (visible && showLabels && neighboringPoint) {
      const other = neighboringPoint.point.clone().project(camera);
      const dx = (own.x - other.x) * width * 0.5, dy = (own.y - other.y) * height * 0.5;
      if (Math.abs(dx) < 100 && Math.abs(dy) < 60) labelShift = dx < 0 || (dx === 0 && tower.id < neighboringPoint.id) ? -46 : 46;
    }
    const screenX = (own.x + 1) * width * 0.5;
    const labelHalfWidth = showLabels ? Math.max(22, (nameLabel.current?.offsetWidth ?? Math.min(180, tower.name.length * 6 + 25)) / 2) : 22;
    if (showLabels) labelShift = Math.max(labelHalfWidth + 8 - screenX, Math.min(width - labelHalfWidth - 8 - screenX, labelShift));
    element.current.style.setProperty('--tower-label-shift', `${labelShift}px`);
    element.current.style.transform = `translateX(${labelShift}px)`;
    if (marker.current) { marker.current.style.transform = `translateX(${-labelShift}px)`; marker.current.style.pointerEvents = visible ? 'auto' : 'none'; }
    if (nameLabel.current) nameLabel.current.style.pointerEvents = visible ? 'auto' : 'none';
    if (countBadge.current) { countBadge.current.style.transform = `translateX(${-labelShift}px)`; countBadge.current.style.pointerEvents = visible ? 'auto' : 'none'; }
    if (leader.current) { leader.current.setAttribute('x1', String(-labelShift)); leader.current.style.opacity = labelShift ? selected || hovered ? '0.5' : '0.22' : '0'; }
    if (showLabels && nameLabel.current) labelRegistry.set(tower.id, { button: element.current, label: nameLabel.current, badge: countBadge.current, leader: leader.current, point, priority: selected ? 3 : hovered ? 2 : clusterIds.length > 1 ? 1 : 0 });
    else labelRegistry.delete(tower.id);
  });
  if (!active) return null;
  return (
    <Html position={point.toArray()} center zIndexRange={[selected ? 32 : 20, 0]} style={{ pointerEvents: 'none' }}>
      <button
        ref={element}
        type="button"
        className={`scene-hotspot${selected ? ' is-selected' : ''}`}
        title={showLabels ? tower.name : undefined}
        data-tower-id={tower.id}
        aria-label={clusterIds.length > 1 ? t("查看{0}附近的{1}座塔", tower.name, clusterIds.length) : t("查看{0}", tower.name)}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onClick={(event) => { event.stopPropagation(); if (clusterIds.length > 1 && onClusterSelect) onClusterSelect(clusterIds); else onSelect(tower.id); }}
        style={{
          minWidth: 44, minHeight: 44, border: 0, background: 'transparent', cursor: 'pointer', pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', position: 'relative',
          color: selected ? '#f7cf81' : '#d3e8ff', fontSize: 11, whiteSpace: 'nowrap', padding: 0,
        }}
      >
        <span ref={marker} className="scene-hotspot-marker-hit" style={{ width: mobile ? 44 : 16, height: mobile ? 44 : 16, display: 'grid', placeItems: 'center', pointerEvents: 'auto' }}><span style={{ width: selected ? 6 : 3, height: selected ? 6 : 3, opacity: showLabels || hovered ? 1 : 0, borderRadius: '50%', background: 'currentColor', boxShadow: selected ? '0 0 8px #e7ae55' : 'none' }} /></span>
        {showLabels && <svg aria-hidden="true" viewBox="-60 -30 120 36" style={{ position: 'absolute', bottom: 16, width: 120, height: 36, pointerEvents: 'none', overflow: 'visible' }}><line ref={leader} x1="0" y1="0" x2="0" y2="-22" stroke="currentColor" strokeWidth="1" opacity="0" /></svg>}
        {(showLabels || hovered) && clusterIds.length > 1 && <span aria-hidden="true" className="scene-hotspot-group" style={{ position: 'absolute', bottom: 18, width: 10, height: 10, border: '1px solid currentColor', borderRadius: '50%', opacity: 0.45, pointerEvents: 'none' }}><span style={{ position: 'absolute', top: -3, left: 3, width: 10, height: 10, border: '1px solid currentColor', borderRadius: '50%' }} /></span>}
        {showLabels && clusterIds.length > 1 && <span ref={countBadge} className="scene-hotspot-count" aria-hidden="true" style={{ position: 'absolute', bottom: 2, minWidth: 17, border: '1px solid #c7ac6888', borderRadius: 9, padding: '1px 4px', background: '#112a3feb', color: '#f1d59c', fontSize: 10, lineHeight: '15px', fontWeight: 600 }}>{clusterIds.length}</span>}
        {showLabels && <span ref={nameLabel} className="scene-hotspot-label" style={{ position: 'absolute', bottom: 35, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', border: `1px solid ${selected || hovered ? '#c7ac6866' : '#a9bfd533'}`, borderRadius: 6, padding: '4px 7px', background: '#07121ee8', letterSpacing: '0.02em', fontSize: selected || hovered ? 11 : 10 }}>{tower.name}</span>}
      </button>
    </Html>
  );
}

function SurfaceRing({ selected, height, reducedMotion, mobile, arrivalRevision }: { selected: boolean; height: number | null; reducedMotion: boolean; mobile: boolean; arrivalRevision: number }) {
  const mesh = useRef<Mesh>(null);
  const pulse = useRef<Mesh>(null);
  const pulseMaterial = useRef<MeshBasicMaterial>(null);
  const started = useRef(performance.now());
  const { invalidate } = useThree();
  useEffect(() => { started.current = performance.now(); invalidate(); }, [selected, arrivalRevision, invalidate]);
  const worldPoint = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }) => {
    if (!mesh.current) return;
    mesh.current.getWorldPosition(worldPoint);
    const distance = camera.position.distanceTo(worldPoint);
    const worldPixel = camera instanceof PerspectiveCamera
      ? 2 * distance * Math.tan(camera.fov * Math.PI / 360) / Math.max(1, size.height)
      : 0.001;
    const radius = selected ? Math.max(0.002, Math.min(0.075, (height ?? 0.035) * 0.25)) : Math.min(0.009, Math.max(0.00025, worldPixel * 4));
    mesh.current.scale.setScalar(radius);
    if (pulse.current && pulseMaterial.current) {
      const progress = Math.min(1, (performance.now() - started.current) / (mobile ? 1700 : 2400));
      pulse.current.visible = selected && !reducedMotion && progress < 1;
      pulse.current.scale.setScalar(radius * (1.08 + progress * 1.8));
      pulseMaterial.current.opacity = (1 - progress) ** 1.5 * 0.85;
      if (pulse.current.visible) invalidate();
    }
  });
  return <><mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0013, 0]}>
    <ringGeometry args={[0.92, 1, 64]} />
    <meshBasicMaterial color={selected ? '#ffe1a0' : '#8fdde4'} transparent opacity={selected ? 0.85 : 0.38} depthWrite={false} toneMapped={false} />
  </mesh><mesh ref={pulse} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0015, 0]} visible={false}>
    <ringGeometry args={[0.955, 1, 64]} /><meshBasicMaterial ref={pulseMaterial} color="#83e3ec" transparent opacity={0} depthWrite={false} toneMapped={false} />
  </mesh></>;
}

function FocusOcclusion({groups,selectedId,enabled,reducedMotion}:{groups:Map<string,Group>;selectedId:string;enabled:boolean;reducedMotion:boolean}){
  const {gl,invalidate}=useThree();
  const cached=useRef({selectedId:'',close:false,camera:new Matrix4(),projection:new Matrix4(),layout:new Map<string,{matrix:Matrix4;body:Object3D|undefined;scale:number}>(),blocked:new Set<string>()});
  useFrame(({camera},delta)=>{
    camera.updateMatrixWorld();
    const selected=groups.get(selectedId),body=selected?.children.find(child=>child.userData.bodyPickProxy);
    const height=body?.scale.y??0;
    const close=enabled&&!!selected&&height>0&&camera.position.distanceTo(selected.position)<height*8;
    const previous=cached.current;
    let changed=selectedId!==previous.selectedId||close!==previous.close||!previous.camera.equals(camera.matrixWorld)||!previous.projection.equals(camera.projectionMatrix)||groups.size!==previous.layout.size;
    for(const[id,group]of groups){
      group.updateWorldMatrix(true,false);
      const body=group.children.find(child=>child.userData.bodyPickProxy),scale=body?.scale.y??0,old=previous.layout.get(id);
      if(!old||old.body!==body||old.scale!==scale||!old.matrix.equals(group.matrixWorld)){
        previous.layout.set(id,{matrix:group.matrixWorld.clone(),body,scale});changed=true;
      }
    }
    for(const id of previous.layout.keys())if(!groups.has(id))previous.layout.delete(id);
    if(changed){
      const trigger=TOWER_TRIGGERS[selectedId];
      previous.blocked=close?findFocusOccluders(groups,selectedId,camera,trigger?new Vector3(0,trigger.y,0):undefined):new Set();
      previous.selectedId=selectedId;previous.close=close;previous.camera.copy(camera.matrixWorld);previous.projection.copy(camera.projectionMatrix);
    }
    let changing=false;
    for(const[id,group]of groups){
      const goal=cached.current.blocked.has(id) ? .2 : 1,current=group.userData.focusOpacity??1;
      const value=advanceFocusOpacity(current,goal,delta,id===selectedId||reducedMotion);
      group.userData.focusOpacity=value;
      changing ||= Math.abs(goal-value)>=.002;
    }
    if(changing)invalidate();
    if(import.meta.env.DEV){
      gl.domElement.dataset.focusOcclusion=JSON.stringify({selectedId,close,blocked:[...cached.current.blocked],models:[...groups].map(([id,group])=>({id,scale:group.scale.toArray(),height:group.children.find(child=>child.userData.bodyPickProxy)?.scale.y,opacity:group.userData.focusOpacity??1}))});
    }
  },-0.5);
  return null;
}

function GlobeTower({ tower, radius, selected, onSelect, active, modelReady, shadowMaterial, exhibitScale, clusterIds, onClusterSelect, contactShadow, reducedMotion, mobile, neighbor, renderStyle, arrivalRevision, showLabels, labelRegistry, illuminationClock, weather, towerPlay, onTowerPlay, playRuntime, playDisabled, hatFlightPlan,partyPlan,waterPlan,focusGroups }: {
  tower: SceneTower; radius: number; selected: boolean; onSelect: (id: string) => void; active: boolean; shadowMaterial: MeshBasicMaterial;
  exhibitScale: number; clusterIds: string[]; onClusterSelect?: (ids: string[]) => void;
  contactShadow: boolean;
  reducedMotion: boolean; mobile: boolean;
  renderStyle: TowerRenderStyle; arrivalRevision: number;
  showLabels: boolean;
  labelRegistry: Map<string, HotspotLabelRegistration>;
  illuminationClock: SceneIlluminationClock;
  neighbor?: { tower: SceneTower; radius: number };
  weather?: EarthWeather | null;
  towerPlay?: WorldSceneProps['towerPlay']; onTowerPlay?: WorldSceneProps['onTowerPlay']; playRuntime: PlayRuntime; playDisabled: boolean;
  hatFlightPlan: HatFlightPlan;
  partyPlan:WorldShowPlan;waterPlan:WorldShowPlan;
  focusGroups:Map<string,Group>;
  modelReady: boolean;
}) {
  const height = exhibitTowerHeight(tower, exhibitScale);
  const modelGroup = useRef<Group>(null);
  const { gl } = useThree();
  useLayoutEffect(()=>{
    const group=modelGroup.current;if(!group)return;
    focusGroups.set(tower.id,group);
    return()=>{if(focusGroups.get(tower.id)===group)focusGroups.delete(tower.id);};
  },[tower.id,focusGroups]);
  const party=!!towerPlay?.effects.includes('party'),water=!!towerPlay?.effects.includes('water');
  const partyArrival=partyPlan.arrivals.get(tower.id)??0,waterArrival=waterPlan.arrivals.get(tower.id)??0;
  const floatRotation=useMemo(()=>new Quaternion(),[]);
  useFrame(()=>{
    if(!modelGroup.current)return;
    const age=effectSeconds(playRuntime,'water',reducedMotion),gain=water?showActivation(age,waterArrival,reducedMotion):0;
    const float=water&&!reducedMotion?Math.sin(age*1.4+tower.lon*.07)*(height??.1)*.026*gain:0;
    modelGroup.current.position.copy(anchor).addScaledVector(anchor.clone().normalize(),float);
    modelGroup.current.quaternion.copy(rotation);
    if(water&&!reducedMotion)modelGroup.current.quaternion.multiply(floatRotation.setFromAxisAngle(new Vector3(0,0,1),Math.sin(age*.9+tower.lat)*.01*gain));
    modelGroup.current.userData.echoFloat=float;
  });
  useFrame(({ camera, size }) => {
    if (!import.meta.env.DEV || !selected || !modelGroup.current) return;
    const body = modelGroup.current.children.find(child => child.userData.bodyPickProxy);
    const boxes = body?.userData.bodyPickVolumes as Box3[] | undefined;
    if (!body || !boxes?.length) return;
    body.updateWorldMatrix(true, false);
    const near = camera.position.clone(); body.worldToLocal(near);
    const atHeight = (height: number) => [...boxes].sort((a, b) => {
      const ac = a.getCenter(new Vector3()), bc = b.getCenter(new Vector3());
      return Math.abs(ac.y - height) - Math.abs(bc.y - height) || ac.distanceToSquared(near) - bc.distanceToSquared(near);
    })[0].getCenter(new Vector3());
    const rect = gl.domElement.getBoundingClientRect();
    const targets = [['middle', atHeight(0.52)], ['leg', atHeight(0.035)]] as const;
    gl.domElement.dataset.selectedBodyTargets = JSON.stringify(targets.map(([part, local]) => {
      const point = body.localToWorld(local).project(camera);
      return { id: tower.id, part, x: rect.left + (point.x + 1) * size.width / 2, y: rect.top + (1 - point.y) * size.height / 2 };
    }));
  });
  const modelHeight = modelReady && tower.modelKey && height !== null ? height : null;
  const anchor = useMemo(() => geoPosition(tower.lat, tower.lon, radius), [tower.lat, tower.lon, radius]);
  const rotation = useMemo(() => geoRotation(tower.lat, tower.lon), [tower.lat, tower.lon]);
  const tip = useMemo(() => geoPosition(tower.lat, tower.lon, radius + (modelHeight ?? 0) + (modelHeight ? Math.min(0.012, modelHeight * 0.055) : 0.015)), [tower.lat, tower.lon, radius, modelHeight]);
  const neighboringPoint = useMemo(() => {
    if (!neighbor) return undefined;
    const height = exhibitTowerHeight(neighbor.tower, exhibitScale) ?? 0;
    return { id: neighbor.tower.id, point: geoPosition(neighbor.tower.lat, neighbor.tower.lon, neighbor.radius + height + Math.min(0.012, height * 0.055)) };
  }, [neighbor, exhibitScale]);
  const shadowGeometry = useMemo(() => {
    if (modelHeight === null || !contactShadow) return null;
    const width = modelHeight * 0.65;
    const geometry = new PlaneGeometry(width, width, 8, 8);
    geometry.rotateX(-Math.PI / 2);
    const points = geometry.attributes.position;
    for (let index = 0; index < points.count; index += 1) {
      const x = points.getX(index), z = points.getZ(index);
      points.setY(index, Math.sqrt(Math.max(0, radius * radius - x * x - z * z)) - radius + 0.0004);
    }
    geometry.computeVertexNormals();
    return geometry;
  }, [modelHeight, radius, contactShadow]);
  useEffect(() => () => shadowGeometry?.dispose(), [shadowGeometry]);
  const click = (event: ThreeEvent<MouseEvent>) => {
    if (!active || event.button !== 0 || event.delta > 5) return;
    // Let a selected tower or its small play target receive a click through a faded obstruction.
    if (!selected && (modelGroup.current?.userData.focusOpacity??1)<.99) return;
    if (!isPointVisibleFromCamera(event.camera.position, event.point, EARTH_RADIUS)) return;
    event.stopPropagation();
    if (import.meta.env.DEV) Object.assign(gl.domElement.dataset, { lastBodyPickTower: tower.id, lastBodyPickKind: event.object.userData.bodyPickProxy ? 'body-volume' : 'geometry', lastBodyPickClusterSize: String(clusterIds.length), bodyPickCount: String(Number(gl.domElement.dataset.bodyPickCount ?? 0) + 1) });
    onSelect(tower.id);
  };
  return (
    <>
      <group ref={modelGroup} visible={active} position={anchor.toArray()} quaternion={rotation} onClick={click} userData={{ towerId: tower.id }}>
        {shadowGeometry && <mesh geometry={shadowGeometry} material={shadowMaterial} raycast={() => {}} dispose={null} />}
        {modelHeight !== null && <TowerModel tower={tower} height={modelHeight} detail={selected ? 'detail' : 'overview'} renderStyle={renderStyle} bodyPicking reducedMotion={reducedMotion} illuminationClock={illuminationClock} weather={weather} show={{runtime:playRuntime,party,water,partyArrival,waterArrival}} />}
        {modelHeight !== null && active && <TowerPlayDecoration tower={tower} selected={selected} height={modelHeight} state={towerPlay} onActivate={onTowerPlay} disabled={playDisabled} runtime={playRuntime} reduced={reducedMotion} plan={hatFlightPlan}/>}
        {selected && showLabels && <SurfaceRing selected={selected} height={modelHeight} reducedMotion={reducedMotion} mobile={mobile} arrivalRevision={arrivalRevision} />}
      </group>
      <TowerHotspot tower={tower} point={tip} selected={selected} onSelect={onSelect} active={active} clusterIds={clusterIds} onClusterSelect={onClusterSelect} neighboringPoint={neighboringPoint} showLabels={showLabels} labelRegistry={labelRegistry} mobile={mobile} />
    </>
  );
}

/** A visual link between members of the Eiffel family; these are not travel routes. */
function EchoArcs({ towers, selectedId, mobile, reducedMotion, isOverview }: {
  towers: SceneTower[]; selectedId: string; mobile: boolean; reducedMotion: boolean; isOverview: () => boolean;
}) {
  const group = useRef<Group>(null), started = useRef(0), wasVisible = useRef(false);
  const { invalidate, gl } = useThree();
  const arcs = useMemo(() => {
    // SceneTower currently carries this one landmark family. Accept new registered
    // models here; a future multi-family scene must pass an explicit family filter.
    const selected = towers.find((tower) => tower.id === selectedId && hasExhibitModel(tower));
    if (mobile || !selected) return [];
    const start = geoNormal(selected.lat, selected.lon);
    return towers.filter((tower) => tower.id !== selected.id && hasExhibitModel(tower) && angularDistance(selected, tower) > 0.12)
      .slice(0, 4).map((tower) => {
        const end = geoNormal(tower.lat, tower.lon), rotation = new Quaternion().setFromUnitVectors(start, end);
        const angle = start.angleTo(end), lift = Math.min(0.13, 0.04 + angle * 0.025);
        const points = Array.from({ length: 49 }, (_, index) => {
          const t = index / 48;
          return start.clone().applyQuaternion(new Quaternion().slerp(rotation, t)).multiplyScalar(1.009 + Math.sin(Math.PI * t) * lift);
        });
        return new TubeGeometry(new CatmullRomCurve3(points), 64, 0.0006, 4, false);
      });
  }, [towers, selectedId, mobile]);
  const material = useMemo(() => new MeshBasicMaterial({ color: '#d4bb80', transparent: true, opacity: 0.27, depthWrite: false, toneMapped: false }), []);
  useEffect(() => { started.current = performance.now(); invalidate(); return () => arcs.forEach((geometry) => geometry.dispose()); }, [arcs, invalidate]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    const visible = !!arcs.length && isOverview();
    if (group.current) group.current.visible = visible;
    if (visible && !wasVisible.current) started.current = performance.now();
    wasVisible.current = visible;
    const progress = reducedMotion ? 1 : Math.min(1, (performance.now() - started.current) / 1500);
    for (const geometry of arcs) geometry.setDrawRange(0, Math.floor((geometry.index?.count ?? 0) * progress / 6) * 6);
    if (visible && progress < 1) invalidate();
    if (import.meta.env.DEV) gl.domElement.dataset.relationshipArcCount = String(visible ? arcs.length : 0);
  });
  return <group ref={group} visible={false}>{arcs.map((geometry, index) => <mesh key={index} geometry={geometry} material={material} dispose={null} />)}</group>;
}

interface ComparisonItem { tower: SceneTower; x: number; y: number; height: number }

function comparisonLayout(towers: SceneTower[], ids: string[], kind: WorldSceneProps['comparisonKind'], portrait = false) {
  const available = ids.map((id) => towers.find((tower) => tower.id === id))
    .filter((tower): tower is SceneTower => !!tower && !!tower.modelKey && (kind === 'appearance' || (tower.modelScope !== 'visible-section' && hasUsableHeight(tower))));
  const heights = available.map((tower) => kind === 'appearance' ? 1.65 : tower.heightM! * COMPARISON_UNITS_PER_METER);
  const widths = heights.map((height) => Math.max(0.28, height * 0.72));
  if (portrait && kind === 'appearance' && available.length >= 3) {
    const rowWidth = widths[0] * 2 + .34;
    const items = available.map((tower, index) => ({ tower, height: heights[index],
      x: available.length === 3 && index === 2 ? 0 : (index % 2 === 0 ? -1 : 1) * (widths[0] + .34) / 2,
      y: index < 2 ? 2.30 : 0,
    }));
    return { items, width: rowWidth, height: 3.95 };
  }
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, available.length - 1) * 0.55;
  let cursor = -totalWidth / 2;
  const items: ComparisonItem[] = available.map((tower, index) => {
    const x = cursor + widths[index] / 2;
    cursor += widths[index] + 0.55;
    return { tower, x, y: 0, height: heights[index] };
  });
  return { items, width: Math.max(2.2, totalWidth), height: heights.length ? Math.max(0.35, ...heights) : 1.8 };
}

function ComparisonBuilding({ tower, height, view, renderStyle, reducedMotion, illuminationClock }: {
  tower: SceneTower; height: number; view: ModelView; renderStyle: TowerRenderStyle;
  reducedMotion: boolean; illuminationClock: SceneIlluminationClock;
}) {
  const group = useRef<Group>(null);
  const initialized = useRef(false);
  const transition = useRef<{ from: number; to: number; startedAt: number } | null>(null);
  const { invalidate, gl } = useThree();
  const yaw = COMPARISON_VIEW_POSES[view].yaw;
  useLayoutEffect(() => {
    const building = group.current;
    if (!building) return;
    building.userData.comparisonId = tower.id;
    building.userData.comparisonYawTarget = yaw;
    if (!initialized.current || reducedMotion) {
      building.rotation.y = yaw;
      transition.current = null;
    } else {
      transition.current = Math.abs(building.rotation.y - yaw) > 0.0001
        ? { from: building.rotation.y, to: yaw, startedAt: performance.now() } : null;
    }
    initialized.current = true;
    building.userData.comparisonTurning = !!transition.current;
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [yaw, reducedMotion, tower.id, gl, invalidate]);
  useFrame(() => {
    const path = transition.current, building = group.current;
    if (!path || !building) return;
    const progress = Math.min(1, (performance.now() - path.startedAt) / 650);
    building.rotation.y = path.from + (path.to - path.from) * easeCamera(progress);
    gl.shadowMap.needsUpdate = true;
    if (progress >= 1) {
      transition.current = null;
      building.userData.comparisonTurning = false;
    } else invalidate();
  });
  return <group ref={group}>
    <TowerModel tower={tower} height={height} detail="detail" renderStyle={renderStyle} reducedMotion={reducedMotion} illuminationClock={illuminationClock} />
  </group>;
}

function ComparisonStage({ layout, selectedId, onSelect, onRemove, kind, active, renderStyle, showLabels, reducedMotion, illuminationClock, view,uiTheme='dark' }: {
  layout: ReturnType<typeof comparisonLayout>; selectedId: string; onSelect: (id: string) => void;
  kind: WorldSceneProps['comparisonKind']; active: boolean;
  onRemove?: (id: string) => void;
  renderStyle: TowerRenderStyle;
  showLabels: boolean;
  reducedMotion: boolean; illuminationClock: SceneIlluminationClock;
  view: ModelView;uiTheme?:'dark'|'light';
}) {
  const { size } = useThree();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(hoverTimer.current), []);
  const frame = comparisonFrame(layout.width, layout.height, size.width, size.height, kind !== 'appearance');
  const pixelsPerUnit = size.width / (2 * frame.halfHeight * frame.aspect);
  const labelWidth = (id: string, x: number, y: number) => {
    const gaps = layout.items.filter(item => item.tower.id !== id && item.y === y).map(item => Math.abs(item.x - x));
    return Math.max(44, Math.min(160, Math.min(...gaps) * pixelsPerUnit - 8));
  };
  const ticks = useMemo(() => {
    if (kind === 'appearance') return [];
    const maxMeters = layout.height / COMPARISON_UNITS_PER_METER;
    const step = maxMeters > 200 ? 50 : 20;
    return Array.from({ length: Math.floor(maxMeters / step) + 1 }, (_, index) => index * step);
  }, [kind, layout.height]);
  return (
    <group visible={active}>
      {[...new Set(layout.items.length ? layout.items.map(item => item.y) : [0])].map(y => <mesh key={y} rotation={[-Math.PI / 2, 0, 0]} position={[0, y -0.012, 0]} receiveShadow>
        <planeGeometry args={[layout.width + 1.5, 3]} />
        <meshStandardMaterial color={uiTheme==='light'?'#d0dee8':'#142331'} roughness={0.87} metalness={0.1} />
      </mesh>)}
      {ticks.map((meters) => <group key={meters} position={[0, meters * COMPARISON_UNITS_PER_METER, -0.4]}>
        <mesh>
          <boxGeometry args={[layout.width + 0.4, 0.004, 0.002]} />
          <meshBasicMaterial color="#8ca8bc" transparent opacity={meters === 0 ? 0.5 : 0.15} />
        </mesh>
        {active && showLabels && <Html position={[-layout.width / 2 - 0.24, 0, 0]} center zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}>
          <span style={{ color: '#8eabc2', fontSize: 10, whiteSpace: 'nowrap' }}>{meters} m</span>
        </Html>}
      </group>)}
      {layout.items.map(({ tower, x, y, height }, index) => <group key={tower.id} position={[x, y, 0]}
        onPointerOver={() => { clearTimeout(hoverTimer.current); setHoveredId(tower.id); }}
        onPointerOut={() => { clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => setHoveredId(null), 800); }}
        onClick={(event) => {
        if (!active || event.delta > 5) return;
        event.stopPropagation(); onSelect(tower.id);
      }}>
        <ComparisonBuilding tower={tower} height={height} view={view} renderStyle={renderStyle} reducedMotion={reducedMotion} illuminationClock={illuminationClock} />
        {active && onRemove && <Html position={[Math.max(.14, height * .28), height + .10, 0]} center zIndexRange={[19, 0]}>
          <ComparisonRemoveButton name={tower.name} onRemove={() => onRemove(tower.id)} visible={hoveredId === tower.id}/>
        </Html>}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
          <ringGeometry args={[Math.max(0.11, height * 0.23), Math.max(0.12, height * 0.23 + 0.013), 48]} />
          <meshBasicMaterial color={tower.id === selectedId ? '#d8ab65' : '#5c7a8e'} transparent opacity={0.65} />
        </mesh>
        {active && <Html position={[0, -0.18, 0]} center zIndexRange={[18, 0]}>
          <button type="button" title={tower.name} onClick={() => onSelect(tower.id)} className="comparison-scene-label" style={{ border: 0, background: 'transparent', color: tower.id === selectedId ? '#edc47e' : '#d0deeb', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: labelWidth(tower.id,x,y) }}>
            <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tower.name}</span>
            {tower.heightM !== null && tower.modelScope !== 'visible-section' && <small style={{ display: 'block', opacity: .65, fontSize: 9 }}>{tower.heightText ?? `${tower.heightM.toLocaleString('en', {maximumFractionDigits:1})} m`}</small>}
          </button>
        </Html>}
      </group>)}
    </group>
  );
}

const SceneContents = forwardRef<WorldSceneHandle, WorldSceneProps & { mobile: boolean; atlas: EarthAtlas | null; atlasStatus: EarthAtlasStatus; onDetailViewChange: (close: boolean) => void }>(function SceneContents(props, ref) {
  const { towers, selectedId, comparisonIds, viewMode, comparisonKind, comparisonView = 'axonometric', reducedMotion, onSelect, onReady, mobile, earthStyle: requestedEarthStyle = 'day', renderStyle = 'heritage', exhibitScale = 1, onClusterSelect, showLabels = true, animationSuspended = false } = props;
  const { size, set, invalidate, gl, events } = useThree();
  const [firstFrame, setFirstFrame] = useState(false);
  const showConnections = false;
  const environment = resolveEnvironment(requestedEarthStyle, props.skyPreset);
  const coverage = cloudCoverage(environment);
  const surfaceStyle = requestedEarthStyle === 'day' && environment === 'night' ? 'night' : requestedEarthStyle;
  const earthStyle = surfaceStyle === 'satellite' && !props.atlas ? 'day' : surfaceStyle;
  const activeAtlas = earthStyle === 'satellite' ? props.atlas : null;
  // Idle prefetch must not rebuild the simple globe or its towers during a focus flight.
  const detailAtlas = requestedEarthStyle === 'satellite' || coverage > 0 ? props.atlas : null;
  const hasDetailAtlas = !!detailAtlas;
  // Replace the shared sampler without rebuilding every tower's GPU materials.
  const weather = useMemo(() => detailAtlas ? createEarthWeather(detailAtlas.surface) : null, [hasDetailAtlas]);
  useLayoutEffect(()=>{if(weather&&detailAtlas){weather.earthSurface.value=detailAtlas.surface;invalidate();}},[weather,detailAtlas,invalidate]);
  const lastDetailView = useRef(false);
  const { land: landData, surface: surfaceStage } = useProgressiveLand(firstFrame);
  const planet = useMemo(() => createPlanetSurface(activeAtlas?.color ?? null, activeAtlas?.height ?? null, mobile, earthStyle, landData, detailAtlas ?? undefined, weather ?? undefined), [activeAtlas, mobile, earthStyle, landData, detailAtlas, weather]);
  const focusAnchor = useMemo(() => {
    const tower = towers.find(item => item.id === selectedId);
    return tower ? geoPosition(tower.lat, tower.lon, planet.radiusAt(tower.lat, tower.lon)) : new Vector3();
  }, [towers, selectedId, planet]);
  const solarDirection = useMemo(() => earthSunDirection(earthStyle, props.skyPreset, focusAnchor), [earthStyle, props.skyPreset, focusAnchor]);
  const clusters = useMemo(() => clusterTowers(towers, selectedId, exhibitScale), [towers, selectedId, exhibitScale]);
  const globeEntries = useMemo(() => {
    const entries = clusters.map((cluster) => ({ tower: cluster.representative, ids: cluster.members.map((member) => member.id) }));
    const selected = towers.find((tower) => tower.id === selectedId);
    // A selected, unmodeled member keeps its exact map point without replacing the neighboring model.
    if (selected && !entries.some((entry) => entry.tower.id === selected.id)) {
      const cluster = clusters.find((item) => item.members.some((member) => member.id === selected.id));
      entries.push({ tower: selected, ids: cluster?.members.map((member) => member.id) ?? [selected.id] });
    }
    return entries;
  }, [clusters, selectedId, towers]);
  const exhibitedTowers = useMemo(() => globeEntries.map((entry) => entry.tower), [globeEntries]);
  const labelRegistry = useMemo(() => new Map<string, HotspotLabelRegistration>(), []);
  const focusGroups = useMemo(() => new Map<string,Group>(),[]);
  const previewScale = useRef<number | null>(null);
  useLayoutEffect(() => {
    previewScale.current = null;
    for (const group of focusGroups.values()) group.scale.setScalar(1);
  }, [exhibitScale, focusGroups]);
  const illuminationClock = useMemo<SceneIlluminationClock>(() => ({ seconds: 0, ticks: 0 }), []);
  const playRuntime = useMemo<PlayRuntime>(() => ({ age: 99, effect: null, cancelled: false,seconds:0,started:{hats:-100,party:-100,water:-100} }), []);
  const [playTransitionActive, setPlayTransitionActive] = useState(false);
  const playTour = useRef<{ position:Vector3; target:Vector3; up:Vector3; radius:number } | null>(null);
  const showTowers=useMemo(()=>exhibitedTowers.filter(tower=>tower.modelKey).map(tower=>({id:tower.id,lat:tower.lat,lon:tower.lon,height:exhibitTowerHeight(tower,exhibitScale)??.1,radius:planet.radiusAt(tower.lat,tower.lon)+.0006})),[exhibitedTowers,exhibitScale,planet]);
  const showOrigins=useMemo(()=>props.playOrigins?.map(tower=>({id:tower.id,lat:tower.lat,lon:tower.lon,height:exhibitTowerHeight(tower,exhibitScale)??.1,radius:planet.radiusAt(tower.lat,tower.lon)+.0006}))??showTowers,[props.playOrigins,showTowers,exhibitScale,planet]);
  const hatFlightPlan=useMemo(()=>createHatFlightPlan(showTowers,showOrigins.find(t=>t.id==='us-paris-texas')),[showTowers,showOrigins]);
  const partyPlan=useMemo(()=>createWorldShowPlan(showTowers,showOrigins.find(t=>t.id==='us-las-vegas-paris'),'party'),[showTowers,showOrigins]);
  const waterPlan=useMemo(()=>createWorldShowPlan(showTowers,showOrigins.find(t=>t.id==='id-rawa-pening-bamboo'),'water'),[showTowers,showOrigins]);
  const playRevealAge = useRef(0);
  const playParty = viewMode === 'globe' && !!props.towerPlay?.effects.includes('party');
  const globeRenderStyle = playParty ? 'illuminated' : renderStyle;
  const globeShowLabels = showLabels && !(playTransitionActive && !reducedMotion);
  useEffect(() => { setPlayTransitionActive(!!props.towerPlayAction); playTour.current = null; }, [props.towerPlayAction]);
  const settlePlay = useCallback(() => setPlayTransitionActive(false), []);
  const labelNeighbors = useMemo(() => {
    const result = new Map<string, { tower: SceneTower; radius: number }>();
    if (!showLabels) return result;
    for (const tower of exhibitedTowers.filter(hasExhibitModel)) {
      const neighbor = exhibitedTowers.filter((other) => other.id !== tower.id && hasExhibitModel(other) && angularDistance(tower, other) < 0.04)
        .sort((a, b) => angularDistance(tower, a) - angularDistance(tower, b))[0];
      if (neighbor) result.set(tower.id, { tower: neighbor, radius: planet.radiusAt(neighbor.lat, neighbor.lon) + 0.0006 });
    }
    return result;
  }, [exhibitedTowers, planet, showLabels]);
  const shadowMaterial = useMemo(createContactShadowMaterial, []);
  const controls = useRef<CameraControlsImpl>(null);
  const planetMesh = useRef<Mesh>(null);
  const navigation = useRef<CameraNavigation | null>(null);
  const pendingTarget = useRef<string | null>(null);
  const lastFocusProgress = useRef<FocusProgress & { reportedAt: number } | null>(null);
  const [arrivalFeedback, setArrivalFeedback] = useState({ id: '', revision: 0 });
  const cameraMode = useRef<'overview' | 'focus'>('overview');
  const freeBrowse = useRef(false);
  const userGestureActive = useRef(false);
  const surfaceSafetyCorrections = useRef(0);
  const surfaceSafetyMode = useRef('none');
  const ready = useRef(false);
  const previousSelected = useRef(selectedId);
  const previousExhibitScale = useRef(exhibitScale);
  const previousViewMode = useRef(viewMode);
  const viewport = useRef(size);
  viewport.current = size;
  const latestProps = useRef(props);
  latestProps.current = props;
  const tallestHeight = Math.max(0, ...towers.map((tower) => tower.modelKey ? exhibitTowerHeight(tower, exhibitScale) ?? 0 : 0));
  const envelope = EARTH_RADIUS + LAND_RELIEF + tallestHeight + 0.035;
  const globeCamera = useMemo(() => {
    const camera = new PerspectiveCamera(FOV, 1, 0.004, 100);
    camera.position.copy(HOME_DIRECTION).multiplyScalar(4);
    camera.lookAt(0, 0, 0);
    return camera;
  }, []);
  const progressiveTowers = useMemo(() => globeEntries.map(entry => entry.tower).filter(hasExhibitModel), [globeEntries]);
  const loadedModels = useProgressiveModels(progressiveTowers, selectedId, globeCamera, firstFrame && surfaceStage !== 'outline' && props.dataReady !== false, mobile, animationSuspended);
  const loadedModelCount = progressiveTowers.filter(tower => loadedModels.has(tower.id)).length;
  useEffect(() => {
    gl.domElement.dataset.surfaceStage = surfaceStage;
    gl.domElement.dataset.modelsLoaded = String(loadedModelCount);
    gl.domElement.dataset.modelsTotal = String(progressiveTowers.length);
    props.onLoadProgress?.({ surface: surfaceStage, loadedModels: loadedModelCount, totalModels: progressiveTowers.length });
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [surfaceStage, loadedModelCount, progressiveTowers.length, props.onLoadProgress, gl, invalidate]);
  const compareCamera = useMemo(() => new OrthographicCamera(-2, 2, 2, -2, 0.01, 100), []);
  const activeCamera = viewMode === 'globe' ? globeCamera : compareCamera;
  useEffect(()=>{if(viewMode!=='globe'){playRuntime.cancelled=true;playTour.current=null;globeCamera.fov=FOV;globeCamera.zoom=1;globeCamera.updateProjectionMatrix();}},[viewMode,playRuntime,globeCamera]);
  const controlMode = viewMode === 'comparison' ? comparisonKind : 'globe';
  const layout = useMemo(() => comparisonLayout(towers, comparisonIds, comparisonKind, mobile && size.width < size.height), [towers, comparisonIds, comparisonKind, mobile, size.width, size.height]);
  const comparisonViewport = useMemo(() => comparisonFrame(layout.width, layout.height, size.width, size.height, comparisonKind !== 'appearance'), [layout.width, layout.height, size.width, size.height, comparisonKind]);
  const comparisonInitialized = useRef(false);
  const hasDynamicIllumination = useMemo(() => (viewMode === 'globe' ? exhibitedTowers : layout.items.map(item => item.tower))
    .some(tower => tower.modelKey && getTowerIllumination(tower.modelKey).programme.mode !== 'static'), [viewMode, exhibitedTowers, layout]);
  const cameraScratch = useMemo(() => new Vector3(), []);

  useEffect(() => {
    // The lights and buildings are stationary while the camera moves. Render
    // their shadow map after scene changes rather than on every orbit frame.
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [gl, invalidate, selectedId, viewMode, comparisonKind, comparisonIds, mobile, earthStyle, renderStyle, exhibitScale, props.skyPreset]);

  useEffect(() => () => { planet.dispose(); }, [planet]);
  useEffect(() => () => { shadowMaterial.map?.dispose(); shadowMaterial.dispose(); }, [shadowMaterial]);
  useEffect(() => () => {
    navigation.current = null;
    controls.current?.stop();
  }, []);

  const reportFocusProgress = useCallback((state: FocusProgress, force = false) => {
    const now = performance.now();
    const previous = lastFocusProgress.current;
    // React/UI progress does not need to update at the render frame rate.
    if (!force && previous?.id === state.id && previous.phase === state.phase && now - previous.reportedAt < 80) return;
    lastFocusProgress.current = { ...state, reportedAt: now };
    latestProps.current.onFocusProgress?.(state);
  }, []);

  const cancelTransition = useCallback((stop = true, report = true) => {
    const id = pendingTarget.current;
    if (import.meta.env.DEV && id) Object.assign(gl.domElement.dataset, {
      lastCancelledFocus: id, focusCancelStack: new Error().stack?.split('\n').slice(1,4).join(' | ') ?? '',
    });
    navigation.current = null;
    pendingTarget.current = null;
    if (stop) controls.current?.stop();
    if (report && id) reportFocusProgress({ id, phase: 'idle', progress: 0 }, true);
  }, [reportFocusProgress, gl]);

  const releaseForBrowsing = useCallback((stop: boolean, notify: boolean) => {
    if (notify) { playRuntime.cancelled = true; playTour.current = null; setPlayTransitionActive(false); }
    if (pendingTarget.current) cancelTransition(stop);
    if (latestProps.current.viewMode === 'globe' && !freeBrowse.current) {
      const control = controls.current;
      control?.setOrbitPoint(0, 0, 0);
      if (control) {
        control.minPolarAngle = 0.001;
        control.maxPolarAngle = Math.PI - 0.001;
        control.minDistance = MIN_CAMERA_RADIUS;
        control.maxDistance = 9;
        control.update(0);
      }
      cameraMode.current = 'overview';
      freeBrowse.current = true;
    }
    if (notify) {
      latestProps.current.onUserInteract?.();
    }
    invalidate();
  }, [cancelTransition, invalidate]);

  // Fit the planet with room for its radial buildings, rather than an empty
  // bounding sphere at the maximum tower height in every direction.
  const globalViewDistance = useCallback(() => fitSphereDistance(EARTH_RADIUS + LAND_RELIEF + (viewport.current.width < 760 ? 0.26 : 0.13), FOV, viewport.current.width / Math.max(1, viewport.current.height)) * 1.045, []);

  const finishNavigation = useCallback((destination: Vector3, target: Vector3, up: Vector3, mode: 'overview' | 'focus') => {
    const control = controls.current;
    if (!control) return;
    globeCamera.up.copy(up);
    control.updateCameraUp();
    control.minPolarAngle = 0.001;
    control.maxPolarAngle = Math.PI - 0.001;
    control.minDistance = mode === 'focus' ? 0.075 : envelope + 0.1;
    control.maxDistance = 9;
    control.setFocalOffset(0, 0, 0, false);
    control.normalizeRotations().setLookAt(destination.x, destination.y, destination.z, target.x, target.y, target.z, false);
    control.update(0);
    // Release the landmark as a fixed orbit anchor without moving the arrival
    // camera or changing its view. Dragging can continue around the whole world.
    if (mode === 'focus') {
      control.setOrbitPoint(0, 0, 0);
      control.update(0);
    }
    const id = pendingTarget.current;
    cameraMode.current = mode;
    freeBrowse.current = false;
    navigation.current = null;
    pendingTarget.current = null;
    if (mode === 'focus' && id) {
      setArrivalFeedback((previous) => ({ id, revision: previous.revision + 1 }));
      reportFocusProgress({ id, phase: 'arrived', progress: 1 }, true);
    } else {
      reportFocusProgress({ id: id ?? '', phase: 'idle', progress: 0 }, true);
    }
    invalidate();
  }, [globeCamera, envelope, invalidate, reportFocusProgress]);

  const beginNavigation = useCallback((destination: Vector3, target: Vector3, up: Vector3, mode: 'overview' | 'focus', id: string) => {
    cancelTransition(true, false);
    const control = controls.current;
    if (!control) return;
    control.zoomTo(1,false);
    pendingTarget.current = id;
    if (latestProps.current.reducedMotion) {
      finishNavigation(destination, target, up, mode);
      return;
    }
    // A finite path driven by demand frames avoids waiting for CameraControls'
    // rest event, which can stay unresolved after an interrupted transition.
    const startPosition = globeCamera.position.clone();
    const startTarget = control.getTarget(new Vector3(), false);
    if (control.getFocalOffset(new Vector3(), false).lengthSq() > 1e-12) {
      // setOrbitPoint keeps the close-up through an offset. Capture its actual
      // view ray before clearing that offset for the next deterministic flight.
      const forward = globeCamera.getWorldDirection(new Vector3());
      const depth = Math.max(0.075, forward.dot(startTarget.clone().sub(startPosition)));
      startTarget.copy(startPosition).addScaledVector(forward, depth);
    }
    control.setFocalOffset(0, 0, 0, false);
    control.setLookAt(startPosition.x, startPosition.y, startPosition.z, startTarget.x, startTarget.y, startTarget.z, false);
    control.update(0);
    const startDirection = startPosition.clone().normalize();
    const orbitAngle = startDirection.angleTo(destination.clone().normalize());
    const local = mode === 'focus' && cameraMode.current === 'focus' && orbitAngle < 0.24;
    const duration = local ? 1000 + orbitAngle * 1400 : 2000 + orbitAngle / Math.PI * 650;
    navigation.current = {
      id, startedAt: performance.now(), duration, local, startPosition, startTarget,
      startUp: globeCamera.up.clone().normalize(), destination, target, up,
      transitRadius: Math.max(SAFE_TRANSIT_RADIUS, startPosition.length(), destination.length()),
      orbit: new Quaternion().setFromUnitVectors(startDirection, destination.clone().normalize()), mode,
    };
    reportFocusProgress({ id, phase: local ? 'approach' : 'lift', progress: 0 }, true);
    // Pose interpolation uses exact controller writes; free dragging constraints
    // are restored only after arrival, so changing the up basis cannot clamp it.
    control.minPolarAngle = 0.001;
    control.maxPolarAngle = Math.PI - 0.001;
    control.minDistance = MIN_CAMERA_RADIUS;
    control.maxDistance = 9;
    invalidate();
  }, [cancelTransition, finishNavigation, globeCamera, invalidate, reportFocusProgress]);

  const resetView = useCallback(() => {
    playRuntime.cancelled = true; playTour.current = null;
    globeCamera.fov=FOV;globeCamera.updateProjectionMatrix();
    cancelTransition();
    const control = controls.current;
    if (!control) return;
    if (latestProps.current.viewMode === 'comparison') {
      compareCamera.zoom = 1;
      compareCamera.updateProjectionMatrix();
      const pose = comparisonCameraPose(layout.height, comparisonViewport.centerOffset, latestProps.current.comparisonView ?? 'axonometric');
      control.setFocalOffset(0, 0, 0, false);
      control.setLookAt(0, pose.y, pose.z, 0, pose.targetY, 0, !latestProps.current.reducedMotion);
      invalidate();
      return;
    }
    beginNavigation(HOME_DIRECTION.clone().multiplyScalar(globalViewDistance()), new Vector3(), GLOBAL_UP.clone(), 'overview', '__overview__');
  }, [cancelTransition, compareCamera, layout.height, comparisonViewport, globalViewDistance, beginNavigation, invalidate]);

  const revealPlay = useCallback(() => {
    if (latestProps.current.viewMode !== 'globe') return;
    controls.current?.zoomTo(1,false);
    const normal = globeCamera.position.clone().normalize();
    const radius = globalViewDistance();
    playRevealAge.current = playRuntime.age;
    if(playRuntime.effect&&!latestProps.current.reducedMotion){
      cancelTransition(true,false);
      playTour.current={position:globeCamera.position.clone(),target:globeCamera.position.clone().addScaledVector(globeCamera.getWorldDirection(new Vector3()),.25),up:globeCamera.up.clone(),radius};
      cameraMode.current='overview';freeBrowse.current=false;invalidate();return;
    }
    beginNavigation(normal.multiplyScalar(radius), new Vector3(), GLOBAL_UP.clone(), 'overview', '__echo__');
    // A radial pullback keeps the initiating tower in view without the usual travel arc.
    if (navigation.current) { navigation.current.local = true; navigation.current.duration = 1350; }
  }, [globeCamera, globalViewDistance, beginNavigation, cancelTransition, invalidate, playRuntime]);

  useEffect(()=>{
    if(!reducedMotion||!playTour.current)return;
    const radius=playTour.current.radius;playTour.current=null;globeCamera.fov=FOV;globeCamera.updateProjectionMatrix();
    const end=playRuntime.effect==='party'?partyPlan.endNormal:playRuntime.effect==='water'?waterPlan.endNormal:hatFlightPlan.endNormal;
    finishNavigation(end.clone().multiplyScalar(radius),new Vector3(),GLOBAL_UP.clone(),'overview');
  },[reducedMotion,hatFlightPlan,partyPlan,waterPlan,playRuntime,globeCamera,finishNavigation]);

  const focusTower = useCallback((id: string) => {
    playRuntime.cancelled = true; playTour.current = null;
    globeCamera.fov=FOV;globeCamera.updateProjectionMatrix();
    if (import.meta.env.DEV) gl.domElement.dataset.lastRequestedFocus = id;
    const tower = latestProps.current.towers.find((item) => item.id === id);
    const control = controls.current;
    if (!tower || !control || latestProps.current.viewMode !== 'globe') return;
    const normal = geoNormal(tower.lat, tower.lon);
    const height = tower.modelKey ? exhibitTowerHeight(tower, latestProps.current.exhibitScale ?? 1) ?? 0 : 0;
    const radius = planet.radiusAt(tower.lat, tower.lon);
    const narrowViewport = viewport.current.width < 760;
    // Leave the lower part of the canvas for the always-visible size controls.
    const target = normal.clone().multiplyScalar(radius + height * (narrowViewport ? 0.12 : 0.36));
    const front = new Vector3(0.28, 0, 1).normalize().applyQuaternion(geoRotation(tower.lat, tower.lon));
    const direction = front.multiplyScalar(0.94).addScaledVector(normal, 0.35).normalize();
    const distance = height > 0 ? Math.max(0.075, height * (narrowViewport ? 2.7 : 1.95)) : 0.48;
    const destination = target.clone().addScaledVector(direction, distance);
    beginNavigation(destination, target, normal, 'focus', id);
  }, [beginNavigation, planet]);

  useImperativeHandle(ref, () => ({
    previewScale: (value) => {
      if (!Number.isFinite(value)) return;
      previewScale.current = Math.max(.1, Math.min(1.6, value));
      for (const group of focusGroups.values()) group.scale.setScalar(previewScale.current / (latestProps.current.exhibitScale ?? 1));
      invalidate();
    },
    resetView,
    focusTower,
    zoomBy: (factor) => {
      if (!Number.isFinite(factor) || factor <= 0) return;
      releaseForBrowsing(true, true);
      const control = controls.current;
      if (!control) return;
      if (latestProps.current.viewMode === 'comparison') control.zoomTo(Math.max(0.6, Math.min(3.5, compareCamera.zoom / factor)), !latestProps.current.reducedMotion);
      else control.zoomTo(globeZoomAfterFactor(globeCamera.zoom,factor),!latestProps.current.reducedMotion);
      invalidate();
    },
    rotateBy: (radians) => {
      if (!Number.isFinite(radians)) return;
      releaseForBrowsing(true, true);
      controls.current?.rotate(radians, 0, !latestProps.current.reducedMotion);
      invalidate();
    },
  }), [resetView, focusTower, releaseForBrowsing, compareCamera, globeCamera, invalidate]);

  useEffect(() => {
    if (!showConnections && import.meta.env.DEV) gl.domElement.dataset.relationshipArcCount = '0';
    invalidate();
  }, [showLabels, showConnections, gl, invalidate]);

  useEffect(() => {
    // CameraControls intentionally leaves pointerdown uncancelled. Cancel only
    // the browser's middle-button mouse defaults, keeping pointer drag routing.
    const element = events.connected ?? gl.domElement;
    const preventMiddleDefault = (event: MouseEvent) => {
      if (event.button === 1 && event.cancelable) event.preventDefault();
    };
    element.addEventListener('mousedown', preventMiddleDefault, { capture: true, passive: false });
    element.addEventListener('auxclick', preventMiddleDefault, { capture: true, passive: false });
    return () => {
      element.removeEventListener('mousedown', preventMiddleDefault, true);
      element.removeEventListener('auxclick', preventMiddleDefault, true);
    };
  }, [events.connected, gl]);

  useEffect(()=>{
    const element=(events.connected??gl.domElement) as HTMLElement,pointers=new Map<number,{x:number;y:number}>();
    let started=false;
    let pinch:{distance:number;zoom:number}|null=null;
    const spread=()=>{const [a,b]=[...pointers.values()];return a&&b?Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)):1;};
    const down=(event:PointerEvent)=>{
      if(latestProps.current.viewMode!=='globe'||event.pointerType!=='touch')return;
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      started=false;
      pinch=pointers.size===2?{distance:spread(),zoom:globeCamera.zoom}:null;
    };
    const move=(event:PointerEvent)=>{
      const origin=pointers.get(event.pointerId);if(!origin)return;
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(latestProps.current.viewMode!=='globe'){pinch=null;return;}
      if(pointers.size===2){
        if(!pinch){pinch={distance:spread(),zoom:globeCamera.zoom};return;}
        if(!started){releaseForBrowsing(true,true);userGestureActive.current=true;started=true;}
        controls.current?.zoomTo(globeZoomAfterFactor(pinch.zoom,pinch.distance/spread()),false);
        invalidate();return;
      }
      else pinch=null;
    };
    const end=(event:PointerEvent)=>{
      if(!pointers.delete(event.pointerId))return;
      pinch=null;started=false;
    };
    const cancel=()=>{pointers.clear();pinch=null;started=false;};
    const visibility=()=>{if(document.hidden)cancel();};
    element.addEventListener('pointerdown',down);element.addEventListener('pointermove',move);element.addEventListener('pointerup',end);element.addEventListener('pointercancel',end);
    window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',visibility);
    return()=>{cancel();element.removeEventListener('pointerdown',down);element.removeEventListener('pointermove',move);element.removeEventListener('pointerup',end);element.removeEventListener('pointercancel',end);window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',visibility);};
  },[events.connected,gl,globeCamera,invalidate,releaseForBrowsing]);

  useLayoutEffect(() => {
    ready.current = false;
    set({ camera: activeCamera });
    invalidate();
  }, [activeCamera, set, invalidate]);

  useLayoutEffect(() => {
    globeCamera.aspect = size.width / Math.max(size.height, 1);
    globeCamera.updateProjectionMatrix();
    const { halfHeight } = comparisonViewport;
    compareCamera.left = -halfHeight * globeCamera.aspect;
    compareCamera.right = halfHeight * globeCamera.aspect;
    compareCamera.top = halfHeight;
    compareCamera.bottom = -halfHeight;
    compareCamera.updateProjectionMatrix();
    if (viewMode === 'comparison') {
      cancelTransition();
      compareCamera.up.copy(GLOBAL_UP);
      controls.current?.updateCameraUp();
      compareCamera.zoom = 1;
      compareCamera.updateProjectionMatrix();
    } else if (cameraMode.current === 'overview' && !freeBrowse.current) {
      const distance = globalViewDistance();
      const direction = globeCamera.position.clone().normalize();
      controls.current?.setLookAt(direction.x * distance, direction.y * distance, direction.z * distance, 0, 0, 0, false);
    }
    invalidate();
  }, [size.width, size.height, comparisonViewport, viewMode, globeCamera, compareCamera, cancelTransition, globalViewDistance, invalidate]);

  useLayoutEffect(() => {
    const interruptedPath = navigation.current;
    if (viewMode === 'globe' && reducedMotion && interruptedPath) {
      finishNavigation(interruptedPath.destination, interruptedPath.target, interruptedPath.up, interruptedPath.mode);
    } else {
      cancelTransition();
    }
    const control = controls.current;
    if (!control) return;
    control.smoothTime = reducedMotion ? 0 : 0.28;
    control.draggingSmoothTime = reducedMotion ? 0 : 0.09;
    const returningFromComparison = previousViewMode.current === 'comparison' && viewMode === 'globe';
    previousViewMode.current = viewMode;
    if (returningFromComparison) {
      cameraMode.current = 'overview';
      globeCamera.up.copy(GLOBAL_UP);
      control.updateCameraUp();
      control.setFocalOffset(0, 0, 0, false);
      const position = globeCamera.position.clone().normalize().multiplyScalar(globalViewDistance());
      control.setLookAt(position.x, position.y, position.z, 0, 0, 0, false);
    }
    if (viewMode === 'globe') {
      control.minZoom=MIN_GLOBE_ZOOM;
      control.maxZoom=MAX_GLOBE_ZOOM;
      if (cameraMode.current === 'overview') {
        globeCamera.up.copy(GLOBAL_UP);
        control.updateCameraUp();
        control.maxDistance = 9;
        control.minPolarAngle = 0.001;
        control.maxPolarAngle = Math.PI - 0.001;
      }
    } else {
      control.minZoom = 0.6;
      control.maxZoom = 3.5;
      control.minPolarAngle = 0.001;
      control.maxPolarAngle = Math.PI - 0.001;
    }
    invalidate();
  }, [viewMode, controlMode, reducedMotion, cancelTransition, globeCamera, globalViewDistance, invalidate]);

  useLayoutEffect(() => {
    if (viewMode !== 'comparison') { comparisonInitialized.current = false; return; }
    const control = controls.current;
    if (!control) return;
    const pose = comparisonCameraPose(layout.height, comparisonViewport.centerOffset, comparisonView);
    const animate = comparisonInitialized.current && !reducedMotion;
    comparisonInitialized.current = true;
    // A preset only writes a new destination once. Subsequent pointer orbit and
    // middle-button pan remain free; no frame callback pins this camera pose.
    control.stop();
    control.setFocalOffset(0, 0, 0, false);
    control.setLookAt(0, pose.y, pose.z, 0, pose.targetY, 0, animate);
    invalidate();
  }, [viewMode, comparisonView, reducedMotion, layout.height, comparisonViewport, invalidate]);

  useLayoutEffect(() => {
    // Display size can change every slider tick. Update the overview bound
    // without treating it as a view-mode change and canceling a focus flight.
    if (viewMode === 'globe' && cameraMode.current === 'overview' && !freeBrowse.current && !navigation.current && controls.current) {
      controls.current.minDistance = envelope + 0.1;
    }
  }, [envelope, viewMode]);

  useEffect(() => {
    if (previousSelected.current === selectedId) return;
    previousSelected.current = selectedId;
    if (viewMode === 'globe') focusTower(selectedId);
  }, [selectedId, viewMode, focusTower]);

  useEffect(() => {
    if (previousExhibitScale.current === exhibitScale) return;
    const previousScale = previousExhibitScale.current;
    previousExhibitScale.current = exhibitScale;
    const flight = navigation.current;
    const growingInFocus = exhibitScale > previousScale && viewMode === 'globe'
      && flight?.mode !== 'overview' && (cameraMode.current === 'focus' || flight?.mode === 'focus');
    if (growingInFocus) {
      const tower = towers.find((item) => item.id === selectedId);
      const height = tower && hasExhibitModel(tower) ? exhibitTowerHeight(tower, exhibitScale) : null;
      if (tower && height !== null) {
        // The existing camera can stay where it is when the enlarged model is
        // still comfortably framed. A small framing envelope covers the feet,
        // bridge and antenna without changing any model geometry or dimensions.
        const anchor = geoPosition(tower.lat, tower.lon, planet.radiusAt(tower.lat, tower.lon));
        const rotation = geoRotation(tower.lat, tower.lon);
        globeCamera.updateMatrixWorld();
        let safelyFramed = true;
        for (const y of [0, 1]) for (const x of [-0.55, 0.55]) for (const z of [-0.55, 0.55]) {
          const point = new Vector3(x * height, y * height, z * height).applyQuaternion(rotation).add(anchor).project(globeCamera);
          if (Math.abs(point.x) > 0.9 || Math.abs(point.y) > 0.86 || point.z <= -1 || point.z >= 1) safelyFramed = false;
        }
        // A pending flight was framed for the old height. Restart it with the
        // latest size; beginNavigation cancels the previous path and stays outside Earth.
        if (flight?.mode === 'focus' || !safelyFramed) focusTower(selectedId);
      }
    }
    // Shrinking keeps the current region visible; overview never jumps into a tower.
    invalidate();
  }, [exhibitScale, viewMode, selectedId, towers, planet, globeCamera, focusTower, invalidate]);

  useFrame((state) => {
    const detailView = viewMode==='globe' && requestedEarthStyle==='satellite' && globeCloseView(globeCamera.position.length(),globeCamera.zoom);
    if(detailView!==lastDetailView.current){lastDetailView.current=detailView;props.onDetailViewChange(detailView);}
    gl.domElement.dataset.earthRenderer=planet.realistic?'realistic-webgl-v2':'miniature-vector';
    gl.domElement.dataset.surfaceTextureWidth=String((detailAtlas?.surface.image as {width?:number}|undefined)?.width??0);
    gl.domElement.dataset.globeZoom=String(globeCamera.zoom);
    gl.domElement.dataset.globeCameraRadius=String(globeCamera.position.length());
    gl.domElement.dataset.globeCameraUp=JSON.stringify(globeCamera.up.toArray());
    gl.domElement.dataset.globeCameraPosition=JSON.stringify(globeCamera.position.toArray());
    gl.domElement.dataset.globeRotation='orbit';
    planet.setViewScale?.(globeCamera.zoom);
    if (previewScale.current !== null) for (const group of focusGroups.values()) group.scale.setScalar(previewScale.current / exhibitScale);
    if (viewMode === 'globe') planet.update?.(illuminationClock.seconds, solarDirection, state.camera.position.length(), coverage,
      environment === 'night' ? 0 : environment === 'dusk' ? .35 : 1, environment === 'golden' || environment === 'dusk' ? 1 : 0);
    if (!ready.current && controls.current) {
      ready.current = true;
      gl.domElement.dataset.firstFrameAtMs = performance.now().toFixed(1);
      setFirstFrame(true);
      onReady?.();
    }
    const path = navigation.current;
    const control = controls.current;
    if (path && control && viewMode === 'globe' && !(path.id === '__echo__' && (animationSuspended || document.hidden))) {
      const elapsed = path.id === '__echo__' ? (playRuntime.age-playRevealAge.current)*1000 : performance.now() - path.startedAt;
      const progress = Math.min(1, elapsed / path.duration);
      const phase: FocusProgress['phase'] = path.local ? 'approach' : progress < 0.15 ? 'lift' : progress < 0.625 ? 'orbit' : 'approach';
      reportFocusProgress({ id: path.id, phase, progress });
      if (elapsed >= path.duration) {
        finishNavigation(path.destination, path.target, path.up, path.mode);
      } else {
        let position: Vector3;
        let target: Vector3;
        let up: Vector3;
        if (path.local) {
          const t = easeCamera(progress);
          const rotation = new Quaternion().slerp(path.orbit, t);
          const radius = Math.max(MIN_CAMERA_RADIUS, path.startPosition.length() + (path.destination.length() - path.startPosition.length()) * t);
          position = path.startPosition.clone().normalize().applyQuaternion(rotation).multiplyScalar(radius);
          target = path.startTarget.clone().lerp(path.target, t);
          up = interpolateUp(path.startUp, path.up, t);
        } else if (progress < 0.15) {
          const t = easeCamera(progress / 0.15);
          const radius = path.startPosition.length() + (path.transitRadius - path.startPosition.length()) * t;
          position = path.startPosition.clone().normalize().multiplyScalar(radius);
          target = path.startTarget.clone().multiplyScalar(1 - t);
          up = interpolateUp(path.startUp, GLOBAL_UP, t);
        } else if (progress < 0.625) {
          const t = easeCamera((progress - 0.15) / 0.475);
          const rotation = new Quaternion().slerp(path.orbit, t);
          position = path.startPosition.clone().normalize().applyQuaternion(rotation).multiplyScalar(path.transitRadius);
          target = new Vector3();
          up = GLOBAL_UP;
        } else {
          const t = easeCamera((progress - 0.625) / 0.375);
          const radius = path.transitRadius + (path.destination.length() - path.transitRadius) * t;
          position = path.destination.clone().normalize().multiplyScalar(radius);
          target = path.target.clone().multiplyScalar(t);
          up = interpolateUp(GLOBAL_UP, path.up, t);
        }
        globeCamera.up.copy(up);
        control.updateCameraUp();
        control.setLookAt(position.x, position.y, position.z, target.x, target.y, target.z, false);
        control.update(0);
        invalidate();
      }
    }
    const tour = playTour.current;
    if (tour && control && viewMode === 'globe' && playRuntime.effect && !playRuntime.cancelled && !reducedMotion && !animationSuspended && !document.hidden && !navigation.current) {
      const age=playRuntime.age,hat=playRuntime.effect==='hats',enter=smoothFlight((age-playRevealAge.current)/(hat?.95:1.5));
      const exit=hat?smoothFlight((age-(HAT_FLIGHT_END-.15))/(HAT_SHOW_END-HAT_FLIGHT_END+.15)):0;
      const plan=playRuntime.effect==='party'?partyPlan:waterPlan;
      const pose=hat?hatChasePose(hatFlightPlan,Math.min(age,HAT_FLIGHT_END-.12)):worldShowPose(plan,age,tour.radius);
      const position=tour.position.clone().lerp(pose.position,enter);
      if(hat)position.lerp(hatFlightPlan.endNormal.clone().multiplyScalar(tour.radius),exit);
      const target=tour.target.clone().lerp(pose.target,enter).multiplyScalar(1-exit);
      const up=interpolateUp(tour.up,pose.up,enter).lerp(GLOBAL_UP,exit).normalize();
      if(position.length()<MIN_CAMERA_RADIUS+.02)position.setLength(MIN_CAMERA_RADIUS+.02);
      const duration=hat?HAT_SHOW_END:WORLD_SHOW_DURATION[plan.kind];
      globeCamera.fov=FOV+(hat?(mobile?15:22)*enter*(1-exit):(plan.kind==='water'?6:3)*Math.sin(Math.PI*Math.min(1,age/duration)));globeCamera.updateProjectionMatrix();
      globeCamera.up.copy(up); control.updateCameraUp();control.minDistance=.02;control.setFocalOffset(0,0,0,false);
      control.setLookAt(position.x,position.y,position.z,target.x,target.y,target.z,false);control.update(0);
      if(age>=duration){playTour.current=null;globeCamera.fov=FOV;globeCamera.updateProjectionMatrix();finishNavigation(position,new Vector3(),GLOBAL_UP.clone(),'overview');}
    }
    // Also guard direct wheel/drag input. Apply through the controller before
    // this frame renders or records its diagnostic pose.
    if (viewMode === 'globe' && control && globeCamera.position.length() < MIN_CAMERA_RADIUS) {
      cancelTransition(false);
      // A trucked target and setOrbitPoint's focal offset are part of the user's
      // view. Retreat along that view ray; never clear the offset or invent a
      // new forward-ray target when the camera reaches the planet surface.
      globeCamera.getWorldDirection(cameraScratch);
      const correction = cameraSurfaceDollyCorrection(globeCamera.position, cameraScratch, MIN_CAMERA_RADIUS + 1e-6);
      control.dollyTo(control.distance + correction, false);
      control.update(0);
      surfaceSafetyMode.current = 'view-ray-dolly';
      if (globeCamera.position.length() < MIN_CAMERA_RADIUS) {
        // Only an extreme translated orbit can hit the controller's max-distance
        // before reaching the surface. Translate the whole rig in that case,
        // preserving its orientation, offset and camera-to-target relationship.
        const safePosition = globeCamera.position.clone();
        if (safePosition.lengthSq() < 1e-12) safePosition.copy(cameraScratch).negate();
        safePosition.normalize().multiplyScalar(MIN_CAMERA_RADIUS + 1e-6);
        const shift = safePosition.sub(globeCamera.position);
        const target = control.getTarget(new Vector3(), false).add(shift);
        control.moveTo(target.x, target.y, target.z, false);
        control.update(0);
        surfaceSafetyMode.current = 'rig-translate-at-distance-limit';
      }
      surfaceSafetyCorrections.current += 1;
      invalidate();
    }
    if (import.meta.env.DEV) {
      let partyLit=0,waterTouched=0,partyInstances=0,waterInstances=0,floatSum=0;
      state.scene.traverse(object=>{
        if(viewMode==='globe'&&playParty&&object.userData.echoPartyGain>.1)partyLit++;
        if(viewMode==='globe'&&props.towerPlay?.effects.includes('water')&&object.userData.echoWaterGain>.1)waterTouched++;
        if(object.userData.echoInstances==='party')partyInstances=(object as import('three').InstancedMesh).count;
        if(object.userData.echoInstances==='water')waterInstances=(object as import('three').InstancedMesh).count;
        if(object.userData.towerId&&object.userData.echoFloat)floatSum+=Math.abs(object.userData.echoFloat);
      });
      Object.assign(gl.domElement.dataset,{echoPartyLit:String(partyLit),echoWaterTouched:String(waterTouched),echoPartyInstances:String(partyInstances),echoWaterInstances:String(waterInstances),echoFloatSum:String(floatSum),echoPartySeconds:String(effectSeconds(playRuntime,'party',reducedMotion)),echoWaterSeconds:String(effectSeconds(playRuntime,'water',reducedMotion)),echoCamera:playRuntime.cancelled?'manual':playTour.current?'show':'idle'});
      const target = controls.current?.getTarget(cameraScratch);
      const presentation = modelPresentation(cameraMode.current, exhibitScale, towers.find((tower) => tower.id === selectedId));
      const mountedModels = globeEntries.filter((entry) => hasExhibitModel(entry.tower) && loadedModels.has(entry.tower.id));
      const visibleModels = viewMode === 'globe' ? mountedModels.filter(({ tower }) => {
        const height = exhibitTowerHeight(tower, exhibitScale) ?? 0;
        const point = geoPosition(tower.lat, tower.lon, planet.radiusAt(tower.lat, tower.lon) + height * 0.65);
        const projected = point.clone().project(activeCamera);
        return isPointVisibleFromCamera(activeCamera.position, point, EARTH_RADIUS)
          && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && projected.z > -1 && projected.z < 1;
      }) : [];
      Object.assign(gl.domElement.dataset, {
        sceneMode: viewMode, cameraMode: cameraMode.current,
        cameraRadius: activeCamera.position.length().toFixed(5),
        echoCameraPosition: activeCamera.position.toArray().map(value => value.toFixed(6)).join(','),
        echoFov: String(globeCamera.fov),
        renderCameraRadius: state.camera.position.length().toFixed(5),
        activeCameraMatches: String(state.camera === activeCamera),
        cameraTarget: target ? target.toArray().map((value) => value.toFixed(5)).join(',') : '',
        cameraFocalOffset: control?.getFocalOffset(new Vector3(), false).toArray().map((value) => value.toFixed(5)).join(',') ?? '',
        cameraDistance: String(control?.distance ?? ''), minCameraRadius: String(MIN_CAMERA_RADIUS),
        navigating: pendingTarget.current ?? '', selectedTower: selectedId,
        navigationStage: path ? path.local ? 'approach' : (performance.now() - path.startedAt) / path.duration < 0.15 ? 'lift' : (performance.now() - path.startedAt) / path.duration < 0.625 ? 'orbit' : 'approach' : '',
        navigationProgress: path ? String(Math.min(1, (performance.now() - path.startedAt) / path.duration)) : '1',
        navigationDuration: path ? String(path.duration) : '',
        orbitAnchor: cameraMode.current === 'focus' && !path && !freeBrowse.current ? 'earth' : 'free',
        freeBrowse: String(freeBrowse.current),
        showLabels: String(showLabels), showConnections: String(showConnections),
        comparisonView, comparisonYaw: String(COMPARISON_VIEW_POSES[comparisonView].yaw),
        comparisonPitch: String(COMPARISON_VIEW_POSES[comparisonView].pitch), comparisonModelCount: String(layout.items.length),
        middleGesture: 'pan', wheelGesture: viewMode === 'globe' ? 'dolly' : 'zoom', userGestureActive: String(userGestureActive.current),
        surfaceSafetyCorrections: String(surfaceSafetyCorrections.current), surfaceSafetyMode: surfaceSafetyMode.current,
        minPolarAngle: String(control?.minPolarAngle ?? ''), maxPolarAngle: String(control?.maxPolarAngle ?? ''),
        renderCalls: String(gl.info.render.calls), triangles: String(gl.info.render.triangles),
        geometries: String(gl.info.memory.geometries), textures: String(gl.info.memory.textures),
        earthStyle, requestedEarthStyle, earthAtlasStatus: props.atlasStatus, earthRenderer: planet.realistic ? 'realistic-webgl-v1' : 'miniature-vector', environment, cloudCoverage: String(coverage),
        renderStyle, exhibitScale: String(exhibitScale), towerCount: String(towers.length), clusterCount: String(clusters.length),
        availableModelCount: String(towers.filter(hasExhibitModel).length), mountedModelCount: String(mountedModels.length),
        visibleModelCount: String(visibleModels.length), visibleModelIds: visibleModels.map(({ tower }) => tower.id).join(','), modelPresentation: presentation,
      });
    }
  });

  const selectTower = (id: string) => {
    if (id === selectedId && viewMode === 'globe') focusTower(id);
    onSelect(id);
  };
  // Wheel events have no controlstart/controlend. Notify every manual control
  // event; the parent's pause action is idempotent, including a rapid resume.
  const userControl = () => releaseForBrowsing(false, true);
  const userControlStart = () => { userGestureActive.current = true; releaseForBrowsing(true, true); };
  const actions = CameraControlsImpl.ACTION;
  return (
    <>
      <SceneIlluminationDriver clock={illuminationClock} active={(viewMode === 'globe' && (!!planet.realistic || (!!planet.update && coverage > 0) || playTransitionActive || playParty || !!props.towerPlay?.effects.includes('water'))) || ((viewMode === 'globe' ? globeRenderStyle : renderStyle) === 'illuminated' && hasDynamicIllumination)} mobile={mobile} reducedMotion={reducedMotion} suspended={animationSuspended} />
      <WorldPlaySequence runtime={playRuntime} action={props.towerPlayAction} reduced={reducedMotion} suspended={animationSuspended || viewMode !== 'globe'} onReveal={revealPlay} onSettled={settlePlay}/>
      <Space mobile={mobile} earthStyle={viewMode === 'comparison' ? renderStyle === 'illuminated' ? 'night' : 'day' : earthStyle} uiTheme={props.uiTheme} skyPreset={props.skyPreset} realistic={viewMode === 'globe' && !!planet.realistic} focusAnchor={viewMode === 'globe' ? focusAnchor : undefined}/>
      <CameraControls
        key={viewMode}
        ref={controls}
        camera={activeCamera}
        makeDefault
        mouseButtons={{ left: actions.ROTATE, middle: actions.TRUCK, right: actions.TRUCK, wheel: actions.ZOOM }}
        touches={{ one: actions.TOUCH_ROTATE, two: viewMode==='globe'?actions.TOUCH_TRUCK:actions.TOUCH_ZOOM_TRUCK, three: actions.TOUCH_TRUCK }}
        onControlStart={userControlStart}
        onControl={userControl}
        onControlEnd={() => { userGestureActive.current = false; }}
      />
      <group visible={viewMode === 'globe'}>
        <mesh ref={planetMesh} geometry={planet.geometry} material={planet.material} receiveShadow castShadow dispose={null} onClick={(event) => { if (viewMode === 'globe') event.stopPropagation(); }} />
        {planet.land && <mesh geometry={planet.land.geometry} material={planet.land.material} receiveShadow dispose={null} />}
        {planet.coast && <mesh geometry={planet.coast.geometry} material={planet.coast.material} receiveShadow dispose={null} />}
        {planet.layers?.map((layer, index) => <mesh key={index} geometry={layer.geometry} material={layer.material} renderOrder={layer.renderOrder} raycast={() => {}} dispose={null} />)}
        {globeEntries.map(({ tower, ids }) => <GlobeTower key={tower.id} tower={tower} modelReady={loadedModels.has(tower.id)} radius={planet.radiusAt(tower.lat, tower.lon) + 0.0006} selected={tower.id === selectedId} onSelect={selectTower} active={viewMode === 'globe'} shadowMaterial={shadowMaterial} exhibitScale={exhibitScale} clusterIds={ids} onClusterSelect={onClusterSelect} contactShadow={!!planet.update} reducedMotion={reducedMotion} mobile={mobile} neighbor={labelNeighbors.get(tower.id)} renderStyle={globeRenderStyle} arrivalRevision={arrivalFeedback.id === tower.id ? arrivalFeedback.revision : 0} showLabels={globeShowLabels} labelRegistry={labelRegistry} illuminationClock={illuminationClock} weather={weather} towerPlay={props.towerPlay} onTowerPlay={props.onTowerPlay} playRuntime={playRuntime} playDisabled={animationSuspended || playTransitionActive} hatFlightPlan={hatFlightPlan} partyPlan={partyPlan} waterPlan={waterPlan} focusGroups={focusGroups} />)}
        {viewMode==='globe' && [partyPlan,waterPlan].filter(plan=>props.towerPlay?.effects.includes(plan.kind)).map(plan=><group key={plan.kind}><WorldShowField plan={plan} runtime={playRuntime} reduced={reducedMotion}/><WorldShowInstances plan={plan} towers={showTowers} runtime={playRuntime} reduced={reducedMotion}/></group>)}
        {viewMode==='globe' && !reducedMotion && props.towerPlayAction?.effect==='hats' && props.towerPlay?.effects.includes('hats') && <HatLightTrail plan={hatFlightPlan} runtime={playRuntime} reduced={reducedMotion}/>}
        <HotspotNameLayout registry={labelRegistry} showLabels={globeShowLabels} />
        <FocusOcclusion groups={focusGroups} selectedId={selectedId} enabled={viewMode==='globe'&&!playTransitionActive} reducedMotion={reducedMotion}/>
        {showConnections && <EchoArcs towers={exhibitedTowers} selectedId={selectedId} mobile={mobile} reducedMotion={reducedMotion} isOverview={() => viewMode === 'globe' && cameraMode.current === 'overview' && !navigation.current} />}
      </group>
      {viewMode === 'comparison' && <ComparisonStage layout={layout} selectedId={selectedId} onSelect={selectTower} onRemove={props.onRemoveComparison} kind={comparisonKind} active renderStyle={renderStyle} showLabels={showLabels} reducedMotion={reducedMotion} illuminationClock={illuminationClock} view={comparisonView} uiTheme={props.uiTheme}/>}
    </>
  );
});

const WorldScene = forwardRef<WorldSceneHandle, WorldSceneProps>(function WorldScene(props, ref) {
  const innerRef = useRef<WorldSceneHandle>(null);
  const [canRender,setCanRender] = useState(()=>supportsWebgl2());
  useEffect(()=>{
    if(canRender)return;
    const retry=()=>{if(supportsWebgl2(true))setCanRender(true);};
    const first=window.setTimeout(retry,1200),second=window.setTimeout(retry,3600);
    return()=>{clearTimeout(first);clearTimeout(second);};
  },[canRender]);
  const [sceneReady, setSceneReady] = useState(false);
  const [closeView,setCloseView]=useState(false);
  const satelliteRequested = props.viewMode === 'globe' && (props.earthStyle === 'satellite' || cloudCoverage(resolveEnvironment(props.earthStyle ?? 'day', props.skyPreset)) > 0);
  const { atlas, status: atlasStatus, detailStatus, retry } = useEarthAtlas(canRender && satelliteRequested, canRender && sceneReady, closeView);
  const onSceneReady = useCallback(() => {
    setSceneReady(true);
    props.onReady?.();
  }, [props.onReady]);
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px), (pointer: coarse)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px), (pointer: coarse)');
    const update = () => setMobile(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useImperativeHandle(ref, () => ({
    previewScale: (value) => innerRef.current?.previewScale?.(value),
    resetView: () => innerRef.current?.resetView(),
    zoomBy: (factor) => innerRef.current?.zoomBy(factor),
    rotateBy: (radians) => innerRef.current?.rotateBy(radians),
    focusTower: (id) => innerRef.current?.focusTower(id),
  }), []);
  useEffect(() => { if (!canRender) props.onReady?.(); }, [canRender, props.onReady]);
  if (!canRender) return <div className="scene-fallback" role="status"><h2>{t("继续探索铁塔资料")}</h2><p>{t("这台设备暂未能启用三维地球。实景照片、地图和标准正视图仍可查看。")}</p><button onClick={()=>setCanRender(supportsWebgl2(true))}>{t('重新尝试三维')}</button><a href="/catalog.html">{t("打开资料目录")}</a></div>;
  return (
    <><Canvas
      className="world-canvas"
      style={{ width: '100%', height: '100%', display: 'block' }}
      camera={{ position: [0, 0, 4], fov: FOV, near: 0.004, far: 100 }}
      dpr={[1, mobile ? 1.75 : 1.65]}
      shadows={mobile ? false : 'percentage'}
      frameloop="demand"
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      fallback={<div>{t("交互式三维地球；资料集也提供照片、来源和地图。")}</div>}
    >
      <Suspense fallback={null}><SceneContents ref={innerRef} {...props} mobile={mobile} atlas={atlas} atlasStatus={atlasStatus} onReady={onSceneReady} onDetailViewChange={setCloseView} /></Suspense>
    </Canvas>
    {!sceneReady && <GlobeLoading/>}
    {satelliteRequested && !atlas && <div className="satellite-status" role="status">
      {atlasStatus === 'failed' ? <>{t('地表细节暂未载入，可继续探索或重试')} <button type="button" onClick={retry}>{t('重试')}</button></> : t('地表细节载入中，可继续探索')}
    </div>}
    {satelliteRequested && closeView && atlas && detailStatus==='loading' && <div className="satellite-status" role="status">{t('近景地表正在细化，可以继续探索')}</div>}
    </>
  );
});

export default WorldScene;
