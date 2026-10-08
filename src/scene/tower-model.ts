import * as THREE from 'three';
import type { TowerRenderStyle } from '../types';
import modelBatch from '../../data/model-batch100.json' with { type: 'json' };
import localNightDesigns from '../../data/night-designs-20261007.json' with { type: 'json' };
import photoNightReferences from '../../data/night-photo-references-20261007.json' with { type: 'json' };

type Detail = 'overview' | 'detail';
type SupportedModelKey = string;
type Paint = 'structure' | 'shadow' | 'deck' | 'glass' | 'stone' | 'antenna' | 'enamel' | 'clock' | 'accentBlue';
type TopKind = 'paris' | 'shenzhen' | 'open-cage' | 'karachi' | 'tianducheng' | 'cowboy' | 'macao'
  | 'las-vegas' | 'kings-island' | 'montmartre' | 'bloemfontein'
  | 'plain-cabin' | 'tiered-cabin' | 'plain-needle' | 'needle-cage' | 'small-dome' | 'cross-spire' | 'clock' | 'flag-cage' | 'ring-mast' | 'round-cage' | 'flat-cap' | 'perforated-box' | 'open-rim' | 'open-point' | 'urn' | 'playhouse' | 'flag-hip-roof' | 'square-cage' | 'historic-campanile' | 'anchor' | 'none' | 'square-lantern' | 'looped-crown' | 'open-corner-crown' | 'domed-cylinder-crown' | 'radial-flower-crown' | 'open-lantern';
interface Station { y: number; c: number; w: number; linear?: boolean }
interface PlatformSpec {
  y: number; width: number; opening: number; fascia: number;
  rail: number; canopy: number; bracketed?: boolean;
  hidden?: boolean; railKind?: 'straight' | 'loops';
  frameOnly?: boolean; panelRows?: number; cornerCut?: number;
}
interface TowerProfile {
  key: SupportedModelKey; baseWidth: number; footWidth: number;
  first: PlatformSpec; second: PlatformSpec;
  firstCentre: number; secondCentre: number;
  firstSection: number; secondSection: number;
  upperEnd: number; upperCentre: number; upperSection: number;
  curve: number; archStart: number; archCrown: number; archSpan: number;
  mainWidth: number; latticeWidth: number; upperBays: number;
  topKind: TopKind; paint: string; dark: string; deckPaint: string;
  flatLattice?: boolean;
  flatMainMembers?: boolean;
  topology?: 'eiffel' | 'spire' | 'masonry' | 'hybrid-pedestal' | 'perforated-playground' | 'roof-section' | 'visible-truss-section' | 'brick-eiffel' | 'outline-eiffel' | 'spring-eiffel' | 'flagpole-eiffel' | 'solid-panel-eiffel' | 'drop-tower-eiffel' | 'coffee-kiosk' | 'garden-lamp' | 'topiary-eiffel';
  linearLegs?: boolean; ornateArches?: boolean; latticeSparse?: boolean;
  enclosedFirst?: boolean;
  secondArch?: boolean;
  archKind?: 'lattice' | 'single' | 'double-line' | 'none';
  lowerBays?: number; middleBays?: number;
  surfaceKind?: 'wood' | 'woven' | 'bamboo' | 'lego';
  colorBands?: Array<{ maxY: number; color: string }>;
  topWidth?: number;
  crownHeightRatio?: number;
  cageWallRatio?: number; cageDomeRatio?: number;
  cageSquareFrame?: boolean;
  solidFascia?: boolean;
  masonryUpperOpen?: boolean; masonrySolidMiddle?: boolean; masonryArchRatio?: number;
  masonryPlainPlatforms?: boolean;
  masonryTruncated?: boolean;
  foundationHeight?: number;
  customStations?: Station[];
  extraPlatforms?: PlatformSpec[];
  latticePattern?: 'cross' | 'ladder';
  zeppelin?: boolean;
  mixedWood?: boolean; latticePaint?: Paint;
  sideLadder?: boolean;
  boxBelowCage?: boolean;
  topNeedle?: boolean;
  omitNeedle?: boolean;
  mastArm?: boolean;
  foundationPaint?: string;
  foundationShape?: 'square' | 'round';
  flankingTurrets?: boolean;
  perforatedLowerGallery?: boolean;
  omitSlide?: boolean;
  sectionBaseRadius?: number;
  sectionCurve?: number;
  panelPaint?: string;
  lowerLatticePattern?: 'cross' | 'ladder';
  internalStairs?: boolean;
  externalStair?: boolean;
  steelButtresses?: boolean;
  upperShaftFrom?: number;
  footPanelHeight?: number;
  visibleAboveY?: number;
  visibleBelowY?: number;
  darkCrown?: boolean;
  centralBraceSpine?: boolean;
  crownSpokes?: number;
  crownRedObject?: boolean;
  /** Photo-bound signs or colour panels; absent on every pre-expansion model. */
  photoPanels?: Array<{ y: number; width: number; height: number; depth: number; paint: Paint; side?: number }>;
  photoLettering?: { text: string; y: number; height: number; width: number; depth: number; paint: Paint; vertical?: boolean };
  photoArrow?: { y: number; width: number; height: number; depth: number; paint: Paint };
  photoRoundSign?: { y: number; radius: number; paint: Paint };
  photoCube?: { y: number; size: number; paint: Paint };
  photoFilledPanels?: boolean;
  photoBiplane?: boolean;
  photoPerforatedShell?: boolean;
  gardenFrameOnly?: boolean;
  photoDiamondCrown?: boolean;
  photoDepthScale?: number;
  photoCrown?: { levels: Array<{y:number;r:number}>; ribs:number; round?:boolean; solid?:boolean; solidFromY?:number; needleFrom?:number; needleWidth?:number };
  photoTimber?: boolean;
  nightSurfaceWash?: number;
  photoTurbine?: { blades: number; radius: number; y: number; tailLength: number };
  photoSymbol?: { kind:'peace'|'sunburst'|'star'|'cross'|'trident'; y:number; width:number; paint?:Paint };
  raisedSupportHeight?: number;
  raisedSupportWidth?: number;
  photoPerforatedShellRows?: number;
  photoPerforatedShellColumns?: number;
  photoPerforatedLegs?: boolean;
  photoTimberUpperBays?: number;
  photoTimberCross?: boolean;
  photoPebbleSurface?: boolean;
  /** Explicit photo-specific geometry; absent on every previous default model. */
  photoVariant?: CPhotoVariant;
  variantRailLean?: number;
  variantStiltHeight?: number;
  variantRingWidth?: number;
  variantReliefDepth?: number;
  clockRoundFace?: boolean;
}

const Y = new THREE.Vector3(0, 1, 0);

/** Subtle manufacturing finish, not an inferred survey of stains, rust or damage. */
function applyMicrofinish(material: THREE.MeshStandardMaterial, kind: 'paint' | 'stone' | 'wood', style: TowerRenderStyle): void {
  const previous = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey();
  const soft = style === 'porcelain' ? .24 : style === 'metal' ? .55 : 1;
  const frequency = kind === 'stone' ? 420 : kind === 'wood' ? 260 : 900;
  const amplitude = (kind === 'stone' ? .00010 : kind === 'wood' ? .000055 : .000015) * soft;
  const roughness = (kind === 'stone' ? .10 : kind === 'wood' ? .09 : .045) * soft;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.vertexShader = 'varying vec3 vFinishPosition; varying float vFinishScale;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFinishPosition = position; vFinishScale = length(modelViewMatrix[0].xyz);');
    shader.fragmentShader = `varying vec3 vFinishPosition; varying float vFinishScale;
      float finishNoise(vec3 p) {
        vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        vec3 a = vec3(17.13, 43.71, 113.53);
        vec4 h0 = fract(sin(vec4(dot(i,a),dot(i+vec3(1,0,0),a),dot(i+vec3(0,1,0),a),dot(i+vec3(1,1,0),a)))*43758.5453);
        vec4 h1 = fract(sin(vec4(dot(i+vec3(0,0,1),a),dot(i+vec3(1,0,1),a),dot(i+vec3(0,1,1),a),dot(i+vec3(1,1,1),a)))*43758.5453);
        return mix(mix(mix(h0.x,h0.y,f.x),mix(h0.z,h0.w,f.x),f.y),mix(mix(h1.x,h1.y,f.x),mix(h1.z,h1.w,f.x),f.y),f.z);
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      vec3 finishP = vFinishPosition * ${frequency.toFixed(1)} * ${kind === 'wood' ? 'vec3(1.0,0.08,1.0)' : 'vec3(1.0)'};
      float finishFilter = 1.0 - smoothstep(0.35, 1.25, max(length(dFdx(finishP)),length(dFdy(finishP))));
      float finishGrain = (finishNoise(finishP) - 0.5) * finishFilter;
      roughnessFactor = clamp(roughnessFactor + finishGrain * ${roughness.toFixed(5)}, 0.08, 1.0);
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      vec3 finishDx = dFdx(-vViewPosition), finishDy = dFdy(-vViewPosition);
      vec3 finishR1 = cross(finishDy, normal), finishR2 = cross(normal, finishDx);
      float finishDet = dot(finishDx, finishR1);
      float finishHeight = finishGrain * ${amplitude.toFixed(8)} * vFinishScale;
      vec3 finishGradient = sign(finishDet) * (dFdx(finishHeight)*finishR1 + dFdy(finishHeight)*finishR2);
      normal = normalize(max(abs(finishDet), 1e-12)*normal - finishGradient);
    `);
  };
  material.customProgramCacheKey = () => `${previousKey}|microfinish-v1:${kind}:${style}`;
  material.userData.microfinish = { kind, scope: 'artist-controlled-manufacturing-finish', filtered: true };
}

const BASE_PROFILES: Record<SupportedModelKey, TowerProfile> = {
  paris: {
    key: 'paris', baseWidth: 125 / 330, footWidth: 25 / 330,
    first: { y: 57 / 330, width: .222, opening: .099, fascia: .018, rail: .0043, canopy: .018 },
    second: { y: 115 / 330, width: .133, opening: .044, fascia: .013, rail: .0053, canopy: .010 },
    firstCentre: .082, secondCentre: .041, firstSection: .028, secondSection: .015,
    upperEnd: 276 / 330, upperCentre: .0114, upperSection: .0045,
    curve: .45, archStart: .033, archCrown: .129, archSpan: .126,
    mainWidth: .0031, latticeWidth: .00083, upperBays: 28,
    topKind: 'paris', paint: '#8b7150', dark: '#68553e', deckPaint: '#80705b',
  },
  shenzhen: {
    key: 'shenzhen', baseWidth: .389, footWidth: .069,
    first: { y: .183, width: .241, opening: .104, fascia: .031, rail: .007, canopy: .019 },
    second: { y: .370, width: .132, opening: .036, fascia: .026, rail: .014, canopy: 0 },
    firstCentre: .080, secondCentre: .0375, firstSection: .025, secondSection: .0125,
    upperEnd: .915, upperCentre: .0115, upperSection: .0036,
    curve: .49, archStart: .028, archCrown: .120, archSpan: .132,
    mainWidth: .0030, latticeWidth: .00083, upperBays: 31,
    topKind: 'shenzhen', paint: '#76503e', dark: '#48352c', deckPaint: '#654938',
  },
  'parque-europa': {
    key: 'parque-europa', baseWidth: .349, footWidth: .049,
    first: { y: .165, width: .222, opening: .101, fascia: .007, rail: .027, canopy: 0 },
    second: { y: .357, width: .126, opening: .045, fascia: .008, rail: .008, canopy: 0 },
    firstCentre: .078, secondCentre: .0375, firstSection: .024, secondSection: .012,
    upperEnd: .857, upperCentre: .0132, upperSection: .0033,
    curve: .55, archStart: .030, archCrown: .111, archSpan: .122,
    mainWidth: .00250, latticeWidth: .0010, upperBays: 35,
    topKind: 'open-cage', paint: '#814a36', dark: '#613b2d', deckPaint: '#754c3a',
  },
  karachi: {
    key: 'karachi', baseWidth: .452, footWidth: .078,
    first: { y: .211, width: .274, opening: .117, fascia: .031, rail: .012, canopy: .021, bracketed: true },
    second: { y: .390, width: .158, opening: .045, fascia: .025, rail: .009, canopy: 0, bracketed: true },
    firstCentre: .098, secondCentre: .046, firstSection: .028, secondSection: .016,
    upperEnd: .857, upperCentre: .0122, upperSection: .0052,
    curve: .37, archStart: .030, archCrown: .142, archSpan: .151,
    mainWidth: .00355, latticeWidth: .00125, upperBays: 21,
    topKind: 'karachi', paint: '#605b4d', dark: '#454439', deckPaint: '#6c6757',
  },
  tianducheng: {
    key: 'tianducheng', baseWidth: .431, footWidth: .071,
    first: { y: .196, width: .262, opening: .112, fascia: .031, rail: .006, canopy: .018 },
    second: { y: .382, width: .143, opening: .041, fascia: .034, rail: .008, canopy: 0 },
    firstCentre: .090, secondCentre: .043, firstSection: .026, secondSection: .0145,
    upperEnd: .842, upperCentre: .009, upperSection: .004,
    curve: .48, archStart: .028, archCrown: .127, archSpan: .145,
    mainWidth: .0028, latticeWidth: .00087, upperBays: 30,
    topKind: 'tianducheng', paint: '#675141', dark: '#463c34', deckPaint: '#655549',
  },
  texas: {
    key: 'texas', baseWidth: .470, footWidth: .052,
    first: { y: .214, width: .248, opening: .139, fascia: .003, rail: .042, canopy: 0 },
    second: { y: .391, width: .137, opening: .073, fascia: .003, rail: .029, canopy: 0 },
    firstCentre: .091, secondCentre: .045, firstSection: .033, secondSection: .018,
    upperEnd: .813, upperCentre: .0105, upperSection: .0045,
    curve: .48, archStart: .017, archCrown: .142, archSpan: .168,
    mainWidth: .0030, latticeWidth: .0021, upperBays: 13,
    topKind: 'cowboy', paint: '#45494a', dark: '#2d3234', deckPaint: '#3e4446',
  },
  macao: {
    key: 'macao', baseWidth: .421, footWidth: .075,
    first: { y: .185, width: .258, opening: .097, fascia: .028, rail: .007, canopy: .037 },
    second: { y: .376, width: .149, opening: .045, fascia: .030, rail: .007, canopy: 0 },
    firstCentre: .087, secondCentre: .043, firstSection: .028, secondSection: .014,
    upperEnd: .872, upperCentre: .0112, upperSection: .0045,
    curve: .42, archStart: .028, archCrown: .128, archSpan: .142,
    mainWidth: .0031, latticeWidth: .00089, upperBays: 28,
    topKind: 'macao', paint: '#aa9980', dark: '#716557', deckPaint: '#b3a28b',
  },
  'las-vegas': {
    key: 'las-vegas', baseWidth: .410, footWidth: .071,
    first: { y: .209, width: .273, opening: .105, fascia: .032, rail: .008, canopy: .038, bracketed: true },
    second: { y: .389, width: .153, opening: .044, fascia: .027, rail: .011, canopy: .014, bracketed: true },
    firstCentre: .092, secondCentre: .046, firstSection: .028, secondSection: .016,
    upperEnd: .837, upperCentre: .0165, upperSection: .0050,
    curve: .43, archStart: .031, archCrown: .155, archSpan: .137,
    mainWidth: .0033, latticeWidth: .0011, upperBays: 24,
    topKind: 'las-vegas', paint: '#92826b', dark: '#655b4f', deckPaint: '#aa977d',
  },
  'kings-island': {
    key: 'kings-island', baseWidth: .373, footWidth: .057,
    first: { y: .222, width: .250, opening: .102, fascia: .027, rail: .015, canopy: 0 },
    second: { y: .386, width: .143, opening: .051, fascia: .020, rail: .012, canopy: 0 },
    firstCentre: .082, secondCentre: .045, firstSection: .022, secondSection: .014,
    upperEnd: .826, upperCentre: .0173, upperSection: .0054,
    curve: .40, archStart: .025, archCrown: .127, archSpan: .123,
    mainWidth: .0038, latticeWidth: .0015, upperBays: 18,
    topKind: 'kings-island', paint: '#517168', dark: '#304f4a', deckPaint: '#6c897e',
  },
  montmartre: {
    key: 'montmartre', baseWidth: .496, footWidth: .062,
    first: { y: .185, width: .275, opening: .119, fascia: .012, rail: .025, canopy: 0 },
    second: { y: .381, width: .152, opening: .063, fascia: .024, rail: 0, canopy: 0 },
    firstCentre: .103, secondCentre: .057, firstSection: .033, secondSection: .018,
    upperEnd: .928, upperCentre: .0154, upperSection: .0053,
    curve: .39, archStart: .012, archCrown: .135, archSpan: .177,
    mainWidth: .0061, latticeWidth: .0031, upperBays: 20,
    topKind: 'montmartre', paint: '#a78b6f', dark: '#786149', deckPaint: '#ac9175', flatLattice: true,
  },
  bloemfontein: {
    key: 'bloemfontein', baseWidth: .422, footWidth: .056,
    first: { y: .223, width: .283, opening: .128, fascia: .030, rail: .025, canopy: 0, bracketed: true },
    second: { y: .409, width: .165, opening: .057, fascia: .027, rail: .020, canopy: 0, bracketed: true },
    firstCentre: .099, secondCentre: .047, firstSection: .028, secondSection: .016,
    upperEnd: .878, upperCentre: .0116, upperSection: .0045,
    curve: .41, archStart: .019, archCrown: .135, archSpan: .145,
    mainWidth: .0032, latticeWidth: .0018, upperBays: 17,
    topKind: 'bloemfontein', paint: '#868780', dark: '#5a5e59', deckPaint: '#90918a',
  },
};

export interface ModelCatalogEntry {
  key: string; entityId: string; name: string; baseProfile: string;
  overrides: Partial<Omit<TowerProfile, 'first' | 'second'>> & { first?: Partial<PlatformSpec>; second?: Partial<PlatformSpec> };
  status: string; heightM: number | null; heightScope: string;
  classificationSnapshot?: string; targetQualified?: boolean;
  normalizationScope?: 'whole-model' | 'visible-section';
  evidence: {
    photoIds: string[]; photoPaths: string[]; sourceUrls: string[]; observedFeatures: string[]; viewedAt: string; limits: string[];
    referenceCompleteness?: 'full' | 'partial'; observationType?: 'browser-photo' | 'browser-video-and-photo'; galleryReuse?: string;
    browserReferences?: Array<{ subject: string; sourceUrl: string; pixelViewedAt: string }>;
    media?: Array<{ author: string; license: string; licenseUrl: string; capturedAt: string; sha256: string; localPath: string }>;
  };
}
const MODEL_CATALOG = (modelBatch as unknown as { models: ModelCatalogEntry[] }).models;
const MODEL_ENTRIES = new Map<string, ModelCatalogEntry>();
const PROFILES = new Map<string, TowerProfile>();
const MODEL_ENTITY_IDS = new Set<string>();
for (const entry of MODEL_CATALOG) {
  const base = BASE_PROFILES[entry.baseProfile];
  if (!base || MODEL_ENTRIES.has(entry.key) || !entry.entityId || MODEL_ENTITY_IDS.has(entry.entityId) || !entry.evidence.sourceUrls.length
    || !entry.evidence.observedFeatures.length) throw new Error(`Invalid evidence-bound tower model: ${entry.key}`);
  const profile: TowerProfile = { ...base, ...entry.overrides, key: entry.key,
    first: { ...base.first, ...entry.overrides.first }, second: { ...base.second, ...entry.overrides.second } };
  if (!(profile.baseWidth > 0 && profile.footWidth > 0 && profile.first.y > 0
    && profile.first.y < profile.second.y && profile.second.y < profile.upperEnd && profile.upperEnd < 1)) {
    throw new Error(`Invalid normalized tower profile: ${entry.key}`);
  }
  MODEL_ENTRIES.set(entry.key, entry); MODEL_ENTITY_IDS.add(entry.entityId); PROFILES.set(entry.key, profile);
}
export const REGISTERED_TOWER_MODEL_KEYS: readonly string[] = Object.freeze([...PROFILES.keys()]);
export function isTowerModelKey(key: string): boolean { return PROFILES.has(key); }
export function getTowerModelCatalog(): ReadonlyArray<Readonly<ModelCatalogEntry>> { return MODEL_CATALOG; }

interface NightScheme {
  id: string; basis: 'operator-reference' | 'photo-reference' | 'artistic';
  colors: [string, string, string]; windows: string; sources: string[]; note: string;
  localDesign?: { title: { 'zh-CN': string; en: string; fr: string }; cue: string; city: string };
  referenceCity?: string;
  heightStops?: Array<{ y: number; color: string }>;
}
interface NightProgramme {
  id: string; mode: 'static' | 'golden-sparkle' | 'ascending-color-wave' | 'rgbw-wash' | 'historical-five-color' | 'subtle-brightness' | 'lantern-breath' | 'aurora-flow' | 'jewel-chase' | 'sunset-tide' | 'seasonal-crossfade' | 'woven-lattice' | 'waltz' | 'river-ripple' | 'festival-procession';
  note: string; referenceTiming: false;
}
/** Stable per-entity art direction, independent of registry order or inherited Paris recipes. */
function illuminationSeed(key: string): number {
  let hash = 2166136261;
  for (const character of key) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}
interface LocalNightDesign {
  title: { 'zh-CN': string; en: string; fr: string }; cue: string; city: string;
  colors: NightScheme['colors']; mode: NightProgramme['mode']; tempo: number; waveScale: number; direction: number;
}
const LOCAL_NIGHT_DESIGNS = localNightDesigns.entries as unknown as Record<string, LocalNightDesign>;
const PHOTO_NIGHT_REFERENCES = photoNightReferences.entries as Record<string, {
  city: string; colors: string[]; source: string; localPath: string; date: string | null; observation: string;
  heightStops?: Array<{ y: number; color: string }>;
}>;
function artisticNight(key: string) {
  const design = LOCAL_NIGHT_DESIGNS[key];
  if (!design) throw new Error(`Missing local night design: ${key}`);
  return design;
}
function nightProgramme(key: string): NightProgramme {
  const programme: Omit<NightProgramme, 'referenceTiming'> = key === 'paris'
    ? { id: 'paris-golden-white-sparkle-demo', mode: 'golden-sparkle', note: 'Golden base and white sparkles follow official lighting components. This continuous slow demonstration does not reproduce the hourly timetable or fixture positions; the rotating beacon is omitted.' }
    : key === 'macao'
      ? { id: 'macao-ascending-color-wave-demo', mode: 'ascending-color-wave', note: 'Operator describes colored light moving from feet to top. The accelerated upward wave and palette transitions are an artistic demonstration, not recorded show cues.' }
      : key === 'las-vegas'
        ? { id: 'vegas-rgbw-wash-white-points-demo', mode: 'rgbw-wash', note: 'RGBW washing and white point-light capability follow operator and equipment-maker references. Smooth moving colors and soft white pulses are an artistic demonstration, not the site show timing.' }
        : key === 'tianducheng'
          ? { id: 'tianducheng-2016-five-color-demo', mode: 'historical-five-color', note: 'Red, blue, purple, yellow and green follow the developer 2016 lighting tests. Smooth transitions are a historical-palette artistic demonstration; the 2026 programme is unverified.' }
          : ['th-pattaya-city-mini-siam', 'za-stellenbosch-dagbreek-tower'].includes(key)
            ? { id: `${key}-photo-warm-breathing`, mode: 'subtle-brightness', note: 'Keep the photo-referenced warm color. A very small artistic brightness variation does not imply a real color-changing show.' }
            : key === 'texas'
              ? { id: 'texas-seasonal-colors-demo', mode: 'seasonal-crossfade', note: 'Local chamber documents seasonal LEDs, Christmas red/green and pink/blue announcements. This slow color crossfade is an artistic montage of those states, not an observed continuous show.' }
              : PHOTO_NIGHT_REFERENCES[key]
                ? { id: `${key}-photo-light-breathing`, mode: 'subtle-brightness', note: 'Preserve the individually inspected photo palette. Gentle breathing is artistic; a still photograph does not establish a dynamic site programme or current lighting.' }
                : { id: `${key}-local-night-show`, mode: artisticNight(key).mode,
                  note: artisticNight(key).cue + ' · Original choreography inspired by this place, not a recorded site show or a verified ethnographic claim.' };
  return { ...programme, referenceTiming: false };
}
interface IlluminationUniforms {
  nightSeconds: THREE.IUniform<number>;
  nightMotion: THREE.IUniform<number>;
  nightKind: THREE.IUniform<number>;
  nightOffset: THREE.IUniform<number>;
  nightTempo: THREE.IUniform<number>;
  nightPalette: THREE.IUniform<THREE.Color[]>;
  nightWaveScale: THREE.IUniform<number>;
  nightDirection: THREE.IUniform<number>;
}
const illuminationStates = new WeakMap<THREE.Group, IlluminationUniforms>();
function makeIlluminationUniforms(key: string): IlluminationUniforms {
  const mode = nightProgramme(key).mode;
  return { nightSeconds: { value: 0 }, nightMotion: { value: 0 },
    nightKind: { value: ['static', 'golden-sparkle', 'ascending-color-wave', 'rgbw-wash', 'historical-five-color', 'subtle-brightness', 'lantern-breath', 'aurora-flow', 'jewel-chase', 'sunset-tide', 'seasonal-crossfade', 'woven-lattice', 'waltz', 'river-ripple', 'festival-procession'].indexOf(mode) },
    nightOffset: { value: illuminationSeed(key) % 997 / 997 * Math.PI * 2 },
    nightTempo: { value: LOCAL_NIGHT_DESIGNS[key]?.tempo ?? 1 },
    nightWaveScale: { value: LOCAL_NIGHT_DESIGNS[key]?.waveScale ?? 10 },
    nightDirection: { value: LOCAL_NIGHT_DESIGNS[key]?.direction ?? 1 },
    nightPalette: { value: nightScheme(key).colors.map(color => new THREE.Color(color)) } };
}

/** Host-owned clock: no RAF, timers, CPU vertex writes, random particles or global light objects. */
export function updateTowerIllumination(group: THREE.Group, seconds: number, enabledMotion = true): void {
  const uniforms = illuminationStates.get(group);
  if (!uniforms) return;
  const enabled = enabledMotion && Number.isFinite(seconds);
  uniforms.nightSeconds.value = enabled ? Math.max(0, seconds) : 0;
  uniforms.nightMotion.value = enabled ? 1 : 0;
}

// Shared GPU programme code is injected into both structural emission and batched light discs.
// Color wavelengths/cue speeds are presentation values, never measured fixture programming.
const NIGHT_PROGRAMME_GLSL = `
  uniform float nightSeconds; uniform float nightMotion; uniform float nightKind;
  uniform float nightOffset; uniform float nightTempo; uniform vec3 nightPalette[3];
  uniform float nightWaveScale; uniform float nightDirection; varying float vNightAngle;
  float artTime() { return nightSeconds * nightTempo * 1.9 + nightOffset * 3.0; }
  vec3 artPalette(float p) {
    float q = fract(p) * 3.0; float t = smoothstep(0.0, 1.0, fract(q));
    if (q < 1.0) return mix(nightPalette[0], nightPalette[1], t);
    if (q < 2.0) return mix(nightPalette[1], nightPalette[2], t);
    return mix(nightPalette[2], nightPalette[0], t);
  }
  vec3 seasonalPalette(float p) {
    float q = fract(p) * 4.0; float t = smoothstep(0.0, 1.0, fract(q));
    vec3 red = vec3(1., .045, .075), green = vec3(.04, .75, .19);
    vec3 pink = vec3(1., .20, .49), blue = vec3(.07, .26, 1.);
    if (q < 1.) return mix(red, green, t);
    if (q < 2.) return mix(green, pink, t);
    if (q < 3.) return mix(pink, blue, t);
    return mix(blue, red, t);
  }
  vec3 nightSpectrum(float h) {
    vec3 p = abs(fract(vec3(h) + vec3(0.0, 0.6666667, 0.3333333)) * 6.0 - 3.0);
    return mix(vec3(0.035), vec3(1.0), clamp(p - 1.0, 0.0, 1.0));
  }
  vec3 historicalPalette(float p) {
    float q = fract(p) * 5.0; float t = smoothstep(0.0, 1.0, fract(q));
    vec3 red = vec3(1.0, .045, .065), blue = vec3(.035, .14, 1.0);
    vec3 purple = vec3(.63, .055, 1.0), yellow = vec3(1.0, .66, .055), green = vec3(.06, .90, .18);
    if (q < 1.0) return mix(red, blue, t);
    if (q < 2.0) return mix(blue, purple, t);
    if (q < 3.0) return mix(purple, yellow, t);
    if (q < 4.0) return mix(yellow, green, t);
    return mix(green, red, t);
  }
  vec3 programmeColor(vec3 baseline, float height) {
    if (nightMotion < .5) return baseline;
    if (nightKind > 1.5 && nightKind < 2.5) {
      return nightSpectrum(.67 + height * .80 - nightSeconds / 7.0);
    }
    if (nightKind > 2.5 && nightKind < 3.5) {
      vec3 wash = nightSpectrum(.62 + height * .45 + nightSeconds / 9.0);
      float whiteWave = pow(.5 + .5 * sin(height * 9.0 - nightSeconds * 1.1), 6.0) * .65;
      return mix(wash, vec3(.92, .95, 1.0), whiteWave);
    }
    if (nightKind > 3.5 && nightKind < 4.5) return historicalPalette(nightSeconds / 10.0 + height * .16);
    if (nightKind > 9.5 && nightKind < 10.5) return seasonalPalette(nightSeconds / 18.0);
    if (nightKind > 10.5 && nightKind < 11.5) return mix(baseline, artPalette(height * .45 + sin(vNightAngle * 2.0 + artTime() * .5) * .30 + artTime() / 14.0), .94);
    if (nightKind > 11.5 && nightKind < 12.5) return mix(baseline, artPalette(artTime() / 16.0 + height * .16), .85);
    if (nightKind > 12.5 && nightKind < 13.5) return mix(baseline, artPalette(height * .50 - artTime() / 14.0), .90);
    if (nightKind > 13.5) return artPalette(floor(height * 7.0) / 7.0 + artTime() / 14.0);
    if (nightKind > 6.5 && nightKind < 7.5) return mix(baseline, artPalette(height * .65 - artTime() / 12.0), .98);
    if (nightKind > 7.5 && nightKind < 8.5) return mix(baseline, artPalette(height * .45 + artTime() / 14.0), .85);
    if (nightKind > 8.5 && nightKind < 9.5) return mix(baseline, artPalette(height * .35 + artTime() / 14.0), .94);
    return baseline;
  }
  float programmeBrightness(float height) {
    if (nightMotion < .5) return 1.0;
    if (nightKind > 9.5 && nightKind < 10.5) return .85 + .25 * sin(nightSeconds * .7);
    if (nightKind > 10.5 && nightKind < 11.5) return .20 + 1.65 * pow(.5 + .5 * sin(height * nightWaveScale + vNightAngle * 2.0 - artTime() * 1.1), 3.0);
    if (nightKind > 11.5 && nightKind < 12.5) {
      float beat = artTime() * .85 - height * 1.8;
      return .72 + .43 * sin(beat) + .16 * sin(beat * 3.0);
    }
    if (nightKind > 12.5 && nightKind < 13.5) return .22 + 1.50 * pow(.5 + .5 * sin(height * nightWaveScale - artTime() * 1.1), 3.0);
    if (nightKind > 13.5) return .14 + 1.75 * pow(.5 + .5 * cos(floor(height * 7.0) * .85 - artTime() * nightDirection * 1.0), 5.0);
    if (nightKind > 5.5 && nightKind < 6.5) return .78 + .58 * sin(artTime() * .75 - height * 3.2);
    if (nightKind > 6.5 && nightKind < 9.5) {
      float wave = .5 + .5 * cos(height * nightWaveScale - artTime() * nightDirection * 1.1);
      return .18 + 1.70 * pow(wave, 3.0);
    }
    if (nightKind > 4.5 && nightKind < 5.5) return .82 + .30 * cos(nightSeconds * .95 - height * 3.0);
    if (nightKind > 1.5 && nightKind < 2.5) return .60 + .60 * pow(.5 + .5 * cos(height * 8.0 - nightSeconds * 1.5), 2.0);
    return 1.0;
  }
`;
/** Entity-specific references never propagate through baseProfile inheritance. */
function nightScheme(key: string): NightScheme {
  if (key === 'paris') return { id: 'paris-golden', basis: 'operator-reference',
    colors: ['#ffc36b', '#ffd88c', '#ffe6b0'], windows: '#ffdca0',
    sources: ['https://www.toureiffel.paris/en/the-monument/lights'],
    note: 'Golden floodlighting reference; fixture layout and gentle shimmer are artistic, not a timed programme replica.' };
  if (key === 'macao') return { id: 'macao-blue-violet', basis: 'photo-reference',
    colors: ['#615cff', '#355bff', '#7970ff'], windows: '#ffe2b4',
    sources: ['data/media/candidates/mo-cotai-parisian__round4-fb7275c354.jpg', 'https://www.parisianmacao.com/amenities/eiffel-tower.html'],
    note: 'Blue illuminated state observed in 2026-04-12 photo; violet shading and fixture positions are artistic. The real show changes colors.' };
  if (key === 'las-vegas') return { id: 'vegas-color-wash', basis: 'operator-reference',
    colors: ['#e65870', '#e7e6f6', '#517cff'], windows: '#ffce83',
    sources: ['https://investor.caesars.com/node/23946', 'https://www.traxon-ecue.com/project/eiffel-tower/'],
    note: 'Operator confirms colored washes and white strobes. This static red-white-blue arrangement is artistic, not a captured cue.' };
  if (key === 'tianducheng') return { id: 'tianducheng-multicolor-2016', basis: 'operator-reference',
    colors: ['#3ee09d', '#db70ef', '#5786ff'], windows: '#e8c792',
    sources: ['https://www.guangsha.com/upload/2017/04/11/1491898459776386etg.pdf'],
    note: 'Developer newspaper documents red, blue, purple, yellow and green testing in 2016. This static green-purple-blue arrangement is artistic; it does not establish a fixed 2026 programme.' };
  if (key === 'th-pattaya-city-mini-siam') return { id: 'mini-siam-amber-2010', basis: 'photo-reference',
    colors: ['#ffa342', '#ffc15e', '#e9a64f'], windows: '#ffcd84',
    sources: ['https://commons.wikimedia.org/wiki/File:Saint_Basil%27s_Cathedral_and_Eiffel_Tower_at_night_-_panoramio.jpg'],
    note: 'Amber-gold tower lighting observed in the licensed 2010-10-21 photograph. Fixture layout and brightness are simplified; current lighting is unverified.' };
  if (key === 'za-stellenbosch-dagbreek-tower') return { id: 'dagbreek-warm-photo-unknown-date', basis: 'photo-reference',
    colors: ['#dca354', '#ffdc92', '#fce5b2'], windows: '#ffd192',
    sources: ['https://commons.wikimedia.org/wiki/File:Dagbreek_eiffel.jpg'],
    note: 'Warm-gold lighting is visible on the exposed tower in a 240x320 licensed photo. Capture date is unknown; 2007 is the upload year. Hidden feet, fixture positions and current lighting are unverified.' };
  if (key === 'texas') return { id: 'texas-seasonal-led', basis: 'operator-reference',
    colors: ['#5579ee', '#dddfee', '#ee6273'], windows: '#ffe1a1',
    sources: ['https://www.paristexas.com/landmarks/', 'https://www.paristexas.com/eiffel-tower/'],
    note: 'Local chamber describes seasonal LED colors and Texas flag colors at night. The baseline zoned composition and slow crossfade are artistic; no exact fixture layout or current event color is claimed.' };
  const photo = PHOTO_NIGHT_REFERENCES[key];
  if (photo) return { id: `${key}-photo-reference`, basis: 'photo-reference',
    colors: [...photo.colors] as NightScheme['colors'], windows: '#ffe3af',
    ...(photo.heightStops?.length ? { heightStops: photo.heightStops.map(stop => ({ ...stop })).sort((a, b) => a.y - b.y) } : {}),
    sources: [photo.source, photo.localPath], referenceCity: photo.city,
    note: `${photo.observation} Photo date: ${photo.date ?? 'unknown'}. Fixture layout and breathing rhythm are artistic; current conditions and real dynamic cues are unverified.` };
  const design = artisticNight(key);
  return { id: `artistic-local-${key}`, basis: 'artistic',
    colors: [...design.colors], windows: '#ffdfaa', sources: [], localDesign: design,
    note: design.cue + ' · Original light choreography; not a site lighting survey.' };
}

function nightColor(scheme: NightScheme, y: number): THREE.Color {
  // Optional photo-specific zones use normalized display height, not measured
  // fixture positions. Equal-height stops form an intentional sharp boundary.
  const stops = scheme.heightStops;
  if (stops?.length) {
    if (y < stops[0].y) return new THREE.Color(stops[0].color);
    for (let i = 1; i < stops.length; i += 1) {
      if (y < stops[i].y) {
        const left = stops[i - 1], right = stops[i];
        const t = THREE.MathUtils.clamp((y - left.y) / (right.y - left.y), 0, 1);
        return new THREE.Color(left.color).lerp(new THREE.Color(right.color), t);
      }
    }
    return new THREE.Color(stops[stops.length - 1].color);
  }
  // Height zones are presentation parameters, not measured fixture coordinates.
  const t = THREE.MathUtils.clamp((y - .10) / .82, 0, .999999) * 2;
  return new THREE.Color(scheme.colors[Math.min(1, Math.floor(t))])
    .lerp(new THREE.Color(scheme.colors[Math.min(2, Math.floor(t) + 1)]), t % 1);
}

export function getTowerIllumination(modelKey: string): Readonly<NightScheme & { programme: NightProgramme }> {
  if (!isTowerModelKey(modelKey)) throw new Error(`Unknown tower model key: ${modelKey}`);
  return { ...nightScheme(modelKey), programme: nightProgramme(modelKey) };
}

interface Bucket {
  positions: number[]; normals: number[]; uvs: number[]; colors: number[]; indices: number[];
  primitiveCount: number;
}

/** Small bevels on built-up chord flanges catch light without a texture or a second outline pass. */
function bevelledUnitBox(): THREE.BufferGeometry {
  const ring = [[-.38, -.5], [.38, -.5], [.5, -.38], [.5, .38], [.38, .5], [-.38, .5], [-.5, .38], [-.5, -.38]];
  const positions: number[] = [];
  const triangle = (a: number[], b: number[], c: number[]) => positions.push(...a, ...b, ...c);
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i], z = ring[(i + 1) % ring.length];
    const loA = [a[0], -.5, a[1]], loZ = [z[0], -.5, z[1]];
    const hiA = [a[0], .5, a[1]], hiZ = [z[0], .5, z[1]];
    triangle(loA, hiA, loZ); triangle(loZ, hiA, hiZ);
    triangle([0, -.5, 0], loA, loZ); triangle([0, .5, 0], hiZ, hiA);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** CPU-batched primitives. There is no per-beam Object3D or cross-model GPU cache. */
class ModelBuilder {
  readonly buckets = new Map<Paint, Bucket>();
  readonly cube = new THREE.BoxGeometry(1, 1, 1);
  readonly bevelledCube = bevelledUnitBox();
  readonly boltHead = new THREE.CylinderGeometry(1, 1, 1, 6, 1, false);
  readonly rod = new THREE.CylinderGeometry(1, 1, 1, 6, 1, false);
  beamCount = 0;
  private primitiveSerial = 0;
  private readonly point = new THREE.Vector3();
  private readonly normal = new THREE.Vector3();
  private readonly rotation = new THREE.Quaternion();
  private readonly centre = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly roundBeams: boolean;
  private readonly stepBeams: boolean;
  private readonly stepSize: number;
  constructor(roundBeams = false, stepBeams = false, stepSize = .024) {
    this.roundBeams = roundBeams; this.stepBeams = stepBeams; this.stepSize = stepSize;
  }

  private append(geometry: THREE.BufferGeometry, paint: Paint, position: THREE.Vector3,
    rotation: THREE.Quaternion, scale?: THREE.Vector3): void {
    let bucket = this.buckets.get(paint);
    if (!bucket) {
      bucket = { positions: [], normals: [], uvs: [], colors: [], indices: [], primitiveCount: 0 };
      this.buckets.set(paint, bucket);
    }
    const attribute = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const uv = geometry.getAttribute('uv');
    const vertexOffset = bucket.positions.length / 3;
    // Very small artist-controlled paint variation, not a weathering survey.
    const shade = paint === 'structure' || paint === 'shadow'
      ? .976 + ((this.primitiveSerial * 37) % 19) / 1000 : 1;
    this.primitiveSerial += 1;
    for (let i = 0; i < attribute.count; i += 1) {
      this.point.fromBufferAttribute(attribute, i);
      if (scale) this.point.multiply(scale);
      this.point.applyQuaternion(rotation).add(position);
      bucket.positions.push(this.point.x, this.point.y, this.point.z);
      this.normal.fromBufferAttribute(normals, i);
      if (scale) this.normal.divide(scale);
      this.normal.applyQuaternion(rotation).normalize();
      bucket.normals.push(this.normal.x, this.normal.y, this.normal.z);
      bucket.uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      bucket.colors.push(shade, shade, shade);
    }
    const index = geometry.getIndex();
    if (index) {
      for (let i = 0; i < index.count; i += 1) bucket.indices.push(vertexOffset + index.getX(i));
    } else {
      for (let i = 0; i < attribute.count; i += 1) bucket.indices.push(vertexOffset + i);
    }
    bucket.primitiveCount += 1;
  }

  box(width: number, height: number, depth: number, position: THREE.Vector3,
    paint: Paint = 'structure', rotation = new THREE.Quaternion()): void {
    if (width <= 0 || height <= 0 || depth <= 0) return;
    // Cube normals are axis aligned, so applying only rotation is correct even for a nonuniform box scale.
    this.append(this.cube, paint, position, rotation, new THREE.Vector3(width, height, depth));
  }

  beam(a: THREE.Vector3, b: THREE.Vector3, width: number, paint: Paint = 'structure',
    depth = width): void {
    this.direction.subVectors(b, a);
    const length = this.direction.length();
    if (length < 1e-7) return;
    this.centre.addVectors(a, b).multiplyScalar(.5);
    this.rotation.setFromUnitVectors(Y, this.direction.multiplyScalar(1 / length));
    if (this.stepBeams) {
      const count = Math.max(1, Math.min(16, Math.ceil(length / this.stepSize)));
      for (let i = 0; i < count; i += 1) {
        const lo = a.clone().lerp(b, i / count), hi = a.clone().lerp(b, (i + 1) / count);
        this.box(Math.abs(hi.x - lo.x) + width, Math.abs(hi.y - lo.y) + width, Math.abs(hi.z - lo.z) + depth,
          lo.clone().add(hi).multiplyScalar(.5), paint);
      }
    } else if (this.roundBeams) this.append(this.rod, paint, this.centre, this.rotation, v(width / 2, length, depth / 2));
    else this.box(width, length, depth, this.centre, paint, this.rotation);
    this.beamCount += 1;
  }

  /** Flat fabricated strips keep their broad face in the facade plane, as in Montmartre. */
  strip(a: THREE.Vector3, b: THREE.Vector3, width: number, normal: THREE.Vector3, paint: Paint = 'structure'): void {
    const direction = b.clone().sub(a), length = direction.length();
    if (length < 1e-7) return;
    const y = direction.divideScalar(length), x = y.clone().cross(normal).normalize(), z = x.clone().cross(y).normalize();
    const rotation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    this.box(width, length, width * .24, a.clone().add(b).multiplyScalar(.5), paint, rotation);
    this.beamCount += 1;
  }

  bolt(position: THREE.Vector3, normal: THREE.Vector3, radius: number): void {
    const rotation = new THREE.Quaternion().setFromUnitVectors(Y, normal);
    this.append(this.boltHead, 'antenna', position, rotation, v(radius, radius * .60, radius));
  }

  taperedSquare(bottom: number, top: number, y0: number, y1: number, paint: Paint): void {
    const corners = (width: number, y: number) => [v(-width / 2, y, -width / 2), v(width / 2, y, -width / 2),
      v(width / 2, y, width / 2), v(-width / 2, y, width / 2)];
    this.surface([...corners(bottom, y0), ...corners(top, y1)],
      [0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 6, 2, 6, 3, 3, 6, 7, 3, 7, 0, 0, 7, 4, 0, 1, 2, 0, 2, 3, 4, 7, 6, 4, 6, 5], paint);
  }

  ellipsoid(x: number, y: number, z: number, centre: THREE.Vector3, rotation: THREE.Quaternion, paint: Paint, sides = 16): void {
    const geometry = new THREE.SphereGeometry(1, sides, Math.max(6, Math.floor(sides / 2)));
    this.append(geometry, paint, centre, rotation, v(x, y, z)); geometry.dispose();
  }

  /** Readable built-up chord: two flanges with a recessed web, rather than an oversized solid rod. */
  girder(a: THREE.Vector3, b: THREE.Vector3, width: number, depth: number): void {
    const direction = b.clone().sub(a);
    const length = direction.length();
    if (length < 1e-7) return;
    const rotation = new THREE.Quaternion().setFromUnitVectors(Y, direction.divideScalar(length));
    const centre = a.clone().add(b).multiplyScalar(.5);
    const flange = width * .18;
    for (const sign of [-1, 1]) {
      const offset = v(0, 0, sign * (depth - flange) / 2).applyQuaternion(rotation);
      this.append(this.bevelledCube, 'structure', centre.clone().add(offset), rotation, v(width, length, flange));
    }
    this.box(width * .20, length, depth - flange * 2, centre, 'shadow', rotation);
    this.beamCount += 1;
  }

  cylinder(bottom: number, top: number, y0: number, y1: number, paint: Paint,
    sides = 8, x = 0, z = 0): void {
    if (y1 <= y0) return;
    const geometry = new THREE.CylinderGeometry(top, bottom, y1 - y0, sides, 1, false);
    this.append(geometry, paint, new THREE.Vector3(x, (y0 + y1) / 2, z), new THREE.Quaternion());
    geometry.dispose();
  }

  polygonRing(points: THREE.Vector2[], opening: number, y: number, thickness: number,
    paint: Paint): void {
    const shape = new THREE.Shape(points);
    if (opening > 0) {
      const hole = new THREE.Path();
      const inner = points.slice().reverse().map(p => p.clone().multiplyScalar(opening));
      hole.moveTo(inner[0].x, inner[0].y);
      for (const p of inner.slice(1)) hole.lineTo(p.x, p.y);
      hole.closePath();
      shape.holes.push(hole);
    }
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 1 });
    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    this.append(geometry, paint, new THREE.Vector3(0, y - thickness / 2, 0), rotation);
    geometry.dispose();
  }

  surface(points: THREE.Vector3[], indices: number[], paint: Paint): void {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap(point => point.toArray()), 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    this.append(geometry, paint, v(0, 0, 0), new THREE.Quaternion());
    geometry.dispose();
  }

  facade(shape: THREE.Shape, side: number, depthAt: (y: number) => number, paint: Paint): void {
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: .00085, bevelEnabled: false, curveSegments: 8 });
    const positions = geometry.getAttribute('position');
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i), y = positions.getY(i), depth = depthAt(y) + positions.getZ(i);
      points.push(facePoint(x, y, side, depth));
    }
    const indices = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: positions.count }, (_, i) => i);
    this.surface(points, indices, paint);
    geometry.dispose();
  }

  finish(profile: TowerProfile, detail: Detail, renderStyle: TowerRenderStyle): THREE.Group {
    if(profile.photoPebbleSurface && profile.key !== 'us-gasquet-gasquet-market') {
      const faces:Array<{a:THREE.Vector3;z:THREE.Vector3;c:THREE.Vector3;n:THREE.Vector3;area:number}>=[];let area=0;
      for(const [paint,bucket]of this.buckets)if(['stone','deck','structure'].includes(paint))for(let i=0;i<bucket.indices.length;i+=3){
        const point=(index:number)=>new THREE.Vector3().fromArray(bucket.positions,bucket.indices[index]*3);
        const a=point(i),z=point(i+1),c=point(i+2),n=z.clone().sub(a).cross(c.clone().sub(a)),size=n.length()/2;
        if(size<.00001)continue;n.normalize();area+=size;faces.push({a,z,c,n,area});
      }
      const count=detail==='detail'?1500:700;
      for(let i=0;i<count&&faces.length;i++){
        const target=((i*.61803398875+.17)%1)*area,face=faces.find(face=>face.area>=target)!;
        const u=Math.sqrt((i*.754877666+.13)%1),w=(i*.56984029+.27)%1;
        const centre=face.a.clone().multiplyScalar(1-u).addScaledVector(face.z,u*(1-w)).addScaledVector(face.c,u*w);
        const radius=.018+((i*17)%11)*.0011;
        centre.addScaledVector(face.n,radius*.48);
        this.ellipsoid(radius,radius*.77,radius*.53,centre,new THREE.Quaternion().setFromUnitVectors(v(0,0,1),face.n),i%5===0?'shadow':'stone',4);
      }
    }
    if(profile.raisedSupportHeight) {
      const height=profile.raisedSupportHeight,c=(profile.baseWidth-profile.footWidth)/2,w=profile.raisedSupportWidth??profile.footWidth*1.15;
      for(const bucket of this.buckets.values())for(let i=1;i<bucket.positions.length;i+=3)bucket.positions[i]+=height;
      for(const sx of[-1,1])for(const sz of[-1,1])this.box(w,height,w,v(sx*c,height/2,sz*c),'stone');
    }
    this.cube.dispose();
    this.bevelledCube.dispose();
    this.boltHead.dispose();
    this.rod.dispose();
    for(const boundary of [{cut:profile.visibleAboveY,above:true},{cut:profile.visibleBelowY,above:false}]) if(boundary.cut!==undefined){
      // Clip the actual triangles to the photographed crop boundary. No hidden feet survive in bounds.
      const cut=boundary.cut;
      for(const [paint,source] of this.buckets){
        const out={positions:[] as number[],normals:[] as number[],uvs:[] as number[],colors:[] as number[],indices:[] as number[],primitiveCount:source.primitiveCount};
        const vertex=(i:number)=>[...source.positions.slice(i*3,i*3+3),...source.normals.slice(i*3,i*3+3),...source.uvs.slice(i*2,i*2+2),...source.colors.slice(i*3,i*3+3)];
        for(let i=0;i<source.indices.length;i+=3){
          const triangle=source.indices.slice(i,i+3).map(vertex),poly:number[][]=[];
          for(let j=0;j<3;j+=1){const a=triangle[j],z=triangle[(j+1)%3],inside=boundary.above?a[1]>=cut:a[1]<=cut,next=boundary.above?z[1]>=cut:z[1]<=cut;
            if(inside)poly.push(a);
            if(inside!==next){const t=(cut-a[1])/(z[1]-a[1]);poly.push(a.map((v,k)=>lerp(v,z[k],t)));}
          }
          for(let j=1;j<poly.length-1;j+=1)for(const vtx of [poly[0],poly[j],poly[j+1]]){
            out.indices.push(out.positions.length/3);out.positions.push(...vtx.slice(0,3));out.normals.push(...vtx.slice(3,6));out.uvs.push(...vtx.slice(6,8));out.colors.push(...vtx.slice(8,11));
          }
        }
        if(out.indices.length)this.buckets.set(paint,out);else this.buckets.delete(paint);
      }
    }
    const group = new THREE.Group();
    const illumination = renderStyle === 'illuminated' ? makeIlluminationUniforms(profile.key) : null;
    if (illumination) illuminationStates.set(group, illumination);
    group.name = `tower-${profile.key}-${detail}`;
    const materials: Record<Paint, THREE.MeshStandardMaterial> = {
      structure: new THREE.MeshPhysicalMaterial({ color: profile.paint, metalness: .38, roughness: .47, clearcoat: .16, clearcoatRoughness: .43, vertexColors: true }),
      shadow: new THREE.MeshStandardMaterial({ color: profile.dark, metalness: .30, roughness: .61, vertexColors: true }),
      deck: new THREE.MeshPhysicalMaterial({ color: profile.deckPaint, metalness: .32, roughness: .49, clearcoat: .12, clearcoatRoughness: .40, vertexColors: true }),
      glass: new THREE.MeshStandardMaterial({
        color: profile.key === 'karachi' ? '#bdcec0' : profile.key === 'macao' ? '#49616a' : profile.key === 'las-vegas' ? '#20383c' : '#7a9098',
        metalness: ['macao', 'las-vegas'].includes(profile.key) ? .12 : .04, roughness: ['macao', 'las-vegas'].includes(profile.key) ? .22 : .25,
        transparent: true, opacity: profile.key === 'karachi' ? .64 : profile.key === 'macao' ? .78 : profile.key === 'las-vegas' ? .86 : .38,
        depthWrite: false, vertexColors: true,
      }),
      stone: new THREE.MeshStandardMaterial({ color: profile.foundationPaint ?? (profile.topology === 'masonry' ? '#bfc0b6' : profile.key === 'texas' ? '#aaa7a0' : '#b9af9d'), roughness: .94, metalness: 0, vertexColors: true }),
      antenna: new THREE.MeshStandardMaterial({ color: '#9a9e9d', roughness: .52, metalness: .58, vertexColors: true }),
      enamel: new THREE.MeshStandardMaterial({ color: '#b5272f', roughness: .44, metalness: .13, side: THREE.DoubleSide, vertexColors: true }),
      clock: new THREE.MeshStandardMaterial({ color: profile.panelPaint ?? '#426e84', roughness: .65, metalness: .08, vertexColors: true }),
      accentBlue: new THREE.MeshStandardMaterial({ color: '#2b5593', roughness: .64, metalness: .05, vertexColors: true }),
    };
    if (profile.surfaceKind) for (const paint of ['structure', 'shadow', 'deck'] as Paint[]) {
      const material = materials[paint];
      if (profile.mixedWood && paint === 'shadow') { material.metalness = .44; material.roughness = .57; continue; }
      material.metalness = 0; material.roughness = profile.surfaceKind === 'lego' ? .58 : .82;
      if (material instanceof THREE.MeshPhysicalMaterial) material.clearcoat = profile.surfaceKind === 'lego' ? .22 : 0;
    }
    if(profile.topology==='topiary-eiffel')for(const paint of ['structure','shadow','deck'] as Paint[]) {
      materials[paint].metalness=0;materials[paint].roughness=.97;
      const material=materials[paint];if(material instanceof THREE.MeshPhysicalMaterial)material.clearcoat=0;
    }
    if(profile.photoPebbleSurface)for(const paint of ['structure','shadow','deck']as Paint[]){materials[paint].metalness=0;materials[paint].roughness=.95;}
    // These are display treatments. Only heritage uses the photo-derived paint palette.
    if (renderStyle === 'metal') {
      for (const paint of ['structure', 'shadow', 'deck', 'antenna'] as Paint[]) {
        materials[paint].color.set(paint === 'shadow' ? '#687a83' : paint === 'deck' ? '#b0bcc0' : '#a1b3ba');
        materials[paint].metalness = paint === 'shadow' ? .65 : .82;
        materials[paint].roughness = paint === 'shadow' ? .45 : .29;
        materials[paint].envMapIntensity = 1.25;
      }
    } else if (renderStyle === 'porcelain') {
      for (const paint of ['structure', 'shadow', 'deck', 'antenna'] as Paint[]) {
        materials[paint].color.set(paint === 'structure' || paint === 'antenna' ? '#e5e2d5' : '#326799');
        materials[paint].metalness = 0;
        materials[paint].roughness = .24;
        const material = materials[paint];
        if (material instanceof THREE.MeshPhysicalMaterial) { material.clearcoat = .8; material.clearcoatRoughness = .16; }
      }
      materials.glass.color.set('#7cabb8');
    } else if (renderStyle === 'blueprint') {
      for (const paint of Object.keys(materials) as Paint[]) {
        const material = materials[paint];
        material.color.set(paint === 'shadow' || paint === 'antenna' ? '#98d5ed' : paint === 'stone' ? '#153b65' : '#347bba');
        material.metalness = .05; material.roughness = .76;
        material.emissive.set(paint === 'shadow' ? '#286989' : '#0b2340');
        material.emissiveIntensity = .36;
      }
      materials.glass.opacity = .20;
    } else if (renderStyle === 'illuminated') {
      const scheme = nightScheme(profile.key);
      const referenced = scheme.basis !== 'artistic';
      for (const paint of [...['structure', 'shadow', 'deck', 'antenna'], ...(profile.nightSurfaceWash ? ['stone'] : [])] as Paint[]) {
        const material = materials[paint];
        if (referenced) material.color.set(paint === 'shadow' ? '#333441' : '#8c8b95');
        material.emissive.set('#ffffff');
        material.emissiveIntensity = paint === 'stone' ? profile.nightSurfaceWash! : (paint === 'shadow' ? .20 : paint === 'deck' ? .62 : .54) * (referenced ? 1 : .90);
        if(paint !== 'stone') { material.metalness = .32; material.roughness = .49; }
        material.onBeforeCompile = shader => {
          Object.assign(shader.uniforms, illumination);
          shader.vertexShader = 'attribute vec3 nightTint; varying vec3 vNightTint; varying float vNightHeight; varying float vNightAngle;\n' + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvNightTint = nightTint; vNightHeight = position.y; vNightAngle = atan(position.z, position.x);');
          shader.fragmentShader = 'varying vec3 vNightTint; varying float vNightHeight;\n' + NIGHT_PROGRAMME_GLSL + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= programmeColor(vNightTint, vNightHeight) * programmeBrightness(vNightHeight);');
        };
        material.customProgramCacheKey = () => 'worldecho-night-programme-v3-vivid';
      }
      materials.glass.color.set('#293c50'); materials.glass.emissive.set(scheme.windows);
      materials.glass.emissiveIntensity = .28; materials.glass.opacity = .62;
      if(!profile.nightSurfaceWash) { materials.stone.emissive.set(scheme.colors[0]); materials.stone.emissiveIntensity = .08; }
      materials.enamel.emissive.copy(materials.enamel.color); materials.enamel.emissiveIntensity = .06;
      materials.clock.emissive.set(scheme.windows); materials.clock.emissiveIntensity = .12;
    }
    applyNaturalTopiaryMaterials(materials, profile, renderStyle);
    const naturalStone = profile.key === 'us-gasquet-gasquet-market' && profile.photoPebbleSurface;
    if(naturalStone) applyGasquetStoneMaterials(materials, renderStyle);
    // Object-space microfinish is a display material, never evidence of weathering.
    // Detail-only and derivative-filtered: the overview silhouette stays inexpensive
    // and subpixel grain fades away rather than sparkling during orbit/zoom.
    if (detail === 'detail' && renderStyle !== 'blueprint') {
      for (const paint of ['structure', 'shadow', 'deck', 'stone', 'antenna'] as Paint[]) {
        if(isNaturalTopiaryKey(profile.key) && ['structure','shadow','deck'].includes(paint))continue;
        const wood = (profile.surfaceKind === 'wood' || profile.surfaceKind === 'bamboo' || profile.surfaceKind === 'woven')
          && ['structure', 'shadow', 'deck'].includes(paint) && !(profile.mixedWood && paint === 'shadow');
        const kind = paint === 'stone' || (naturalStone && paint === 'shadow') ? 'stone' : wood && renderStyle === 'heritage' ? 'wood' : 'paint';
        applyMicrofinish(materials[paint], kind, renderStyle);
      }
    }
    let primitiveCount = 0;
    let vertexCount = 0;
    let triangleCount = 0;
    for (const [paint, bucket] of this.buckets) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(bucket.positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(bucket.uvs, 2));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(bucket.colors, 3));
      if (renderStyle === 'illuminated') {
        const scheme = nightScheme(profile.key), tint: number[] = [];
        for (let i = 1; i < bucket.positions.length; i += 3) {
          const c = nightColor(scheme, bucket.positions[i]); tint.push(c.r, c.g, c.b);
        }
        geometry.setAttribute('nightTint', new THREE.Float32BufferAttribute(tint, 3));
      }
      if (renderStyle === 'heritage' && profile.colorBands && ['structure', 'shadow', 'deck'].includes(paint)) {
        const colors = geometry.getAttribute('color'), positions = geometry.getAttribute('position');
        for (let i = 0; i < positions.count; i += 1) {
          const band = profile.colorBands.find(band => positions.getY(i) <= band.maxY) ?? profile.colorBands.at(-1)!;
          const color = new THREE.Color(band.color), shade = colors.getX(i);
          colors.setXYZ(i, color.r * shade, color.g * shade, color.b * shade);
        }
      }
      geometry.setIndex(bucket.indices);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      // Taastrup's broad strip topology crosses 65,535 vertices in one paint batch.
      // Keep these batches on 16-bit indices; triangle positions and attributes are preserved.
      const parts = profile.flatMainMembers || isNaturalTopiaryKey(profile.key) ? partitionUint16Geometry(geometry) : [geometry];
      for (let part = 0; part < parts.length; part += 1) {
        const mesh = new THREE.Mesh(parts[part], materials[paint]);
        mesh.name = `${profile.key}-${paint}${parts.length > 1 ? `-batch-${part}` : ''}`;
        mesh.castShadow = paint !== 'glass';
        mesh.receiveShadow = true;
        group.add(mesh);
      }
      primitiveCount += bucket.primitiveCount;
      vertexCount += bucket.positions.length / 3;
      triangleCount += bucket.indices.length / 3;
    }
    for (const paint of Object.keys(materials) as Paint[]) {
      if (!this.buckets.has(paint)) materials[paint].dispose();
    }
    group.updateMatrixWorld(true);
    const before = new THREE.Box3().setFromObject(group);
    const height = before.max.y - before.min.y;
    const normalise = new THREE.Matrix4().makeTranslation(0, -before.min.y, 0);
    normalise.premultiply(new THREE.Matrix4().makeScale(1 / height, 1 / height, 1 / height));
    for (const child of group.children) {
      const mesh = child as THREE.Mesh;
      mesh.geometry.applyMatrix4(normalise);
      if(profile.photoDepthScale!==undefined)mesh.geometry.scale(1,1,profile.photoDepthScale);
      if (renderStyle === 'illuminated') {
        const scheme = nightScheme(profile.key);
        if (scheme.heightStops?.length) {
          // Rebind only opt-in schemes after normalization, so raised supports
          // and nonstandard crowns share the same 0..1 zones as light discs.
          const positions = mesh.geometry.getAttribute('position');
          const tint = mesh.geometry.getAttribute('nightTint');
          for (let i = 0; i < positions.count; i += 1) {
            const color = nightColor(scheme, positions.getY(i));
            tint.setXYZ(i, color.r, color.g, color.b);
          }
        }
      }
      mesh.geometry.computeBoundingBox();
      mesh.geometry.computeBoundingSphere();
    }
    group.userData = {
      modelKey: profile.key, entityId: MODEL_ENTRIES.get(profile.key)?.entityId, detail, renderStyle,
      modelVersion: 'towerworld-procedural-v8-dynamic-night', profileVersion: modelBatch.version,
      normalizationScope: MODEL_ENTRIES.get(profile.key)?.normalizationScope ?? (profile.topology === 'roof-section' ? 'visible-section' : 'whole-model'),
      height: 1, groundY: 0, axis: '+Y', frontAxis: '+Z', resources: 'owned-by-this-group',
      beamCount: this.beamCount, primitiveCount, vertexCount, triangleCount,
      drawCalls: group.children.length,
      reference: profile.key === 'paris' ? '2023 photos + SETE 330/125/25/57/115/276m anchors'
        : `photo-derived ${profile.key} variant; proportions below engineering detail remain estimated`,
    };
    if (renderStyle === 'illuminated') addIllumination(group, detail);
    return group;
  }
}

/** Preserve indexed triangle order while limiting a batch to Uint16-addressable vertices. */
function partitionUint16Geometry(source: THREE.BufferGeometry): THREE.BufferGeometry[] {
  const index = source.index;
  if (!index || source.getAttribute('position').count <= 60000) return [source];
  const names = Object.keys(source.attributes), chunks: THREE.BufferGeometry[] = [];
  let remap = new Map<number, number>(), localIndices: number[] = [];
  let values = new Map(names.map(name => [name, [] as number[]]));
  const flush = () => {
    if (!localIndices.length) return;
    const geometry = new THREE.BufferGeometry();
    for (const name of names) geometry.setAttribute(name, new THREE.Float32BufferAttribute(values.get(name)!, source.getAttribute(name).itemSize));
    geometry.setIndex(new THREE.Uint16BufferAttribute(localIndices, 1));
    geometry.computeBoundingBox(); geometry.computeBoundingSphere(); chunks.push(geometry);
    remap = new Map(); localIndices = []; values = new Map(names.map(name => [name, [] as number[]]));
  };
  for (let triangle = 0; triangle < index.count; triangle += 3) {
    const vertices = [index.getX(triangle), index.getX(triangle + 1), index.getX(triangle + 2)];
    const missing = vertices.filter((vertex, i) => !remap.has(vertex) && vertices.indexOf(vertex) === i).length;
    if (remap.size + missing > 60000) flush();
    for (const vertex of vertices) {
      let local = remap.get(vertex);
      if (local === undefined) {
        local = remap.size; remap.set(vertex, local);
        for (const name of names) {
          const attribute = source.getAttribute(name), out = values.get(name)!;
          for (let component = 0; component < attribute.itemSize; component += 1) out.push(attribute.getComponent(vertex, component));
        }
      }
      localIndices.push(local);
    }
  }
  flush(); source.dispose(); return chunks;
}

/** One owned Mesh of camera-facing light discs: no textures, per-bulb objects or PointLights. */
function addIllumination(group: THREE.Group, detail: Detail): void {
  const scheme = nightScheme(group.userData.modelKey);
  const illumination = illuminationStates.get(group)!;
  const structureBounds = new THREE.Box3().setFromObject(group);
  const rowCount = detail === 'detail' ? 26 : 18, rowLimit = detail === 'detail' ? 12 : 8;
  const rows: Array<Map<string, THREE.Vector3>> = Array.from({ length: rowCount }, () => new Map());
  const cell = detail === 'detail' ? .008 : .014;
  for (const object of group.children) {
    if (!(object instanceof THREE.Mesh) || /-(glass|clock|enamel)$/.test(object.name)) continue;
    const attribute = object.geometry.getAttribute('position');
    for (let i = 0; i < attribute.count; i += 1) {
      const x = attribute.getX(i), y = attribute.getY(i), z = attribute.getZ(i);
      if (y < .026 || y > .973) continue;
      const row = rows[Math.min(rowCount - 1, Math.floor(y * rowCount))];
      const key = `${Math.round(x / cell)},${Math.round(z / cell)}`;
      const previous = row.get(key);
      if (!previous || x * x + z * z > previous.x * previous.x + previous.z * previous.z) row.set(key, v(x, y, z));
    }
  }
  const lights: THREE.Vector3[] = [];
  for (const row of rows) {
    const candidates = [...row.values()].sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x));
    const count = Math.min(rowLimit, candidates.length);
    for (let i = 0; i < count; i += 1) {
      const point = candidates[Math.floor((i + .5) * candidates.length / count)].clone();
      const outward = v(point.x, 0, point.z);
      if (outward.lengthSq() > 1e-10) point.add(outward.normalize().multiplyScalar(.0011));
      // Small fixture offset prevents self-occlusion; centres remain inside the structural dimensions.
      lights.push(point.clamp(structureBounds.min, structureBounds.max));
    }
  }
  if (!lights.length) return;
  const positions: number[] = [], corners: number[] = [], normals: number[] = [], indices: number[] = [], phases: number[] = [], tints: number[] = [];
  for (const [i, point] of lights.entries()) {
    const phase = (i * 2.3999632297) % (Math.PI * 2);
    for (const corner of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      positions.push(point.x, point.y, point.z); corners.push(...corner); normals.push(0, 0, 1); phases.push(phase);
      const tint = nightColor(scheme, point.y); tints.push(tint.r, tint.g, tint.b);
    }
    const a = i * 4; indices.push(a, a + 1, a + 2, a, a + 2, a + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('lightCorner', new THREE.Float32BufferAttribute(corners, 2));
  geometry.setAttribute('lightPhase', new THREE.Float32BufferAttribute(phases, 1));
  geometry.setAttribute('lightTint', new THREE.Float32BufferAttribute(tints, 3));
  geometry.setIndex(indices); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
    toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
    uniforms: {
      core: { value: new THREE.Color('#f4f6ff') }, strength: { value: scheme.basis === 'artistic' ? 1.12 : 1.22 },
      lightRadius: { value: detail === 'detail' ? .014 : .016 }, viewport: { value: new THREE.Vector2(1, 1) },
      pixelRadius: { value: .65 }, ...illumination,
    },
    vertexShader: `
      attribute vec2 lightCorner; attribute float lightPhase; attribute vec3 lightTint; varying vec3 tint;
      uniform float lightRadius; uniform vec2 viewport; uniform float pixelRadius;
      varying vec2 disc; varying float phase; varying float nightHeight; varying float vNightAngle;
      void main() {
        disc = lightCorner; phase = lightPhase; tint = lightTint; nightHeight = position.y; vNightAngle = atan(position.z, position.x);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec4 projected = projectionMatrix * mv;
        float scale = length(modelMatrix[0].xyz);
        vec2 physical = vec2(projectionMatrix[0][0], projectionMatrix[1][1]) * lightRadius * scale;
        vec2 minimum = vec2(2.0 * pixelRadius) / viewport * projected.w;
        projected.xy += lightCorner * max(physical, minimum);
        gl_Position = projected;
      }`,
    fragmentShader: NIGHT_PROGRAMME_GLSL + `
      uniform vec3 core; uniform float strength; varying vec3 tint;
      varying vec2 disc; varying float phase; varying float nightHeight;
      void main() {
        float r2 = dot(disc, disc);
        if (r2 > 1.0) discard;
        float centre = exp(-r2 * 65.0);
        float halo = exp(-r2 * 5.0) * (1.0 - smoothstep(0.68, 1.0, r2));
        vec3 glow = programmeColor(tint, nightHeight);
        float brightness = programmeBrightness(nightHeight);
        if (nightMotion > .5 && nightKind > .5 && nightKind < 1.5) {
          // Fixed per-fixture phase gives independent white sparkles without CPU randomness.
          float sparkle = pow(max(0.0, sin(nightSeconds * 2.1 + phase * 2.3)), 7.0);
          glow = mix(glow, core, .92); brightness *= .08 + 3.20 * sparkle;
        } else if (nightMotion > .5 && nightKind > 2.5 && nightKind < 3.5) {
          float pulse = pow(max(0.0, sin(nightSeconds * 1.1 + phase)), 8.0);
          glow = mix(glow, core, pulse); brightness *= .55 + .90 * pulse;
        } else if (nightMotion > .5 && nightKind > 5.5 && (nightKind < 9.5 || nightKind > 10.5)) {
          float travelling = pow(.5 + .5 * sin(nightHeight * 16.0 - artTime() * 1.2 + phase * .35), 4.0);
          float glimmer = pow(.5 + .5 * sin(artTime() * 1.0 + phase * 2.3), 6.0);
          float accent = nightKind > 7.5 && nightKind < 8.5 ? glimmer : travelling;
          glow = mix(glow, core, accent * .50); brightness *= .18 + 1.80 * accent;
        }
        gl_FragColor = vec4(mix(glow, core, centre * .65), (halo * 0.64 + centre * 0.80) * brightness * strength);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `${group.userData.modelKey}-illuminated-lights`;
  mesh.userData.displayDecoration = 'artistic-illumination';
  mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.onBeforeRender = renderer => {
    renderer.getDrawingBufferSize(material.uniforms.viewport.value);
    material.uniforms.pixelRadius.value = .65 * renderer.getPixelRatio();
  };
  group.add(mesh);
  group.userData.lightPointCount = lights.length;
  group.userData.baseTriangleCount = group.userData.triangleCount;
  group.userData.triangleCount += indices.length / 3;
  group.userData.vertexCount += positions.length / 3;
  group.userData.drawCalls = group.children.length;
  group.userData.illuminationScope = 'artistic-treatment-not-site-lighting-survey';
  group.userData.illumination = getTowerIllumination(group.userData.modelKey);
}

const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const lerp = THREE.MathUtils.lerp;

function stations(p: TowerProfile): Station[] {
  if (p.customStations) return p.customStations;
  const c0 = (p.baseWidth - p.footWidth) / 2;
  if (p.key === 'texas' || p.key === 'montmartre' || p.key === 'kings-island' || p.linearLegs) {
    // Texas's uncomplicated welded legs read as straight truss segments, not curved Paris girders.
    return [{ y: .005, c: c0, w: p.footWidth, linear: true },
      { y: p.first.y, c: p.firstCentre, w: p.firstSection },
      { y: p.second.y, c: p.secondCentre, w: p.secondSection },
      { y: p.upperEnd, c: p.upperCentre, w: p.upperSection }];
  }
  if (p.key === 'parque-europa') {
    // Round4 frontal photo shows a long near-parallel upper stem below the open crown.
    return [{ y: .005, c: c0, w: p.footWidth },
      { y: p.first.y * .5, c: lerp(c0, p.firstCentre, .55), w: p.footWidth * .63 },
      { y: p.first.y, c: p.firstCentre, w: p.firstSection },
      { y: p.second.y, c: p.secondCentre, w: p.secondSection },
      { y: .615, c: .0152, w: .0034 },
      { y: .740, c: .0144, w: .0033 },
      { y: p.upperEnd, c: p.upperCentre, w: p.upperSection }];
  }
  return [
    { y: .005, c: c0, w: p.footWidth - p.mainWidth },
    { y: p.first.y * .40, c: lerp(c0, p.firstCentre, p.curve), w: lerp(p.footWidth, p.firstSection, .51) },
    { y: p.first.y * .75, c: lerp(c0, p.firstCentre, .86), w: lerp(p.footWidth, p.firstSection, .84) },
    { y: p.first.y, c: p.firstCentre, w: p.firstSection },
    { y: lerp(p.first.y, p.second.y, .50), c: lerp(p.firstCentre, p.secondCentre, .59), w: lerp(p.firstSection, p.secondSection, .55) },
    { y: p.second.y, c: p.secondCentre, w: p.secondSection },
    { y: lerp(p.second.y, p.upperEnd, .38), c: lerp(p.secondCentre, p.upperCentre, .49), w: lerp(p.secondSection, p.upperSection, .49) },
    { y: lerp(p.second.y, p.upperEnd, .74), c: lerp(p.secondCentre, p.upperCentre, .81), w: lerp(p.secondSection, p.upperSection, .81) },
    { y: p.upperEnd, c: p.upperCentre, w: p.upperSection },
  ];
}

/** Shape-preserving cubic interpolation: curved pylon chords, no Catmull-Rom overshoot. */
function interpolate(ss: Station[], y: number, field: 'c' | 'w'): number {
  if (y <= ss[0].y) return ss[0][field];
  if (y >= ss[ss.length - 1].y) return ss[ss.length - 1][field];
  const index = ss.findIndex((s, i) => i < ss.length - 1 && y >= s.y && y <= ss[i + 1].y);
  const a = ss[index], b = ss[index + 1];
  if (ss[0].linear) return lerp(a[field], b[field], (y - a.y) / (b.y - a.y));
  const secant = (b[field] - a[field]) / (b.y - a.y);
  const tangent = (i: number): number => {
    if (i === 0 || i === ss.length - 1) return secant;
    const left = (ss[i][field] - ss[i - 1][field]) / (ss[i].y - ss[i - 1].y);
    const right = (ss[i + 1][field] - ss[i][field]) / (ss[i + 1].y - ss[i].y);
    if (left * right <= 0) return 0;
    return 2 * left * right / (left + right);
  };
  const t = (y - a.y) / (b.y - a.y), h = b.y - a.y;
  return (2 * t ** 3 - 3 * t ** 2 + 1) * a[field]
    + (t ** 3 - 2 * t ** 2 + t) * h * tangent(index)
    + (-2 * t ** 3 + 3 * t ** 2) * b[field]
    + (t ** 3 - t ** 2) * h * tangent(index + 1);
}

function sectionCorners(ss: Station[], y: number, sx: number, sz: number): THREE.Vector3[] {
  const c = interpolate(ss, y, 'c'), w = interpolate(ss, y, 'w');
  return [v(sx * c - w / 2, y, sz * c - w / 2), v(sx * c + w / 2, y, sz * c - w / 2),
    v(sx * c + w / 2, y, sz * c + w / 2), v(sx * c - w / 2, y, sz * c + w / 2)];
}
function outerCorners(ss: Station[], y: number): THREE.Vector3[] {
  const r = interpolate(ss, y, 'c') + interpolate(ss, y, 'w') / 2;
  return [v(-r, y, -r), v(r, y, -r), v(r, y, r), v(-r, y, r)];
}
function subdivided(start: number, end: number, count: number): number[] {
  return Array.from({ length: count + 1 }, (_, i) => lerp(start, end, i / count));
}

function latticeFace(b: ModelBuilder, loA: THREE.Vector3, loB: THREE.Vector3,
  hiA: THREE.Vector3, hiB: THREE.Vector3, columns: number, width: number, detail: boolean, flat = false, pattern: 'cross' | 'ladder' = 'cross', paint: Paint = 'structure'): void {
  const normal = loB.clone().sub(loA).cross(hiA.clone().sub(loA)).normalize();
  const member = (a: THREE.Vector3, z: THREE.Vector3, w: number, memberPaint: Paint = paint) => {
    if (flat) b.strip(a, z, w, normal, memberPaint); else b.beam(a, z, w, memberPaint);
  };
  member(loA, loB, width * 1.20);
  if (pattern === 'ladder') {
    member(hiA, hiB, width * .82);
    for (let column = 1; column < columns; column += 1) member(loA.clone().lerp(loB, column / columns), hiA.clone().lerp(hiB, column / columns), width * .72);
    return;
  }
  for (let column = 0; column < columns; column += 1) {
    const t0 = column / columns, t1 = (column + 1) / columns;
    const a = loA.clone().lerp(loB, t0), d = loA.clone().lerp(loB, t1);
    const c = hiA.clone().lerp(hiB, t0), f = hiA.clone().lerp(hiB, t1);
    member(a, f, width);
    member(d, c, width);
    if (column > 0) member(a, c, width * .95, 'shadow');
    if (detail && columns > 1) {
      const mid = a.clone().lerp(f, .5);
      member(mid, d.clone().lerp(f, .5), width * .66, 'shadow');
      member(mid, a.clone().lerp(c, .5), width * .66, 'shadow');
    }
  }
}

function buildPylons(b: ModelBuilder, p: TowerProfile, ss: Station[], detail: Detail): void {
  const high = detail === 'detail';
  const shaftFrom=p.upperShaftFrom??p.second.y;
  const sparse = p.key === 'texas' || p.key === 'karachi' || p.key === 'bloemfontein' || p.key === 'kings-island' || p.flatLattice || p.latticeSparse;
  const lower = subdivided(.005, p.first.y, p.lowerBays ?? (p.key === 'texas' ? 4 : sparse ? (high ? 8 : 5) : high ? 11 : 7));
  const middle = shaftFrom>p.first.y ? subdivided(p.first.y, shaftFrom, p.middleBays ?? (p.key === 'texas' ? 3 : sparse ? (high ? 5 : 4) : high ? 9 : 6)).slice(1) : [];
  const upper = subdivided(shaftFrom, p.upperEnd, high ? p.upperBays : Math.ceil(p.upperBays / 2)).slice(1);
  const levels = [...lower, ...middle];
  // Primary silhouettes use the same samples in both LODs. Only their cross-section and infill change.
  const chordLevels = [...subdivided(.005, p.first.y, 16), ...(shaftFrom>p.first.y?subdivided(p.first.y, shaftFrom, 12).slice(1):[])];
  const braceWidth = p.latticeWidth * (high ? 1 : 1.16);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const footCentre = (p.baseWidth - p.footWidth) / 2;
    const foundationHeight = p.foundationHeight ?? .005;
    if (p.foundationShape === 'round') b.cylinder(p.footWidth * .56, p.footWidth * .56, 0, foundationHeight,
      'stone', high ? 20 : 12, sx * footCentre, sz * footCentre);
    else b.box(p.footWidth * .97, foundationHeight, p.footWidth * .97, v(sx * footCentre, foundationHeight / 2, sz * footCentre), 'stone');
    if(p.footPanelHeight){
      const lower=sectionCorners(ss,.005,sx,sz),upper=sectionCorners(ss,p.footPanelHeight,sx,sz);
      for(let face=0;face<4;face+=1)b.surface([lower[face],lower[(face+1)%4],upper[(face+1)%4],upper[face]],[0,1,2,0,2,3],'structure');
    }
    for (let j = 0; j < chordLevels.length - 1; j += 1) {
      const y0 = chordLevels[j], y1 = chordLevels[j + 1];
      const lo = sectionCorners(ss, y0, sx, sz), hi = sectionCorners(ss, y1, sx, sz);
      for (let corner = 0; corner < 4; corner += 1) {
        const width = p.mainWidth * lerp(1, .39, y0 / p.upperEnd);
        if (high && y0 < p.first.y && (p.key === 'paris' || p.key === 'shenzhen' || p.key === 'macao' || p.key === 'las-vegas' || p.ornateArches)) {
          b.girder(lo[corner], hi[corner], width, width * .88);
        }
        else if (p.flatMainMembers) {
          // Taastrup's primary members are broad fabricated angles, not narrow square rods.
          b.strip(lo[corner], hi[corner], width, v(0, 0, 1));
          b.strip(lo[corner], hi[corner], width * .78, v(1, 0, 0));
        } else b.beam(lo[corner], hi[corner], width, 'structure', width * .88);
      }
    }
    for (let j = 0; j < levels.length - 1; j += 1) {
      const y0 = levels[j], y1 = levels[j + 1];
      const lo = sectionCorners(ss, y0, sx, sz), hi = sectionCorners(ss, y1, sx, sz);
      const columns = high && !sparse ? 2 : 1;
      for (let face = 0; face < 4; face += 1) {
        latticeFace(b, lo[face], lo[(face + 1) % 4], hi[face], hi[(face + 1) % 4],
          columns, braceWidth, high, p.flatLattice, p.lowerLatticePattern ?? p.latticePattern, p.latticePaint);
      }
    }
  }
  // Above the second floor the tower becomes one open quadrilateral shaft.
  const upperLevels = [shaftFrom, ...upper];
  for (let j = 0; j < upperLevels.length - 1; j += 1) {
    const lo = outerCorners(ss, upperLevels[j]), hi = outerCorners(ss, upperLevels[j + 1]);
    for (let corner = 0; corner < 4; corner += 1) {
      const chordWidth = p.mainWidth * lerp(.74, .37,
        (upperLevels[j] - shaftFrom) / (p.upperEnd - shaftFrom));
      if (p.flatMainMembers) {
        b.strip(lo[corner], hi[corner], chordWidth, v(0, 0, 1));
        b.strip(lo[corner], hi[corner], chordWidth * .78, v(1, 0, 0));
      } else b.beam(lo[corner], hi[corner], chordWidth, 'structure', chordWidth * .88);
    }
    const width = lo[0].distanceTo(lo[1]);
    const columns = sparse || p.key === 'parque-europa' ? 1
      : high ? Math.max(1, Math.min(2, Math.round(width / .038))) : 1;
    for (let face = 0; face < 4; face += 1) {
      latticeFace(b, lo[face], lo[(face + 1) % 4], hi[face], hi[(face + 1) % 4],
        columns, braceWidth * .91, high, p.flatLattice, p.latticePattern, p.latticePaint);
    }
  }
}

/** Explicit photo-specific filled faces. The irregular ribs are a restrained visual simplification. */
function buildPhotoFilledPanels(b: ModelBuilder, p: TowerProfile, ss: Station[], detail: Detail): void {
  const levels = [...subdivided(.005, p.first.y, 9), ...subdivided(p.first.y, p.second.y, 7).slice(1)];
  const panel = (lo: THREE.Vector3[], hi: THREE.Vector3[], row: number) => {
    for (let face = 0; face < 4; face += 1) {
      const a = lo[face], z = lo[(face + 1) % 4], c = hi[face], d = hi[(face + 1) % 4];
      b.surface([a,z,d,c],[0,1,2,0,2,3],'clock');
      const t = row % 3 === 0 ? .31 : row % 3 === 1 ? .67 : .48;
      const mid = a.clone().lerp(z,t).lerp(c.clone().lerp(d,1-t),.47);
      for (const point of [a,z,c,d]) b.beam(point,mid,p.latticeWidth*.66,'structure');
    }
  };
  for (const sx of [-1,1]) for (const sz of [-1,1]) for(let i=0;i<levels.length-1;i++) {
    panel(sectionCorners(ss,levels[i],sx,sz),sectionCorners(ss,levels[i+1],sx,sz),i);
  }
  const upper=subdivided(p.second.y,p.upperEnd,detail==='detail'?34:20);
  for(let i=0;i<upper.length-1;i++)panel(outerCorners(ss,upper[i]),outerCorners(ss,upper[i+1]),i);
}

function buildPhotoMarks(b: ModelBuilder, p: TowerProfile): void {
  if(p.photoCube){const cube=p.photoCube;b.box(cube.size,cube.size,cube.size,v(0,cube.y,0),cube.paint);}
  if(p.photoTurbine) {
    const t=p.photoTurbine;
    b.box(.033,.028,.066,v(0,t.y,0),'deck');
    for(let i=0;i<t.blades;i++) {
      const a=i*Math.PI*2/t.blades+.11,rotation=new THREE.Quaternion().setFromAxisAngle(v(0,0,1),-a);
      b.box(t.radius*.23,t.radius*.77,.004,v(Math.sin(a)*t.radius*.62,t.y+Math.cos(a)*t.radius*.62,.040),'deck',rotation);
    }
    b.beam(v(0,t.y,-.028),v(0,t.y,-t.tailLength),.004,'shadow');
    b.box(.065,.037,.003,v(0,t.y+.016,-t.tailLength),'deck');
    b.beam(v(0,p.upperEnd,0),v(0,t.y-.012,0),.011,'structure');
  }
  if(p.photoSymbol) {
    const s=p.photoSymbol,r=s.width/2,paint=s.paint??'deck',centre=v(0,s.y,0);
    const point=(x:number,y:number)=>v(x,s.y+y,.002);
    if(s.kind==='peace'||s.kind==='sunburst') {
      for(let i=0;i<32;i++){const a=i*Math.PI/16,z=(i+1)*Math.PI/16;b.beam(point(r*Math.cos(a),r*Math.sin(a)),point(r*Math.cos(z),r*Math.sin(z)),.002,paint);}
      if(s.kind==='peace'){b.beam(point(0,-r),point(0,r),.002,paint);for(const sign of[-1,1])b.beam(centre,point(sign*r*.70,-r*.70),.002,paint);}
      else for(let i=0;i<12;i++){const a=i*Math.PI/6;b.beam(point(r*.35*Math.cos(a),r*.35*Math.sin(a)),point(r*1.32*Math.cos(a),r*1.32*Math.sin(a)),.0013,paint);}
    } else if(s.kind==='star') {
      const pts=Array.from({length:10},(_,i)=>point((i%2?r*.43:r)*Math.sin(i*Math.PI/5),(i%2?r*.43:r)*Math.cos(i*Math.PI/5)));
      for(let i=0;i<10;i++)b.beam(pts[i],pts[(i+1)%10],.002,paint);
    } else if(s.kind==='cross') {
      b.beam(point(0,-r),point(0,r),.003,paint);b.beam(point(-r*.65,r*.30),point(r*.65,r*.30),.003,paint);
    } else {
      b.beam(point(0,-r),point(0,r),.002,paint);
      for(const sign of[-1,1]){b.beam(point(0,-r),point(sign*r*.7,-r*.2),.002,paint);b.beam(point(sign*r*.7,-r*.2),point(sign*r*.7,r*.8),.002,paint);b.beam(point(sign*r*.7,r*.8),point(sign*r*.2,r*.35),.002,paint);}
    }
  }
  if(p.photoCrown) {
    const crown=p.photoCrown,n=crown.ribs,angleOffset=crown.round?0:Math.PI/4;
    const point=(level:{y:number;r:number},i:number)=>v(Math.cos(i*Math.PI*2/n+angleOffset)*level.r,level.y,Math.sin(i*Math.PI*2/n+angleOffset)*level.r);
    for(let j=0;j<crown.levels.length;j++)for(let i=0;i<n;i++) {
      const level=crown.levels[j];
      b.beam(point(level,i),point(level,(i+1)%n),.0014,'deck');
      if(j>0) {
        const before=crown.levels[j-1];
        b.beam(point(before,i),point(level,i),.0015,'structure');
        if(crown.solid && before.y >= (crown.solidFromY ?? -Infinity))b.surface([point(before,i),point(before,(i+1)%n),point(level,(i+1)%n),point(level,i)],[0,1,2,0,2,3],'deck');
      }
    }
    if(crown.needleFrom!==undefined)b.cylinder(crown.needleWidth??.0013,.0003,crown.needleFrom,1,'antenna',6);
  }
  if(p.photoDiamondCrown) {
    const y=p.upperEnd,room=1-y,w=p.topWidth??.071;
    squareRing(b,y,w*.71,w*.42,.003,'deck');
    for(const sx of[-1,1])for(const sz of[-1,1])b.beam(v(sx*w*.29,y,sz*w*.29),v(sx*w*.29,y+room*.24,sz*w*.29),.0018);
    b.taperedSquare(.004,w,y+room*.26,y+room*.53,'deck');
    b.taperedSquare(w,w*.68,y+room*.53,y+room*.62,'deck');
    needle(b,y+room*.62,.0009);
  }
  if (p.photoBiplane) {
    // Cascina's photographed red biplane replaces an Eiffel transmission crown.
    b.box(.010,.010,.082,v(0,.970,0),'enamel');
    for(const y of [.966,.991])b.box(.109,.003,.023,v(0,y,-.010),'enamel');
    b.box(.043,.0025,.014,v(0,.973,.035),'enamel');
    b.box(.003,.019,.022,v(0,.981,.034),'enamel');
    for(const x of [-.037,.037])for(const z of [-.018,-.002])b.beam(v(x,.967,z),v(x,.990,z),.0013,'enamel');
    b.beam(v(0,.951,-.044),v(0,.992,-.044),.0014,'shadow');
    b.beam(v(0,p.upperEnd,0),v(0,.968,0),.0015,'shadow');
  }
  if (p.photoRoundSign) {
    const s=p.photoRoundSign;
    b.ellipsoid(s.radius,s.radius,.0018,v(0,s.y,0),new THREE.Quaternion(),s.paint,32);
  }
  if (p.photoArrow) {
    const a=p.photoArrow,w=a.width/2,h=a.height/2,z=a.depth;
    const pts=[v(-w,a.y-h*.45,z),v(w*.38,a.y-h*.45,z),v(w*.20,a.y-h,z),v(w,a.y,z),v(w*.20,a.y+h,z),v(w*.38,a.y+h*.45,z),v(-w,a.y+h*.45,z)];
    b.surface(pts,[0,1,6,1,5,6,1,2,3,1,3,5,3,4,5],a.paint);
  }
  const text=p.photoLettering;
  if(!text)return;
  const glyphs:Record<string,number[][][]>={
    P:[[[0,0],[0,1],[.8,1],[1,.8],[.8,.55],[0,.55]]],
    A:[[[0,0],[.5,1],[1,0]],[[.2,.4],[.8,.4]]],
    R:[[[0,0],[0,1],[.8,1],[1,.8],[.8,.55],[0,.55]],[[.45,.55],[1,0]]],
    I:[[[.15,1],[.85,1]],[[.5,1],[.5,0]],[[.15,0],[.85,0]]],
    S:[[[1,.93],[.8,1],[.15,1],[0,.72],[.85,.40],[1,.16],[.8,0],[0,0]]],
    '2':[[[0,.8],[.2,1],[.8,1],[1,.8],[.9,.65],[0,0],[1,0]]],
    '4':[[[.8,0],[.8,1],[0,.35],[1,.35]]],
  };
  const count=text.text.length,cw=text.vertical?text.width:text.width/count*.78,ch=text.vertical?text.height/count*.82:text.height;
  for(let index=0;index<count;index++) {
    const x=text.vertical?-cw/2:-text.width/2+index*text.width/count;
    const y=text.vertical?text.y+text.height/2-(index+1)*text.height/count:text.y-ch/2;
    for(const line of glyphs[text.text[index]]??[]) for(let i=0;i<line.length-1;i++){
      const a=line[i],z=line[i+1];
      b.beam(v(x+a[0]*cw,y+a[1]*ch,text.depth),v(x+z[0]*cw,y+z[1]*ch,text.depth),Math.min(cw,ch)*.075,text.paint);
    }
  }
}

function buildGardenLamp(b:ModelBuilder,p:TowerProfile,detail:Detail):void {
  const ss=stations(p),steps=detail==='detail'?42:25;
  for(const sx of [-1,1])for(const sz of [-1,1])for(let i=0;i<steps;i++) {
    const y0=i/steps*.966,y1=(i+1)/steps*.966;
    b.beam(v(sx*interpolate(ss,y0,'c'),y0,sz*interpolate(ss,y0,'c')),
      v(sx*interpolate(ss,y1,'c'),y1,sz*interpolate(ss,y1,'c')),.005,'structure');
  }
  for(const s of[p.first,p.second,...p.extraPlatforms??[]])squareRing(b,s.y,s.width,s.width-.006,.004,'structure');
  if(p.gardenFrameOnly){buildTop(b,p,detail);return;}
  b.ellipsoid(.018,.019,.018,v(0,.979,0),new THREE.Quaternion(),'stone',16);
  b.ellipsoid(.051,.050,.051,v(0,.143,0),new THREE.Quaternion(),'stone',20);
  b.beam(v(0,.143,0),v(0,.216,0),.002,'structure');
}

function buildPhotoTimber(b:ModelBuilder,p:TowerProfile,detail:Detail):void {
  const ss=stations(p);
  for(const sx of[-1,1])for(const sz of[-1,1]) {
    const lo=v(sx*(p.baseWidth-p.footWidth)/2,.006,sz*(p.baseWidth-p.footWidth)/2);
    const mid=v(sx*p.firstCentre,p.first.y,sz*p.firstCentre),upper=v(sx*p.secondCentre,p.second.y,sz*p.secondCentre);
    b.beam(lo,mid,.027,'structure',.018);b.beam(mid,upper,.020,'structure',.014);
  }
  for(let side=0;side<4;side++) {
    const lo=p.firstCentre,hi=p.secondCentre;
    b.beam(facePoint(-lo,p.first.y,side,lo),facePoint(hi,p.second.y,side,hi),.006,'structure');
    b.beam(facePoint(lo,p.first.y,side,lo),facePoint(-hi,p.second.y,side,hi),.006,'structure');
    b.beam(facePoint(-hi,p.second.y,side,hi),facePoint(-p.upperCentre,p.upperEnd,side,p.upperCentre),.010,'structure',.007);
    const levels=subdivided(p.second.y,p.upperEnd,p.photoTimberUpperBays??6);
    for(let i=0;i<levels.length-1;i++) {
      const y0=levels[i],y1=levels[i+1],r0=interpolate(ss,y0,'c'),r1=interpolate(ss,y1,'c');
      b.beam(facePoint(i%2?r0:-r0,y0,side,r0),facePoint(i%2?-r1:r1,y1,side,r1),.0045,'structure');
      if(p.photoTimberCross)b.beam(facePoint(i%2?-r0:r0,y0,side,r0),facePoint(i%2?r1:-r1,y1,side,r1),.0045,'structure');
    }
  }
  buildArches(b,p,ss,detail);buildPlatform(b,p,p.first,detail);buildPlatform(b,p,p.second,detail);buildTop(b,p,detail);
}

function isNaturalTopiaryKey(key:string):boolean {
  return key==='ca-beloeil-cypress-tree'||key==='us-kings-island-ohio-eiffel-tower-topiary';
}

/** Stable, synchronous foliage meshes; no external textures or per-leaf Object3D. */
function buildNaturalTopiary(b:ModelBuilder,p:TowerProfile,detail:Detail):void {
  const cypress=p.key==='ca-beloeil-cypress-tree',ss=stations(p);
  type Part={id:number;lo:number;hi:number;centre:(y:number)=>THREE.Vector3;radius:(y:number)=>number};
  type Data={points:THREE.Vector3[];indices:number[];colors:number[]};
  const batches=new Map<Paint,Data>();
  const baseColors={structure:new THREE.Color(p.paint),shadow:new THREE.Color(p.dark),deck:new THREE.Color(p.deckPaint)};
  const palette=(cypress?['#293d26','#36502c','#425d31','#506b38','#637843']:['#335b2a','#426e2e','#528039','#679441','#7da44f']).map(s=>new THREE.Color(s));
  const random=(initial:number)=>{let seed=initial|0;return()=>{seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};};
  const emit=(points:THREE.Vector3[],indices:number[],paint:'structure'|'shadow'|'deck',color:THREE.Color,shades:number[]=[])=>{
    let data=batches.get(paint);if(!data){data={points:[],indices:[],colors:[]};batches.set(paint,data);}
    const offset=data.points.length,base=baseColors[paint];data.points.push(...points);data.indices.push(...indices.map(i=>i+offset));
    for(let i=0;i<points.length;i++){const shade=shades[i]??1;data.colors.push(color.r*shade/Math.max(base.r,.01),color.g*shade/Math.max(base.g,.01),color.b*shade/Math.max(base.b,.01));}
  };
  const top=p.upperEnd+.018,capFrom=p.upperEnd-(cypress?.041:.021);
  const shaftRadius=(y:number)=>Math.max((interpolate(ss,Math.min(y,p.upperEnd),'c')+interpolate(ss,Math.min(y,p.upperEnd),'w')*.5)*1.12,.012);
  const parts:Part[]=[];
  const merge=(y:number)=>{const t=THREE.MathUtils.clamp((y-(p.second.y-.070))/.080,0,1);return t*t*(3-2*t);};
  for(const sx of[-1,1])for(const sz of[-1,1])parts.push({id:parts.length,lo:.005,hi:p.second.y+.028,
    centre:y=>{const c=interpolate(ss,y,'c')*(1-merge(y));return v(sx*c,y,sz*c);},
    radius:y=>lerp(Math.max(interpolate(ss,y,'w')*.85,p.baseWidth*.045),shaftRadius(y)*.96,merge(y))});
  parts.push({id:4,lo:p.second.y-.085,hi:top,centre:y=>v(0,y,0),radius:y=>y<=capFrom?shaftRadius(y):
    Math.max(.00055,shaftRadius(capFrom)*Math.pow(Math.max(0,1-(y-capFrom)/(top-capFrom)),cypress?.72:.46))});
  // Small upward conifer sprays overlap the main crown. Their uneven
  // reach follows the reference's untrimmed side growth; the clipped Kings
  // Island form deliberately keeps the original continuous outer envelope.
  if(cypress)for(const [lo,hi,angle,reach] of [
    [.17,.24,.9,.052],[.21,.28,3.5,.048],[.28,.35,5.5,.045],
    [.31,.39,2.1,.056],[.37,.45,4.4,.044],[.47,.56,1.4,.022],[.55,.63,3.7,.018],
  ]){
    const radial=v(Math.cos(angle),0,Math.sin(angle)),lower=lo<p.second.y;
    const anchor=(y:number)=>lower?v(Math.sign(radial.x)*interpolate(ss,y,'c'),y,Math.sign(radial.z)*interpolate(ss,y,'c')):v(0,y,0);
    const outer=(y:number)=>lower?Math.max(interpolate(ss,y,'w')*.85,p.baseWidth*.045):shaftRadius(y);
    parts.push({id:parts.length,lo,hi,centre:y=>{
      const t=(y-lo)/(hi-lo);return anchor(y).addScaledVector(radial,outer(y)*(.57+.43*t)+reach*Math.sin(t*Math.PI*.5));
    },radius:y=>{const t=(y-lo)/(hi-lo);return (.015+reach*.27)*Math.pow(Math.max(0,1-t),.64)+.001;}});
  }
  const clip=(q:THREE.Vector3,part:Part,inner=false)=>{
    q.y=THREE.MathUtils.clamp(q.y,part.lo,part.hi);const c=part.centre(q.y),d=v(q.x-c.x,0,q.z-c.z),r=part.radius(q.y)*(inner?.87:1);
    if(d.length()>r)d.setLength(r);return v(c.x+d.x,q.y,c.z+d.z);
  };
  // Dark, inset living volume only. All visible surface texture is thin foliage,
  // not spheres sitting on a smooth full-radius shell.
  for(const part of parts.filter(part=>part.id<5)){
    const sides=10,rows=22,rings:THREE.Vector3[][]=[];
    for(let j=0;j<=rows;j++){
      const y=lerp(part.lo,part.hi,j/rows),centre=part.centre(y),r=part.radius(y)*.61;
      rings.push(Array.from({length:sides},(_,i)=>{const a=i*Math.PI*2/sides,rr=r*(.94+.06*Math.sin(y*27+a*3+part.id));return centre.clone().add(v(Math.cos(a)*rr,0,Math.sin(a)*rr));}));
    }
    for(let j=0;j<rows;j++)for(let i=0;i<sides;i++)emit([rings[j][i],rings[j][(i+1)%sides],rings[j+1][(i+1)%sides],rings[j+1][i]],[0,1,2,0,2,3],'shadow',palette[0],[.43,.48,.53,.46]);
  }
  const segments:Array<{part:Part;y0:number;y1:number;end:number}>=[];let area=0;
  for(const part of parts)for(let j=0;j<24;j++){
    const y0=lerp(part.lo,part.hi,j/24),y1=lerp(part.lo,part.hi,(j+1)/24);
    area+=(part.radius(y0)+part.radius(y1))*.5*part.centre(y0).distanceTo(part.centre(y1));segments.push({part,y0,y1,end:area});
  }
  const scatter=(count:number,fine:boolean,seed:number,branchesOnly=false)=>{
    const choices=branchesOnly?segments.filter(s=>s.part.id>=5):segments.filter(s=>s.part.id<5);
    const weights=choices.map(s=>(s.part.radius(s.y0)+s.part.radius(s.y1))*.5*s.part.centre(s.y0).distanceTo(s.part.centre(s.y1)));
    const sum=weights.reduce((a,b)=>a+b,0);
    const rnd=random(seed);let emitted=0;
    for(let attempt=0;emitted<count&&attempt<count*12;attempt++){
      let target=rnd()*sum,index=0;while(index<choices.length-1&&target>weights[index])target-=weights[index++];
      const selected=choices[index];
      const part=selected.part,y=lerp(selected.y0,selected.y1,rnd()),a=rnd()*Math.PI*2,r=part.radius(y);
      if(r<.002)continue;
      const radial=v(Math.cos(a),0,Math.sin(a)),tangent=v(-Math.sin(a),0,Math.cos(a));
      const surface=part.centre(y).addScaledVector(radial,r*.98);
      if(parts.some(other=>other!==part&&y>other.lo&&y<other.hi&&v(surface.x-other.centre(y).x,0,surface.z-other.centre(y).z).length()<other.radius(y)*.97))continue;
      emitted++;
      const origin=part.centre(y).addScaledVector(radial,r*(fine?.58+rnd()*.20:.77+rnd()*.13));
      const axis=radial.clone().multiplyScalar(.18+rnd()*.28).addScaledVector(v(0,1,0),cypress?.58+rnd()*.54:rnd()-.20).addScaledVector(tangent,(rnd()-.5)*.75).normalize();
      const normal=axis.clone().cross(tangent).normalize();
      const length=(cypress?.031+rnd()*.026:.021+rnd()*.020)*(fine?.83:1);
      const twigEnd=clip(origin.clone().addScaledVector(axis,length*.77),part,fine);
      const twigW=(fine?.00055:.00075),twigSide=tangent.clone().multiplyScalar(twigW);
      emit([clip(origin.clone().sub(twigSide),part,fine),clip(origin.clone().add(twigSide),part,fine),twigEnd.clone().add(twigSide),twigEnd.clone().sub(twigSide)],[0,1,2,0,2,3],'shadow',palette[0],[.57,.64,.81,.70]);
      const leaf=(base:THREE.Vector3,dir:THREE.Vector3,len:number,width:number,paint:'structure'|'shadow'|'deck',color:THREE.Color)=>{
        const side=dir.clone().cross(normal).normalize().multiplyScalar(width*.5),curl=normal.clone().multiplyScalar(width*(.10+rnd()*.35));
        const tip=base.clone().addScaledVector(dir,len),mid=base.clone().addScaledVector(dir,len*(.40+rnd()*.15));
        if(cypress){
          const points=[base,mid.clone().add(side).add(curl),tip,mid.clone().sub(side).sub(curl.clone().multiplyScalar(.20))].map(q=>clip(q,part,fine));
          emit(points,[0,1,2,0,2,3],paint,color,[.68,.97,1.10,.82]);
        }else{
          const ridge=base.clone().addScaledVector(dir,len*.48).addScaledVector(normal,width*.32);
          const points=[base,mid.clone().add(side),tip,mid.clone().sub(side),ridge].map(q=>clip(q,part,fine));
          emit(points,[0,1,4,1,2,4,2,3,4,3,0,4],paint,color,[.72,.91,1.07,.86,1.10]);
        }
      };
      if(cypress){
        for(let j=0;j<8;j++)for(const sign of[-1,1]){
          const t=(j+.25+rnd()*.45)/8,base=origin.clone().addScaledVector(axis,length*t);
          const dir=axis.clone().multiplyScalar(.30+rnd()*.35).addScaledVector(tangent,sign*(.65+rnd()*.45)).addScaledVector(radial,(rnd()-.35)*.40).normalize();
          const shade=Math.min(4,Math.floor(rnd()*5)),paint=shade===0?'shadow':shade===4?'deck':'structure';
          leaf(base,dir,(.017+rnd()*.011)*(1-t*.57)*(fine?.82:1),.0042+rnd()*.0032,paint,palette[shade]);
        }
      }else{
        for(let j=0;j<7;j++){
          const t=(j+rnd()*.75)/7,base=origin.clone().addScaledVector(axis,length*t),angle=rnd()*Math.PI*2;
          const dir=axis.clone().multiplyScalar(.28+rnd()*.65).addScaledVector(tangent,Math.cos(angle)*.7).addScaledVector(radial,Math.sin(angle)*.55).normalize();
          const shade=Math.min(4,Math.floor(rnd()*5)),paint=shade===0?'shadow':shade===4?'deck':'structure',len=(.014+rnd()*.014)*(fine?.78:1);
          leaf(base,dir,len,len*(.47+rnd()*.22),paint,palette[shade]);
        }
      }
    }
  };
  const seed=illuminationSeed(p.key)^0x41c67ea6;
  scatter(cypress?600:900,false,seed);
  if(cypress)scatter(160,false,seed^0x48c3457,true);
  if(detail==='detail'){
    scatter(cypress?1620:1800,true,seed^0x78d3b49d);
    if(cypress)scatter(220,true,seed^0x723a44b,true);
  }
  for(const[paint,data]of batches){
    const before=b.buckets.get(paint)?.colors.length??0;b.surface(data.points,data.indices,paint);
    const bucket=b.buckets.get(paint)!;for(let i=0;i<data.colors.length;i++)bucket.colors[before+i]=data.colors[i];
  }
}

function applyNaturalTopiaryMaterials(materials:Record<Paint,THREE.MeshStandardMaterial>,profile:TowerProfile,style:TowerRenderStyle):void {
  if(!isNaturalTopiaryKey(profile.key))return;
  for(const paint of['structure','shadow','deck']as Paint[]){
    const m=materials[paint];m.side=THREE.DoubleSide;m.shadowSide=THREE.DoubleSide;
    if(style==='metal'||style==='porcelain'||style==='blueprint')m.vertexColors=false;
    if(style==='heritage'||style==='illuminated'){
      m.metalness=0;m.roughness=.97;m.envMapIntensity=.30;
      if(m instanceof THREE.MeshPhysicalMaterial)m.clearcoat=0;
    }
    if(style==='illuminated'){
      m.color.set(paint==='shadow'?profile.dark:paint==='deck'?profile.deckPaint:profile.paint);
      m.emissiveIntensity=paint==='shadow'?.007:paint==='deck'?.035:.026;
    }
  }
}

function buildTopiary(b:ModelBuilder,p:TowerProfile,detail:Detail):void {
  if(isNaturalTopiaryKey(p.key)){buildNaturalTopiary(b,p,detail);return;}
  const ss=stations(p),steps=24,sides=12;
  // Identical continuous envelope in both LODs; small irregular foliage stays inside it.
  const tube=(lo:number,hi:number,centre:(y:number)=>THREE.Vector3,radius:(y:number)=>number)=>{
    const ring=(y:number)=>Array.from({length:sides},(_,i)=>{const a=i*Math.PI*2/sides,r=radius(y)*(1-.025*Math.sin(y*29+i*2.1));return centre(y).add(v(Math.cos(a)*r,0,Math.sin(a)*r));});
    for(let j=0;j<steps;j++) {
      const y0=lerp(lo,hi,j/steps),y1=lerp(lo,hi,(j+1)/steps),a=ring(y0),z=ring(y1);
      for(let i=0;i<sides;i++)b.surface([a[i],a[(i+1)%sides],z[(i+1)%sides],z[i]],[0,1,2,0,2,3],(i+j)%11===0?'shadow':'structure');
    }
    const count=detail==='detail'?95:32;
    for(let j=0;j<count;j++){
      const y=lerp(lo,hi,(j+.5)/count),a=j*2.399963,r=radius(y),leaf=r*.17;
      const c=centre(y).add(v(Math.cos(a)*r*.75,0,Math.sin(a)*r*.75));
      b.ellipsoid(leaf,leaf*1.14,leaf,c,new THREE.Quaternion(),j%7?'structure':'shadow',6);
    }
  };
  for(const sx of[-1,1])for(const sz of[-1,1])tube(.005,p.second.y,y=>v(sx*interpolate(ss,y,'c'),y,sz*interpolate(ss,y,'c')),y=>Math.max(interpolate(ss,y,'w')*.85,p.baseWidth*.045));
  tube(p.second.y,p.upperEnd,y=>v(0,y,0),y=>Math.max((interpolate(ss,y,'c')+interpolate(ss,y,'w')*.5)*1.12,.012));
  b.ellipsoid(Math.max(p.upperCentre,.012),.018,Math.max(p.upperCentre,.012),v(0,p.upperEnd,0),new THREE.Quaternion(),'structure',8);
}

function buildCoffeeKiosk(b:ModelBuilder,p:TowerProfile,detail:Detail):void {
  // Rivne's lower arch is a printed/painted opaque vending body, not a walk-through gap.
  b.taperedSquare(.580,.404,.0,.282,'shadow');
  b.taperedSquare(.404,.269,.282,.542,'shadow');
  for(const [y,w] of [[.282,.424],[.542,.329]])b.box(w,.019,.251,v(0,y,0),'deck');
  for(const side of[0,1,2,3]) {
    const rotation=new THREE.Quaternion().setFromAxisAngle(Y,side*Math.PI/2);
    for(const sign of[-1,1]) {
      for(let i=0;i<5;i++) {
        const y0=i*.282/5,y1=(i+1)*.282/5,r0=lerp(.29,.202,y0/.282),r1=lerp(.29,.202,y1/.282);
        b.beam(facePoint(sign*r0,y0,side,r0+.002),facePoint(sign*(r1-.112),y1,side,r1+.002),.007,'deck');
        b.beam(facePoint(sign*(r0-.112),y0,side,r0+.002),facePoint(sign*r1,y1,side,r1+.002),.007,'deck');
      }
    }
    b.box(.326,.061,.005,facePoint(0,.542,side,.143),'shadow',rotation);
  }
  b.box(.099,.186,.007,v(0,.389,.178),'stone');
  b.box(.078,.159,.007,v(0,.395,.184),'clock');
  b.box(.053,.032,.008,v(0,.340,.190),'shadow');
  const levels=[{y:.576,r:.143},{y:.709,r:.089},{y:.918,r:.023}];
  for(let j=0;j<levels.length-1;j++)for(let i=0;i<5;i++) {
    const a=levels[j],z=levels[j+1],y0=lerp(a.y,z.y,i/5),y1=lerp(a.y,z.y,(i+1)/5),r0=lerp(a.r,z.r,i/5),r1=lerp(a.r,z.r,(i+1)/5);
    for(let side=0;side<4;side++)latticeFace(b,facePoint(-r0,y0,side,r0),facePoint(r0,y0,side,r0),facePoint(-r1,y1,side,r1),facePoint(r1,y1,side,r1),2,.007,false,true,'cross','deck');
  }
  for(const[y,w]of[[.710,.205],[.933,.064]])squareRing(b,y,w,w*.65,.020,'shadow');
  b.taperedSquare(.036,0,.945,1,'deck');
}

function buildPhotoPerforatedShell(b:ModelBuilder,p:TowerProfile,ss:Station[],detail:Detail):void {
  const radius=(y:number)=>interpolate(ss,y,'c')+interpolate(ss,y,'w')/2;
  const upperRows=p.photoPerforatedShellRows===undefined?(detail==='detail'?34:20):(detail==='detail'?p.photoPerforatedShellRows:Math.max(6,Math.ceil(p.photoPerforatedShellRows*.6)));
  for(const [y0,y1,rows]of [[p.archCrown+.010,p.first.y,5],[p.second.y,p.upperEnd,upperRows]]) {
    const shape=new THREE.Shape(),samples=subdivided(y0,y1,12);
    shape.moveTo(-radius(y0),y0);
    for(const y of samples.slice(1))shape.lineTo(-radius(y),y);
    for(const y of [...samples].reverse())shape.lineTo(radius(y),y);
    shape.closePath();
    for(let row=0;row<rows;row++) {
      const y=lerp(y0,y1,(row+.5)/rows),h=(y1-y0)/rows*.29,r=radius(y)*.88,cols=Math.min(p.photoPerforatedShellColumns??Infinity,Math.max(1,Math.ceil(r/.016)));
      for(let col=0;col<cols*2;col++) {
        const x=lerp(-r,r,(col+.5)/(cols*2)),w=r/cols*.31;
        const hole=new THREE.Path();hole.moveTo(x-w,y);hole.lineTo(x,y+h);hole.lineTo(x+w,y);hole.lineTo(x,y-h);hole.closePath();shape.holes.push(hole);
      }
    }
    for(let side=0;side<4;side++)b.facade(shape,side,y=>radius(y)+.0008,'structure');
  }
}

function buildPhotoPerforatedLegs(b:ModelBuilder,p:TowerProfile,ss:Station[],detail:Detail):void {
  for(const sx of[-1,1])for(const sz of[-1,1])for(let side=0;side<4;side++)for(const[y0,y1,rows]of[[.005,p.first.y,detail==='detail'?10:4],[p.first.y,p.second.y,detail==='detail'?8:3]]) {
    const sign=side===0?sx:side===1?-sz:side===2?-sx:sz,depthSign=side===0?sz:side===1?sx:side===2?-sz:-sx;
    const centre=(y:number)=>sign*interpolate(ss,y,'c'),width=(y:number)=>interpolate(ss,y,'w');
    const shape=new THREE.Shape(),levels=subdivided(y0,y1,10);
    shape.moveTo(centre(y0)-width(y0)/2,y0);
    for(const y of levels.slice(1))shape.lineTo(centre(y)-width(y)/2,y);
    for(const y of [...levels].reverse())shape.lineTo(centre(y)+width(y)/2,y);shape.closePath();
    for(let row=0;row<rows;row++){
      const y=lerp(y0,y1,(row+.5)/rows),x=centre(y),w=width(y)*.32,h=(y1-y0)/rows*.34;
      const hole=new THREE.Path();hole.moveTo(x-w,y);hole.lineTo(x,y+h);hole.lineTo(x+w,y);hole.lineTo(x,y-h);hole.closePath();shape.holes.push(hole);
    }
    b.facade(shape,side,y=>depthSign*interpolate(ss,y,'c')+width(y)/2+.0006,'structure');
  }
}

function facePoint(x: number, y: number, side: number, depth: number): THREE.Vector3 {
  if (side === 0) return v(x, y, depth);
  if (side === 1) return v(depth, y, -x);
  if (side === 2) return v(-x, y, -depth);
  return v(-depth, y, x);
}

function buildArches(b: ModelBuilder, p: TowerProfile, ss: Station[], detail: Detail): void {
  if (p.archKind === 'none') return;
  if (p.key === 'montmartre' || (p.flatLattice && p.archKind !== 'lattice')) {
    // The village replica has broad sheet-like arch cutouts, not Paris's double lattice arch girders.
    const shape = new THREE.Shape();
    const steps = detail === 'detail' ? 36 : 18;
    for (let i = 0; i <= steps; i += 1) {
      const t = Math.PI * i / steps;
      const x = p.archSpan * Math.cos(t), y = p.archStart + (p.archCrown - p.archStart) * Math.sin(t);
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    for (let i = steps; i >= 0; i -= 1) {
      const t = Math.PI * i / steps;
      shape.lineTo(p.archSpan * .90 * Math.cos(t), p.archStart + (p.archCrown - p.archStart) * .79 * Math.sin(t));
    }
    shape.closePath();
    for (let side = 0; side < 4; side += 1) b.facade(shape, side,
      y => interpolate(ss, y, 'c') + interpolate(ss, y, 'w') / 2 + .001, 'deck');
    return;
  }
  const steps = detail === 'detail' ? 40 : 18;
  const archWeb = p.key === 'paris' || p.key === 'tianducheng' ? .010 : .0078;
  for (let side = 0; side < 4; side += 1) {
    const outer: THREE.Vector3[] = [], inner: THREE.Vector3[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = Math.PI * i / steps;
      const y = p.archStart + (p.archCrown - p.archStart) * Math.sin(t);
      const depth = interpolate(ss, y, 'c') + interpolate(ss, y, 'w') / 2 + .001;
      outer.push(facePoint(p.archSpan * Math.cos(t), y, side, depth));
      inner.push(facePoint(p.archSpan * .96 * Math.cos(t), y - archWeb, side, depth - .0018));
    }
    for (let i = 0; i < steps; i += 1) {
      if (p.key === 'texas' || p.archKind === 'single') {
        // The photographed arch is a slim curved member, without a Paris-style decorative spandrel.
        b.beam(outer[i], outer[i + 1], .0025, 'structure', .0034);
        continue;
      }
      if (p.archKind === 'double-line') {
        b.beam(outer[i], outer[i + 1], .0017, 'structure', .0020);
        b.beam(inner[i], inner[i + 1], .0015, 'structure', .0020);
        continue;
      }
      if (p.flatMainMembers) {
        const normal = facePoint(0, 0, side, 1);
        b.strip(outer[i], outer[i + 1], p.mainWidth * .88, normal);
        b.strip(inner[i], inner[i + 1], p.mainWidth * .62, normal);
        b.strip(outer[i], inner[i + 1], p.latticeWidth * .80, normal);
        b.strip(inner[i], outer[i + 1], p.latticeWidth * .80, normal);
      } else {
        b.beam(outer[i], outer[i + 1], p.mainWidth * .65, 'structure', p.mainWidth * 1.05);
        b.beam(inner[i], inner[i + 1], p.mainWidth * .52, 'structure', p.mainWidth * .90);
        b.beam(outer[i], inner[i + 1], p.latticeWidth * .90, 'shadow');
        b.beam(inner[i], outer[i + 1], p.latticeWidth * .90);
      }
    }
    if (p.key === 'paris' || p.key === 'tianducheng' || p.key === 'shenzhen' || p.key === 'macao' || p.key === 'las-vegas' || p.ornateArches) {
      // The photo shows an open, scalloped spandrel above the arch. Connect it to the floor beam;
      // a free-floating arch strip misses this defining piece of the lower elevation.
      const crownY = p.first.y - p.first.fascia;
      const crownDepth = interpolate(ss, crownY, 'c') + interpolate(ss, crownY, 'w') / 2;
      const span = p.first.width * .455;
      const cells = detail === 'detail' ? 12 : 8;
      const archAt = (x: number): { y: number; depth: number } => {
        const y = p.archStart + (p.archCrown - p.archStart) * Math.sqrt(Math.max(0, 1 - (x / p.archSpan) ** 2));
        return { y, depth: interpolate(ss, y, 'c') + interpolate(ss, y, 'w') / 2 + .001 };
      };
      // The row of small arches is cut out of a thin connecting metal spandrel,
      // rather than a row of unsupported semicircles hovering over the big arch.
      const panel = new THREE.Shape();
      const panelTopAt = (x: number) => Math.min(crownY, archAt(x).y + .016);
      panel.moveTo(-span, panelTopAt(-span));
      for (let j = 1; j <= 32; j += 1) {
        const x = lerp(-span, span, j / 32);
        panel.lineTo(x, panelTopAt(x));
      }
      for (let j = 0; j <= 32; j += 1) {
        const x = lerp(span, -span, j / 32);
        panel.lineTo(x, archAt(x).y + .0017);
      }
      panel.closePath();
      for (let cell = 0; cell < cells; cell += 1) {
        const x0 = lerp(-span, span, cell / cells), x1 = lerp(-span, span, (cell + 1) / cells);
        const base = Math.max(archAt(x0).y, archAt(x1).y) + .0045;
        const rise = Math.min((x1 - x0) * .45, panelTopAt((x0 + x1) / 2) - base - .0025);
        if (rise <= .001) continue;
        const cx = (x0 + x1) / 2, radius = (x1 - x0) * .36;
        const hole = new THREE.Path();
        hole.moveTo(cx - radius, base);
        hole.lineTo(cx + radius, base);
        for (let j = 0; j <= 8; j += 1) {
          const angle = Math.PI * j / 8;
          hole.lineTo(cx + radius * Math.cos(angle), base + rise * Math.sin(angle));
        }
        hole.closePath();
        panel.holes.push(hole);
      }
      b.facade(panel, side, y => interpolate(ss, y, 'c') + interpolate(ss, y, 'w') / 2 + .0001, 'deck');
      b.beam(facePoint(-span, crownY, side, crownDepth), facePoint(span, crownY, side, crownDepth),
        p.mainWidth * .66, 'deck');
      for (let cell = 0; cell < cells; cell += 1) {
        const x0 = lerp(-span, span, cell / cells), x1 = lerp(-span, span, (cell + 1) / cells);
        const a = archAt(x0), z = archAt(x1);
        b.beam(facePoint(x0, a.y, side, a.depth), facePoint(x0, crownY, side, crownDepth), p.latticeWidth * .76);
        // Above the perforated ribbon, retain open lattice rather than a solid triangular wall.
        const lowA = panelTopAt(x0), lowZ = panelTopAt(x1);
        b.beam(facePoint(x0, lowA, side, interpolate(ss, lowA, 'c') + interpolate(ss, lowA, 'w') / 2),
          facePoint(x1, crownY, side, crownDepth), p.latticeWidth * .73, 'shadow');
        b.beam(facePoint(x1, lowZ, side, interpolate(ss, lowZ, 'c') + interpolate(ss, lowZ, 'w') / 2),
          facePoint(x0, crownY, side, crownDepth), p.latticeWidth * .73);
        const holeBase = Math.max(a.y, z.y) + .005;
        const holeRise = Math.min((x1 - x0) * .42, Math.max(.001, crownY - holeBase - .003));
        const subdivisions = detail === 'detail' ? 6 : 3;
        for (let j = 0; j < subdivisions; j += 1) {
          const t0 = Math.PI * j / subdivisions, t1 = Math.PI * (j + 1) / subdivisions;
          const radius = (x1 - x0) * .43, cx = (x0 + x1) / 2;
          const at = (t: number) => facePoint(cx + radius * Math.cos(t), holeBase + holeRise * Math.sin(t),
            side, lerp((a.depth + z.depth) / 2, crownDepth, .35));
          b.beam(at(t0), at(t1), p.latticeWidth * .64, 'shadow');
        }
      }
      const end = archAt(span);
      b.beam(facePoint(span, end.y, side, end.depth), facePoint(span, crownY, side, crownDepth), p.latticeWidth * .76);
    }
    // The simpler replicas have a straight rectangular opening under the second platform.
    if (!['paris', 'tianducheng', 'macao', 'las-vegas'].includes(p.key) && !p.secondArch) continue;
    // A second, much smaller arch opens the space below the second floor of the ornate variants.
    const yBase = p.second.y - .076, crown = p.second.y - .030;
    const halfSpan = p.secondCentre * 1.06;
    const depth = interpolate(ss, crown, 'c') + interpolate(ss, crown, 'w') / 2;
    const count = detail === 'detail' ? 16 : 8;
    for (let i = 0; i < count; i += 1) {
      const t0 = Math.PI * i / count, t1 = Math.PI * (i + 1) / count;
      b.beam(facePoint(halfSpan * Math.cos(t0), yBase + (crown - yBase) * Math.sin(t0), side, depth),
        facePoint(halfSpan * Math.cos(t1), yBase + (crown - yBase) * Math.sin(t1), side, depth),
        p.mainWidth * .57, 'shadow');
    }
  }
}

function squareRing(b: ModelBuilder, y: number, width: number, opening: number, thickness: number, paint: Paint): void {
  const band = (width - opening) / 2;
  b.box(width, thickness, band, v(0, y, (width + opening) / 4), paint);
  b.box(width, thickness, band, v(0, y, -(width + opening) / 4), paint);
  b.box(band, thickness, opening, v((width + opening) / 4, y, 0), paint);
  b.box(band, thickness, opening, v(-(width + opening) / 4, y, 0), paint);
}
function squareRails(b: ModelBuilder, y: number, width: number, height: number, postCount: number,
  beamWidth: number, paint: Paint = 'structure'): void {
  const r = width / 2;
  for (let side = 0; side < 4; side += 1) {
    for (const yy of [y + height, y + height * .48]) {
      b.beam(facePoint(-r, yy, side, r), facePoint(r, yy, side, r), beamWidth, paint);
    }
    for (let i = 0; i <= postCount; i += 1) {
      const x = lerp(-r, r, i / postCount);
      b.beam(facePoint(x, y, side, r), facePoint(x, y + height, side, r), beamWidth * .85, paint);
    }
  }
}
function loopRails(b: ModelBuilder, y: number, width: number, height: number, count: number, detail: Detail): void {
  const r = width / 2, cell = width / count, arcRise = Math.min(cell * .44, height * .60), steps = detail === 'detail' ? 10 : 6;
  for (let side = 0; side < 4; side += 1) for (let i = 0; i < count; i += 1) {
    const cx = -r + cell * (i + .5), x0 = cx - cell * .48, x1 = cx + cell * .48, spring = y + height - arcRise;
    b.beam(facePoint(x0, y, side, r), facePoint(x0, spring, side, r), .0011);
    b.beam(facePoint(x1, y, side, r), facePoint(x1, spring, side, r), .0011);
    for (let j = 0; j < steps; j += 1) {
      const a = Math.PI * j / steps, z = Math.PI * (j + 1) / steps;
      b.beam(facePoint(cx + cell * .48 * Math.cos(a), spring + arcRise * Math.sin(a), side, r),
        facePoint(cx + cell * .48 * Math.cos(z), spring + arcRise * Math.sin(z), side, r), .0011);
    }
  }
}
function buildPlatform(b: ModelBuilder, p: TowerProfile, s: PlatformSpec, detail: Detail): void {
  if (s.hidden) return;
  if(s.cornerCut!==undefined){
    const corners=chamferedSquare(s.width,s.cornerCut);
    b.polygonRing(corners,s.opening/s.width,s.y,.003,'deck');
    polygonRails(b,corners,s.y+.0015,s.rail,detail==='detail'?6:3,.00095);
    return;
  }
  if (s.panelRows) {
    // Dordrecht's two white-framed blue panel galleries are not Paris restaurant bands.
    const lo = s.y - s.fascia, hi = s.y + s.rail, r = s.width / 2;
    squareRing(b, lo, s.width, s.opening, .003, 'structure');
    squareRing(b, hi, s.width, s.opening, .003, 'structure');
    const columns = s.width > .2 ? 12 : 6;
    for (let side = 0; side < 4; side += 1) {
      const rotation = new THREE.Quaternion().setFromAxisAngle(Y, side * Math.PI / 2);
      for (let row = 0; row < s.panelRows; row += 1) for (let col = 0; col < columns; col += 1) {
        const cell = s.width / columns, height = (hi - lo) / s.panelRows;
        b.box(cell * .74, height * .73, .0017, facePoint(-r + cell * (col + .5), lo + height * (row + .5), side, r), 'clock', rotation);
      }
      for (let col = 0; col <= columns; col += 1) b.beam(facePoint(-r + s.width * col / columns, lo, side, r), facePoint(-r + s.width * col / columns, hi, side, r), .002, 'structure');
      for (let row = 1; row < s.panelRows; row += 1) b.beam(facePoint(-r, lo + (hi-lo)*row/s.panelRows, side, r), facePoint(r, lo + (hi-lo)*row/s.panelRows, side, r), .002, 'structure');
    }
    return;
  }
  if (s.frameOnly) {
    squareRing(b, s.y, s.width, Math.max(0, s.width - .006), .0025, 'deck');
    if (s.rail > 0) squareRails(b, s.y + .0012, s.width, s.rail, detail === 'detail' ? 10 : 6, .00090);
    return;
  }
  const high = detail === 'detail', r = s.width / 2;
  if (p.flatMainMembers) {
    // The yellow reference has plain plate ledges, loop guards and a few open triangular brackets.
    // Dense Paris cornices and many tiny skirt triangles obscure these broad members.
    squareRing(b, s.y, s.width, s.opening, .0045, 'deck');
    loopRails(b, s.y + .0022, s.width * .982, s.rail, s.width > .18 ? 8 : 3, detail);
    for (let side = 0; side < 4; side += 1) {
      const normal = facePoint(0, 0, side, 1);
      b.strip(facePoint(-r, s.y - .004, side, r), facePoint(r, s.y - .004, side, r), .007, normal, 'deck');
      const loR = r * .79, loY = s.y - s.fascia;
      b.strip(facePoint(-loR, loY, side, loR), facePoint(loR, loY, side, loR), .005, normal, 'deck');
      for (const sign of [-1, 1]) {
        b.strip(facePoint(sign * loR, loY, side, loR), facePoint(sign * r, s.y - .003, side, r), .006, normal);
        b.strip(facePoint(sign * r * .47, loY, side, loR), facePoint(sign * r, s.y - .003, side, r), .005, normal);
      }
    }
    return;
  }
  if (p.key === 'texas') {
    // Sparse railing cages on a narrow band; no restaurant, canopy or ornamental fascia.
    squareRing(b, s.y, s.width, s.opening, .0030, 'deck');
    squareRails(b, s.y + .0015, s.width, s.rail, high ? 14 : 8, .0017);
    for (let side = 0; side < 4; side += 1) {
      for (const x of [-r * .77, r * .77]) {
        b.beam(facePoint(x * .8, s.y - .012, side, r * .8), facePoint(x, s.y, side, r), .0020, 'shadow');
        // Compact real perimeter floodlight housings; not a structural crossbeam.
        b.box(.006, .0045, .009, facePoint(x, s.y + s.rail + .001, side, r), 'shadow');
      }
    }
    return;
  }
  squareRing(b, s.y, s.width, s.opening, .0043, 'deck');
  if (s.railKind === 'loops') loopRails(b, s.y + .0022, s.width * .982, s.rail, s.width > .18 ? 8 : 3, detail);
  else squareRails(b, s.y + .0022, s.width * .982, s.rail, high ? 28 : 14, .00075);
  // The courtyard is also guarded. Keeping this opening makes underside and close views believable.
  if (s.railKind !== 'loops') squareRails(b, s.y + .0022, s.opening * 1.03, s.rail * .88, high ? 14 : 7, .00065);
  const skirtBottom = s.y - s.fascia;
  const cells = high ? (s.width > .18 ? 24 : 16) : (s.width > .18 ? 12 : 8);
  for (let side = 0; side < 4; side += 1) {
    const loR = r * .94;
    b.beam(facePoint(-r, s.y - .003, side, r), facePoint(r, s.y - .003, side, r), .0019, 'deck');
    b.beam(facePoint(-loR, skirtBottom, side, loR), facePoint(loR, skirtBottom, side, loR), .0014, 'shadow');
    if (p.key !== 'parque-europa') {
      // A shallow upper fascia and two distinct edge mouldings make the floor read as a gallery,
      // while the lower trussed band remains open. The panel sizes are photo-derived estimates.
      const enclosed = p.key === 'shenzhen' || p.key === 'tianducheng' || p.key === 'macao';
      const fasciaHeight = p.solidFascia ? s.fascia * .95 : enclosed ? s.fascia * .74 : Math.min(s.fascia * .42, .0088);
      const rotation = new THREE.Quaternion().setFromAxisAngle(Y, side * Math.PI / 2);
      if (p.key === 'macao' || p.key === 'las-vegas') {
        // The broad cornice is swept back beneath its overhanging upper lip.
        // A flat board at the outside hid the corbels and lost the photographed profile.
        const steps = high ? 10 : 5;
        const at = (x: number, t: number) => facePoint(x,
          lerp(s.y - s.fascia * .93, s.y - .003, t), side,
          lerp(r * .912, r * 1.000, 1 - Math.cos(t * Math.PI / 2)) - .0005);
        for (let j = 0; j < steps; j += 1) {
          const t0 = j / steps, t1 = (j + 1) / steps;
          b.surface([at(-r, t0), at(r, t0), at(r, t1), at(-r, t1)], [0, 1, 2, 0, 2, 3], 'deck');
        }
      } else b.box(s.width, fasciaHeight, .0013,
        facePoint(0, s.y - .003 - fasciaHeight / 2, side, r - .0006), 'deck', rotation);
      b.beam(facePoint(-r * 1.008, s.y - .002, side, r * 1.008),
        facePoint(r * 1.008, s.y - .002, side, r * 1.008), .0022, 'structure', .0028);
      b.beam(facePoint(-r, s.y - .003 - fasciaHeight, side, r),
        facePoint(r, s.y - .003 - fasciaHeight, side, r), .0010, 'shadow');
    }
    for (let i = 0; i < cells; i += 1) {
      const a = facePoint(lerp(-loR, loR, i / cells), skirtBottom, side, loR);
      const c = facePoint(lerp(-loR, loR, (i + 1) / cells), skirtBottom, side, loR);
      const d = facePoint(lerp(-r, r, i / cells), s.y - .003, side, r);
      const f = facePoint(lerp(-r, r, (i + 1) / cells), s.y - .003, side, r);
      if (p.key !== 'macao' && p.key !== 'las-vegas') {
        b.beam(a, f, p.latticeWidth * .78, 'shadow');
        b.beam(c, d, p.latticeWidth * .78);
        if (s.bracketed) b.beam(a, d, .0021, 'deck', .0032);
      }
    }
    if (s.canopy > 0) {
      const canopyY = s.y + s.canopy;
      const columns = high ? 12 : 6;
      for (let i = 0; i <= columns; i += 1) {
        const x = lerp(-r * .96, r * .96, i / columns);
        b.beam(facePoint(x, s.y + .002, side, r * .955),
          facePoint(x, canopyY, side, r * .955), p.mainWidth * .36, 'deck');
        // Capitals and sill brackets are silhouette-bearing details, unlike repeated tiny rivets.
        b.box(p.mainWidth * .78, .0019, .0019,
          facePoint(x, canopyY - .0016, side, r * .955), 'structure');
        if (high) b.beam(facePoint(x, s.y - .006, side, r * .963),
          facePoint(x, s.y - .006 - s.fascia * .48, side, r * .934), p.mainWidth * .42, 'deck');
      }
    }
  }
  if (s.canopy > 0) {
    squareRing(b, s.y + s.canopy, s.width * 1.025, s.opening * .98, .0032, 'deck');
    if (p.key === 'paris' || p.key === 'karachi') {
      // Set-back gallery walls; never fill the large central opening with an opaque slab.
      const cabinWidth = s.width * .72;
      for (let side = 0; side < 4; side += 1) {
        const rotation = new THREE.Quaternion().setFromAxisAngle(Y, side * Math.PI / 2);
        b.box(cabinWidth * .90, s.canopy * .64, .0013,
          facePoint(0, s.y + s.canopy * .46, side, cabinWidth / 2), 'glass', rotation);
      }
    }
    if (p.key === 'macao' || p.key === 'las-vegas' || (p.enclosedFirst && s === p.first)) {
      // The lower observation gallery is a full enclosed glass box, visibly unlike Paris's open gallery.
      for (let side = 0; side < 4; side += 1) {
        const rotation = new THREE.Quaternion().setFromAxisAngle(Y, side * Math.PI / 2);
        b.box(s.width * .98, s.canopy * .83, .0016,
          facePoint(0, s.y + s.canopy * .50, side, r * .981), 'glass', rotation);
        for (let i = 0; i <= (high ? 12 : 6); i += 1) {
          const x = lerp(-r * .98, r * .98, i / (high ? 12 : 6));
          b.beam(facePoint(x, s.y + .002, side, r * .990),
            facePoint(x, s.y + s.canopy - .002, side, r * .990), .00125, 'deck');
        }
      }
    }
  }
}

/** Close-view structural depth, observed in the licensed hero photographs.
 * Member dimensions and counts remain a modelling estimate, not an engineering survey. */
function buildHeroDepth(b: ModelBuilder, p: TowerProfile, ss: Station[], detail: Detail): void {
  if (detail !== 'detail' || !['paris', 'macao', 'tianducheng', 'las-vegas'].includes(p.key)) return;
  for (const floor of [p.first, p.second]) {
    const r = floor.width / 2, inner = floor.opening / 2, y = floor.y - .005;
    const bays = floor === p.first ? 16 : 10;
    for (let side = 0; side < 4; side += 1) {
      // Radial floor joists span only the annulus: the central light well stays open.
      for (let j = 0; j <= bays; j += 1) {
        const x = lerp(-inner, inner, j / bays);
        b.beam(facePoint(x, y, side, inner), facePoint(x, y, side, r * .97), .00105, 'shadow', .0038);
      }
      b.beam(facePoint(-inner, y - .002, side, inner), facePoint(inner, y - .002, side, inner), .0022, 'structure', .0050);
      // Macau and Vegas have deep projecting cornices with repeated curved corbels.
      // Hangzhou's heavy second fascia instead uses upright ribs; Paris stays open underneath.
      if (p.key === 'macao' || p.key === 'las-vegas') {
        const count = floor === p.first ? 18 : 12;
        for (let j = 0; j <= count; j += 1) {
          const x = lerp(-r * .95, r * .95, j / count);
          let prior = facePoint(x, floor.y - floor.fascia * .93, side, r * .916);
          for (let k = 1; k <= 6; k += 1) {
            const t = k / 6;
            const next = facePoint(x, lerp(floor.y - floor.fascia * .93, floor.y - .003, t), side,
              lerp(r * .916, r * 1.006, 1 - Math.cos(t * Math.PI / 2)));
            b.beam(prior, next, .0015, 'structure', .0023); prior = next;
          }
          b.box(.0038, .0018, .0038, facePoint(x, floor.y - .003, side, r * 1.006), 'deck');
        }
      } else if (p.key === 'tianducheng') {
        for (let j = 0; j <= bays; j += 1) {
          const x = lerp(-r * .96, r * .96, j / bays);
          b.beam(facePoint(x, floor.y - floor.fascia * .78, side, r), facePoint(x, floor.y - .004, side, r), .0011, 'structure', .0020);
        }
      }
      // Lower gallery transoms give Macau's tall windows a two-part elevation;
      // Vegas keeps the long dark restaurant band visible in its reference.
      if (p.key === 'macao' && floor === p.first) {
        b.beam(facePoint(-r * .98, floor.y + floor.canopy * .70, side, r * .991),
          facePoint(r * .98, floor.y + floor.canopy * .70, side, r * .991), .0014, 'deck');
      }
    }
  }
  // The main arch is a spatial girder. Its rear chord and transverse ties are visible
  // from below and at 45 degrees; they avoid the previous single-sheet silhouette.
  for (let side = 0; side < 4; side += 1) {
    const archDepth = p.key === 'paris' ? .010 : .008;
    const at = (t: number, inset: number) => {
      const y = p.archStart + (p.archCrown - p.archStart) * Math.sin(t);
      return facePoint(p.archSpan * Math.cos(t), y, side,
        interpolate(ss, y, 'c') + interpolate(ss, y, 'w') / 2 + .001 - inset);
    };
    for (let i = 0; i < 40; i += 1) {
      const t0 = Math.PI * i / 40, t1 = Math.PI * (i + 1) / 40;
      b.beam(at(t0, archDepth), at(t1, archDepth), p.mainWidth * .52, 'shadow', .0025);
      b.beam(at(t0, 0), at(t0, archDepth), .00085, 'structure');
      b.beam(at(t0, 0), at(t1, archDepth), .00062, 'shadow');
    }
  }
}

function chamferedSquare(width: number, cut = .22): THREE.Vector2[] {
  const r = width / 2, c = r * cut;
  return [new THREE.Vector2(-r + c, -r), new THREE.Vector2(r - c, -r),
    new THREE.Vector2(r, -r + c), new THREE.Vector2(r, r - c),
    new THREE.Vector2(r - c, r), new THREE.Vector2(-r + c, r),
    new THREE.Vector2(-r, r - c), new THREE.Vector2(-r, -r + c)];
}
function polygonRails(b: ModelBuilder, points: THREE.Vector2[], y: number, height: number,
  postsPerEdge: number, width: number): void {
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i], z = points[(i + 1) % points.length];
    b.beam(v(a.x, y + height, a.y), v(z.x, y + height, z.y), width);
    b.beam(v(a.x, y + height * .45, a.y), v(z.x, y + height * .45, z.y), width * .78);
    for (let j = 0; j <= postsPerEdge; j += 1) {
      const t = j / postsPerEdge;
      b.beam(v(lerp(a.x, z.x, t), y, lerp(a.y, z.y, t)),
        v(lerp(a.x, z.x, t), y + height, lerp(a.y, z.y, t)), width * .80);
    }
  }
}

function glassCabin(b: ModelBuilder, y0: number, y1: number, width: number, detail: Detail): void {
  const r = width / 2, count = detail === 'detail' ? 6 : 3;
  squareRing(b, y0, width * 1.22, width * .78, .0031, 'deck');
  squareRing(b, y1, width * 1.16, 0, .0030, 'deck');
  for (let side = 0; side < 4; side += 1) {
    const q = new THREE.Quaternion().setFromAxisAngle(Y, side * Math.PI / 2);
    b.box(width * .97, y1 - y0, .0010, facePoint(0, (y0 + y1) / 2, side, r), 'glass', q);
    for (let j = 0; j <= count; j += 1) {
      const x = lerp(-r, r, j / count);
      b.beam(facePoint(x, y0, side, r), facePoint(x, y1, side, r), .0009, 'deck');
    }
    b.beam(facePoint(-r, lerp(y0, y1, .48), side, r),
      facePoint(r, lerp(y0, y1, .48), side, r), .0010, 'deck');
  }
}
function needle(b: ModelBuilder, y0: number, radius: number, paint: Paint = 'antenna'): void {
  b.cylinder(radius, radius * .42, y0, .986, paint, 6);
  b.cylinder(radius * .42, 0, .986, 1, paint, 6);
}

function smallDome(b: ModelBuilder, baseY: number, radius: number, rise: number, detail: Detail): void {
  const spokes = detail === 'detail' ? 12 : 8;
  const shellPoints: THREE.Vector3[] = [], shellIndices: number[] = [];
  for (let ring = 0; ring <= 6; ring += 1) for (let i = 0; i <= spokes; i += 1) {
    const t = Math.PI / 2 * ring / 6, angle = Math.PI * 2 * i / spokes;
    shellPoints.push(v(radius * Math.cos(t) * Math.cos(angle), baseY + rise * Math.sin(t), radius * Math.cos(t) * Math.sin(angle)));
  }
  for (let ring = 0; ring < 6; ring += 1) for (let i = 0; i < spokes; i += 1) {
    const a = ring * (spokes + 1) + i, z = a + spokes + 1;
    shellIndices.push(a, z, a + 1, a + 1, z, z + 1);
  }
  b.surface(shellPoints, shellIndices, 'deck');
  for (let i = 0; i < spokes; i += 1) {
    const angle = i * Math.PI * 2 / spokes;
    for (let j = 0; j < 5; j += 1) {
      const t0 = Math.PI / 2 * j / 5, t1 = Math.PI / 2 * (j + 1) / 5;
      b.beam(v(radius * Math.cos(t0) * Math.cos(angle), baseY + rise * Math.sin(t0), radius * Math.cos(t0) * Math.sin(angle)),
        v(radius * Math.cos(t1) * Math.cos(angle), baseY + rise * Math.sin(t1), radius * Math.cos(t1) * Math.sin(angle)), .00082, 'deck');
    }
  }
  b.cylinder(radius, radius, baseY - .0015, baseY + .0015, 'deck', spokes);
}

function buildCowboyHat(b: ModelBuilder, detail: Detail): void {
  // Three photographs show a creased, high crown with a saddle-shaped, upturned brim.
  // This is a custom shell; a disk + cone would lose the actual Texas silhouette.
  const segments = detail === 'detail' ? 64 : 32;
  const brimPoint = (a: number, radius: number): THREE.Vector3 => {
    const x = .093 * radius * Math.cos(a), z = .057 * radius * Math.sin(a);
    const y = .923 + .024 * (Math.abs(x) / .093) ** 4 - .005 * (Math.abs(z) / .057) ** 2 + x * .025;
    return v(x, y, z);
  };
  const points: THREE.Vector3[] = [], indices: number[] = [];
  const radial = detail === 'detail' ? 9 : 5;
  for (let ring = 0; ring <= radial; ring += 1) for (let i = 0; i <= segments; i += 1) {
    points.push(brimPoint(i / segments * Math.PI * 2, lerp(.41, 1, ring / radial)));
  }
  for (let ring = 0; ring < radial; ring += 1) for (let i = 0; i < segments; i += 1) {
    const a = ring * (segments + 1) + i, z = a + segments + 1;
    indices.push(a, z, a + 1, a + 1, z, z + 1);
  }
  b.surface(points, indices, 'enamel');
  for (let i = 0; i < segments; i += 1) {
    b.beam(brimPoint(i / segments * Math.PI * 2, 1), brimPoint((i + 1) / segments * Math.PI * 2, 1), .0016, 'enamel');
  }
  const crown: THREE.Vector3[] = [], crownIndices: number[] = [];
  const crownPoint = (angle: number, t: number): THREE.Vector3 => {
    const x = lerp(.041, .036, t) * Math.cos(angle);
    const z = lerp(.028, .024, t) * Math.sin(angle);
    const crease = .0115 * Math.exp(-((x / .010) ** 2));
    const y = lerp(.924, .995 - crease - .004 * (z / .024) ** 2, t) + x * .025;
    return v(x, y, z);
  };
  for (let ring = 0; ring <= 5; ring += 1) for (let i = 0; i <= segments; i += 1) {
    crown.push(crownPoint(i / segments * Math.PI * 2, ring / 5));
  }
  for (let ring = 0; ring < 5; ring += 1) for (let i = 0; i < segments; i += 1) {
    const a = ring * (segments + 1) + i, z = a + segments + 1;
    crownIndices.push(a, a + 1, z, a + 1, z + 1, z);
  }
  b.surface(crown, crownIndices, 'enamel');
  const cap: THREE.Vector3[] = [], capIndices: number[] = [];
  for (let ring = 0; ring <= 6; ring += 1) for (let i = 0; i <= segments; i += 1) {
    const a = i / segments * Math.PI * 2, t = ring / 6;
    const x = .036 * t * Math.cos(a), z = .024 * t * Math.sin(a);
    cap.push(v(x, .995 - .0115 * Math.exp(-((x / .010) ** 2)) - .004 * (z / .024) ** 2 + x * .025, z));
  }
  for (let ring = 0; ring < 6; ring += 1) for (let i = 0; i < segments; i += 1) {
    const a = ring * (segments + 1) + i, z = a + segments + 1;
    capIndices.push(a, z, a + 1, a + 1, z, z + 1);
  }
  b.surface(cap, capIndices, 'enamel');
  // The black mounting post is visible below the hat in all three reference photographs.
  b.cylinder(.0052, .0040, .859, .925, 'shadow', 8);
}

function buildTop(b: ModelBuilder, p: TowerProfile, detail: Detail): void {
  const high = detail === 'detail';
  if (p.topKind === 'open-lantern') {
    // Apach's 2016 view resolves an open flared cage under the short needle; no enclosed cabin.
    const y = p.upperEnd, room = 1 - y, r = (p.topWidth ?? .045) / 2;
    const rings = [{ y, r: r * .43 }, { y: y + room * .10, r },
      { y: y + room * .29, r: r * .88 }, { y: y + room * .53, r: .0015 }];
    const spokes = p.crownSpokes ?? 8;
    for (let j = 0; j < rings.length - 1; j += 1) for (let i = 0; i < spokes; i += 1) {
      const a = i * Math.PI * 2 / spokes, z = (i + 1) * Math.PI * 2 / spokes;
      const lo = rings[j], hi = rings[j + 1];
      b.beam(v(lo.r * Math.cos(a), lo.y, lo.r * Math.sin(a)), v(hi.r * Math.cos(a), hi.y, hi.r * Math.sin(a)), .00095);
      b.beam(v(lo.r * Math.cos(a), lo.y, lo.r * Math.sin(a)), v(lo.r * Math.cos(z), lo.y, lo.r * Math.sin(z)), .00085, 'deck');
    }
    needle(b, rings[3].y, .00075);
  } else if(p.topKind==='radial-flower-crown'){
    // Pune's 2012 park photograph: open box, slender ornamental stem and a radial flower/star finial.
    const y=p.upperEnd,width=.052,r=width/2,roofY=.926;
    squareRing(b,y+.001,width*.78,width*.50,.0025,'deck');
    for(let side=0;side<4;side+=1){
      for(let i=0;i<4;i+=1){
        const x0=lerp(-r*.77,r*.77,i/4),x1=lerp(-r*.77,r*.77,(i+1)/4);
        b.beam(facePoint(x0,y,side,r*.77),facePoint(x0,roofY,side,r*.77),.0014);
        for(let row=0;row<3;row+=1){
          const y0=lerp(y,roofY,row/3),y1=lerp(y,roofY,(row+1)/3);
          b.beam(facePoint(x0,y0,side,r*.77),facePoint(x1,y1,side,r*.77),.0007);
          b.beam(facePoint(x1,y0,side,r*.77),facePoint(x0,y1,side,r*.77),.0007);
        }
      }
    }
    squareRing(b,roofY,width,width*.48,.006,'deck');
    squareRails(b,roofY+.003,width*.94,.006,high?8:4,.0008);
    b.cylinder(.0009,.00065,roofY+.002,.988,'antenna',6);
    // The small open spindle below the stem is a visible silhouette, not a closed observation cabin.
    for(const side of[0,1])for(let i=0;i<12;i+=1){
      const a=i*Math.PI*2/12,z=(i+1)*Math.PI*2/12;
      b.beam(facePoint(.004*Math.cos(a),.944+.010*Math.sin(a),side,0),
        facePoint(.004*Math.cos(z),.944+.010*Math.sin(z),side,0),.00075,'deck');
    }
    const centre=v(0,.987,0),axes=[[v(1,0,0),v(0,1,0)],[v(0,0,1),v(0,1,0)],[v(1,0,0),v(0,0,1)]];
    for(const[u,w]of axes)for(let i=0;i<8;i+=1){
      const angle=i*Math.PI/4,direction=u.clone().multiplyScalar(Math.cos(angle)).addScaledVector(w,Math.sin(angle));
      const tangent=u.clone().multiplyScalar(-Math.sin(angle)).addScaledVector(w,Math.cos(angle));
      const tip=centre.clone().addScaledVector(direction,.012);
      b.beam(centre,tip,.00058,'deck');
      for(const sign of[-1,1])b.beam(tip,centre.clone().addScaledVector(direction,.009).addScaledVector(tangent,sign*.0024),.00045,'deck');
    }
  } else if(p.topKind==='domed-cylinder-crown'){
    // Parle Point's photographed round, capped drum is distinct from a normal square Eiffel cabin.
    const y=p.upperEnd,room=1-y,width=.059,r=width/2;
    for(const sx of [-1,1])for(const sz of [-1,1]){
      b.beam(v(sx*.011,y,sz*.011),v(sx*r*.8,y+room*.20,sz*r*.8),.0020);
      b.beam(v(sx*.011,y,sz*.011),v(-sx*r*.8,y+room*.20,sz*r*.8),.0010);
    }
    squareRing(b,y+room*.21,width,width*.50,.0035,'deck');
    squareRails(b,y+room*.23,width,.010,high?6:3,.0009);
    b.cylinder(.016,.016,y+room*.24,y+room*.60,'deck',high?28:16);
    for(const h of [.27,.43,.60])b.cylinder(.0172,.0172,y+room*h-.001,y+room*h+.001,'shadow',high?28:16);
    smallDome(b,y+room*.61,.0165,room*.20,detail);
    b.cylinder(.0048,.0048,y+room*.81,y+room*.92,'deck',8);
    b.cylinder(.0048,0,y+room*.92,1,'deck',8);
  } else if (p.topKind === 'looped-crown') {
    // Svrčinovec's 2010 photo shows a flared open basket, dark collar and two crossed crown loops.
    const y=p.upperEnd, room=1-y, width=p.topWidth??.046, r=width/2;
    for(let side=0;side<4;side+=1){
      for(const sign of [-1,1])b.beam(facePoint(sign*r*.45,y,side,r*.45),facePoint(sign*r,y+room*.29,side,r),.0017);
      for(let i=0;i<3;i+=1){
        const lo=y+room*.29*i/3,hi=y+room*.29*(i+1)/3;
        const r0=lerp(r*.45,r,i/3),r1=lerp(r*.45,r,(i+1)/3);
        b.beam(facePoint(-r0,lo,side,r0),facePoint(r1,hi,side,r1),.00095);
        b.beam(facePoint(r0,lo,side,r0),facePoint(-r1,hi,side,r1),.00095);
        b.beam(facePoint(-r1,hi,side,r1),facePoint(r1,hi,side,r1),.0008);
      }
    }
    b.box(width*1.10,room*.09,width*1.10,v(0,y+room*.31,0),'shadow');
    b.box(width*.97,room*.07,width*.97,v(0,y+room*.40,0),'shadow');
    for(const side of [0,1])for(let i=0;i<(high?20:12);i+=1){
      const count=high?20:12,point=(t:number)=>facePoint(r*.72*Math.cos(t),y+room*.455+room*.21*Math.sin(t),side,0);
      b.beam(point(Math.PI*i/count),point(Math.PI*(i+1)/count),.0018,'shadow');
    }
    b.cylinder(.006,.003,y+room*.64,y+room*.80,'shadow',8);
    b.cylinder(.0008,.0004,y+room*.79,1,'antenna',6);
  } else if(p.topKind==='open-corner-crown'){
    // Netivot: the small summit is an open cage with corner finials, not a glazed Paris observation cabin.
    const y=p.upperEnd,room=1-y,width=p.topWidth??.050,r=width/2;
    squareRing(b,y+.001,width*.92,width*.60,.003,'deck');
    for(let side=0;side<4;side+=1){
      for(const sign of [-1,1])b.beam(facePoint(sign*r*.79,y,side,r*.79),facePoint(sign*r*.89,y+room*.35,side,r*.89),.0021);
      b.beam(facePoint(-r*.79,y,side,r*.79),facePoint(r*.89,y+room*.35,side,r*.89),.0010);
      b.beam(facePoint(r*.79,y,side,r*.79),facePoint(-r*.89,y+room*.35,side,r*.89),.0010);
    }
    squareRing(b,y+room*.39,width,width*.54,room*.09,'deck');
    squareRails(b,y+room*.435,width*.93,room*.11,high?8:4,.0008);
    for(const sx of [-1,1])for(const sz of [-1,1]){
      b.box(.0035,room*.11,.0035,v(sx*r*.90,y+room*.56,sz*r*.90),'deck');
      b.ellipsoid(.0022,room*.045,.0022,v(sx*r*.90,y+room*.65,sz*r*.90),new THREE.Quaternion(),'deck',8);
    }
    for(const side of [0,1])for(let i=0;i<(high?16:8);i+=1){
      const count=high?16:8,point=(t:number)=>facePoint(r*.54*Math.cos(t),y+room*.54+room*.12*Math.sin(t),side,0);
      b.beam(point(Math.PI*i/count),point(Math.PI*(i+1)/count),.0008,'deck');
    }
    b.cylinder(.0008,.0004,y+room*.65,1,'antenna',6);
  } else if (p.topKind === 'square-lantern') {
    const y=p.upperEnd, room=1-y, width=p.topWidth??.050;
    const cabinRoom=p.crownHeightRatio===undefined?room:room*p.crownHeightRatio/.46, top=y+cabinRoom*.46;
    squareRing(b,y+.002,width*1.15,width*.6,.004,'deck');
    for(let side=0;side<4;side+=1){
      const rotation=new THREE.Quaternion().setFromAxisAngle(Y,side*Math.PI/2);
      b.box(width*.87,cabinRoom*.38,.0018,facePoint(0,y+cabinRoom*.24,side,width*.44),'clock',rotation);
      for(const x of [-width*.45,0,width*.45])b.beam(facePoint(x,y,side,width*.46),facePoint(x,top,side,width*.46),.0018,'structure');
    }
    b.box(width*1.1,.004,width*1.1,v(0,top,0),'deck');
    needle(b,top+.001,.0008);
  } else if (p.topKind === 'historic-campanile') {
    // Fassler's 2025 installation video shows the 1889-style open dome and a short stepped finial.
    const y = p.upperEnd, room = 1 - y, width = p.topWidth ?? .051;
    const gallery = chamferedSquare(width, .29), domeY = y + room * .27, domeH = room * .40;
    b.polygonRing(gallery, .60, y + .003, room * .075, 'deck');
    glassCabin(b, y + room * .08, y + room * .22, width * .73, detail);
    b.polygonRing(gallery, .60, y + room * .23, .0030, 'deck');
    polygonRails(b, gallery, y + room * .075, room * .17, high ? 5 : 3, .00078);
    b.polygonRing(chamferedSquare(width * .82, .29), .65, domeY, .0023, 'deck');
    const spokes = high ? 12 : 8, steps = high ? 8 : 4;
    for (let i = 0; i < spokes; i += 1) {
      const angle = i * Math.PI * 2 / spokes;
      for (let j = 0; j < steps; j += 1) {
        const a = Math.PI / 2 * j / steps, z = Math.PI / 2 * (j + 1) / steps;
        const point = (t: number) => v(width * .39 * Math.cos(t) * Math.cos(angle),
          domeY + domeH * Math.sin(t), width * .39 * Math.cos(t) * Math.sin(angle));
        b.beam(point(a), point(z), .00088, 'deck');
      }
    }
    b.cylinder(width * .135, width * .105, y + room * .26, y + room * .76, 'deck', 8);
    b.cylinder(width * .13, width * .13, y + room * .72, y + room * .76, 'deck', 8);
    b.cylinder(width * .09, width * .06, y + room * .76, y + room * .86, 'deck', 8);
    b.cylinder(width * .075, width * .075, y + room * .84, y + room * .87, 'deck', 8);
    b.cylinder(width * .055, 0, y + room * .87, 1, 'deck', 8);
  } else if (p.topKind === 'anchor') {
    // Bitung's photographed nautical crown is a flat anchor, not an observation room or transmitter.
    const y = p.upperEnd, room = 1 - y, w = p.topWidth ?? .026, z = .0005;
    squareRing(b, y + .002, w * .8, w * .45, .002, 'deck');
    const crownY = y + room * .85, ringR = room * .085, count = high ? 16 : 8;
    for (let i = 0; i < count; i += 1) {
      const a = i * Math.PI * 2 / count, f = (i + 1) * Math.PI * 2 / count;
      b.beam(v(ringR * Math.cos(a), crownY + ringR * Math.sin(a), z),
        v(ringR * Math.cos(f), crownY + ringR * Math.sin(f), z), .0011, 'deck');
    }
    b.beam(v(0, y + room * .15, z), v(0, crownY - ringR * .6, z), .002, 'deck');
    b.beam(v(-w * .52, y + room * .59, z), v(w * .52, y + room * .59, z), .0017, 'deck');
    for (const sign of [-1, 1]) {
      b.beam(v(0, y + room * .16, z), v(sign * w * .49, y + room * .28, z), .0022, 'deck');
      b.beam(v(sign * w * .49, y + room * .28, z), v(sign * w * .65, y + room * .46, z), .0022, 'deck');
      b.beam(v(sign * w * .65, y + room * .46, z), v(sign * w * .30, y + room * .39, z), .0020, 'deck');
    }
  } else if (p.topKind === 'square-cage') {
    const y = p.upperEnd, room = 1 - y, width = p.topWidth ?? .042;
    squareRing(b, y + .003, width * 1.12, width * .67, .0033, 'deck');
    squareRails(b, y + .004, width, room * .48, high ? 5 : 3, .00094);
    squareRing(b, y + room * .52, width * .95, width * .73, .0025, 'deck');
    needle(b, y + room * .51, .00083);
  } else if (p.topKind === 'flag-hip-roof') {
    const y = p.upperEnd, room = 1 - y, width = p.topWidth ?? .054, r = width / 2;
    const crownRoom = room * (p.crownHeightRatio ?? 1);
    squareRing(b, y + .003, width * 1.22, width * .65, .004, 'deck');
    squareRails(b, y + .005, width * 1.13, crownRoom * .35, high ? 7 : 4, .00095);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.beam(v(sx * r, y + .003, sz * r),
      v(sx * r, y + crownRoom * .48, sz * r), .0015);
    b.taperedSquare(width * 1.18, width * .15, y + crownRoom * .48, y + crownRoom * .80, 'deck');
    b.beam(v(0, y + crownRoom * .76, 0), v(0, 1, 0), .00090, 'antenna');
  } else if (p.topKind === 'open-rim') {
    const width = (p.upperCentre + p.upperSection / 2) * 2.18;
    squareRing(b, p.upperEnd, width, width * .79, .0030, 'deck');
    squareRails(b, p.upperEnd, width, .0040, 4, .00070);
  } else if (p.topKind === 'open-point') {
    const width = Math.max(.018, (p.upperCentre + p.upperSection / 2) * 2.1), r = width / 2;
    squareRing(b, p.upperEnd + .001, width * 1.07, width * .80, .0017, 'deck');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.beam(v(sx * r, p.upperEnd, sz * r), v(0, 1, 0), .00080);
  } else if (p.topKind === 'perforated-box') {
    const y = p.upperEnd + .002, end = p.topNeedle ? .969 : .996, width = p.topWidth ?? .052, r = width / 2;
    const panel = new THREE.Shape(); panel.moveTo(-r, y); panel.lineTo(r, y); panel.lineTo(r, end); panel.lineTo(-r, end); panel.closePath();
    for (let row = 0; row < 3; row += 1) for (let column = 0; column < 2; column += 1) {
      const x = (column === 0 ? -.24 : .24) * width, cy = lerp(y, end, (row + .5) / 3), halfW = width * .11, halfH = (end - y) * .10;
      const hole = new THREE.Path(); hole.moveTo(x - halfW, cy - halfH); hole.lineTo(x - halfW, cy + halfH);
      hole.lineTo(x + halfW, cy + halfH); hole.lineTo(x + halfW, cy - halfH); hole.closePath(); panel.holes.push(hole);
    }
    for (let side = 0; side < 4; side += 1) b.facade(panel, side, () => r, 'deck');
    squareRing(b, y + .001, width * 1.08, width * .58, .003, 'deck');
    squareRing(b, end + .002, width * 1.04, 0, .004, 'deck');
    if (p.topNeedle) needle(b, end + .004, .00090);
  } else if (p.topKind === 'flat-cap') {
    const y = p.upperEnd, width = Math.max(.025, (p.upperCentre + p.upperSection / 2) * 2.1);
    b.box(width * .72, (1 - y) * .70, width * .72, v(0, y + (1 - y) * .35, 0), 'deck');
    b.box(width * 1.1, (1 - y) * .13, width * 1.1, v(0, y + (1 - y) * .73, 0), 'deck');
    b.box(width * .43, (1 - y) * .22, width * .43, v(0, y + (1 - y) * .89, 0), 'deck');
  } else if (p.topKind === 'round-cage') {
    let y = p.upperEnd;
    const crownPaint:Paint=p.darkCrown?'shadow':'deck';
    if (p.boxBelowCage) {
      const height = (1 - y) * .30, width = p.topWidth ?? .049;
      squareRing(b, y + .002, width * 1.22, width * .70, .0035, 'deck');
      b.box(width, height, width, v(0, y + height / 2, 0), 'deck');
      y += height + .003;
    }
    const room = 1 - y, r = Math.max(.016, (p.upperCentre + p.upperSection / 2) * 1.60);
    const spokes = p.crownSpokes ?? (high ? 16 : 10);
    const wall = p.cageWallRatio ?? .53, dome = p.cageDomeRatio ?? .23;
    for (const yy of [y + .003, y + room * wall * .40, y + room * wall]) {
      b.cylinder(r * 1.02, r * 1.02, yy - .0014, yy + .0014, crownPaint, spokes);
    }
    if (p.cageSquareFrame) squareRails(b, y + .003, r * 1.48, room * wall - .003, high ? 6 : 3, .0009);
    for (let i = 0; i < spokes; i += 1) {
      const angle = i * Math.PI * 2 / spokes, x = r * Math.cos(angle), z = r * Math.sin(angle);
      if (!p.cageSquareFrame) b.beam(v(x, y + .003, z), v(x, y + room * wall, z), .00085, p.darkCrown?'shadow':'structure');
      for (let j = 0; j < (high ? 8 : 4); j += 1) {
        const n = high ? 8 : 4, a = Math.PI / 2 * j / n, f = Math.PI / 2 * (j + 1) / n;
        b.beam(v(x * Math.cos(a), y + room * wall + room * dome * Math.sin(a), z * Math.cos(a)),
          v(x * Math.cos(f), y + room * wall + room * dome * Math.sin(f), z * Math.cos(f)), .00070, crownPaint);
      }
    }
    if (!p.omitNeedle) needle(b, y + room * (wall + dome - .01), .00080);
    if(p.crownRedObject)b.box(.022,room*.24,.021,v(0,y+room*.22,0),'enamel');
    if (p.mastArm) b.beam(v(0, .991, 0), v(.018, .997, 0), .00075, 'antenna');
  } else if (p.topKind === 'ring-mast') {
    const y = p.upperEnd, room = 1 - y;
    for (const [lo, hi, radius] of [[0, .18, .020], [.18, .32, .015], [.32, .49, .011], [.49, .64, .008], [.64, .80, .0045]]) {
      b.cylinder(radius, radius * .81, y + room * lo, y + room * hi, 'deck', high ? 12 : 8);
      b.cylinder(radius * 1.16, radius * 1.16, y + room * lo, y + room * lo + .0020, 'antenna', high ? 12 : 8);
    }
    needle(b, y + room * .78, .0010);
  } else if (p.topKind === 'clock') {
    const y = p.upperEnd + .003, width = .087, rise = .092, r = width / 2;
    b.box(width, rise, width, v(0, y + rise / 2, 0), 'deck');
    for (let side = 0; side < 4; side += 1) {
      const rotation = new THREE.Quaternion().setFromAxisAngle(Y, side * Math.PI / 2);
      if(p.clockRoundFace)b.ellipsoid(width*.44,rise*.43,.0008,facePoint(0,y+rise/2,side,r+.0008),rotation,'clock',high?28:16);
      else b.box(width * .94, rise * .94, .0013, facePoint(0, y + rise / 2, side, r + .0008), 'clock', rotation);
      for (let i = 0; i < 12; i += 1) {
        const angle = i * Math.PI / 6;
        b.beam(facePoint(Math.sin(angle) * width * .29, y + rise / 2 + Math.cos(angle) * rise * .29, side, r + .0019),
          facePoint(Math.sin(angle) * width * .38, y + rise / 2 + Math.cos(angle) * rise * .38, side, r + .0019), .0020, 'antenna');
      }
      // Schematic stationary hands identify the clock, without claiming its current time.
      b.beam(facePoint(0, y + rise / 2, side, r + .0023), facePoint(-.015, y + rise / 2 + .024, side, r + .0023), .0021, 'antenna');
      b.beam(facePoint(0, y + rise / 2, side, r + .0024), facePoint(-.019, y + rise / 2 - .027, side, r + .0024), .0017, 'antenna');
    }
    const y0 = y + rise, mastEnd = .999;
    if(!p.photoCrown)for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.beam(v(sx * .011, y0, sz * .011), v(sx * .001, mastEnd, sz * .001), .00105);
    }
    if(!p.photoCrown)squareRing(b, y0 + .012, .020, .012, .0012, 'deck');
  } else if (p.topKind === 'flag-cage') {
    const y = p.upperEnd, width = .041;
    squareRing(b, y + .002, width * 1.20, .020, .0040, 'deck');
    loopRails(b, y + .004, width * 1.18, .023, 1, detail);
    b.beam(v(0, y + .018, 0), v(0, .999, 0), .0010, 'antenna');
  } else if (p.topKind === 'plain-cabin' || p.topKind === 'tiered-cabin' || p.topKind === 'needle-cage' || p.topKind === 'small-dome') {
    const y = p.upperEnd, room = 1 - y, r = (p.upperCentre + p.upperSection / 2) * 1.38;
    const width = Math.max(.025, r * 2), y1 = y + room * .36;
    squareRing(b, y + .002, width * 1.35, width * .59, .004, 'deck');
    if (p.topKind === 'needle-cage') {
      squareRails(b, y + .003, width * 1.29, room * .22, high ? 7 : 4, .0009);
      for (const side of [0, 1]) for (const depth of [-width * .42, width * .42]) {
        for (let i = 0; i < (high ? 16 : 8); i += 1) {
          const n = high ? 16 : 8, a = Math.PI * i / n, z = Math.PI * (i + 1) / n;
          b.beam(facePoint(width * .50 * Math.cos(a), y1 + room * .24 * Math.sin(a), side, depth),
            facePoint(width * .50 * Math.cos(z), y1 + room * .24 * Math.sin(z), side, depth), .00075, 'deck');
        }
      }
      needle(b, y + room * .62, .00070);
    } else if (p.topKind === 'small-dome') {
      b.cylinder(width * .44, width * .43, y + .007, y1, 'deck', high ? 12 : 8);
      smallDome(b, y1, width * .47, room * .17, detail);
      needle(b, y + room * .55, .00065);
    } else {
      glassCabin(b, y + .008, y1, width * .73, detail);
      squareRails(b, y + .004, width * 1.29, room * .16, high ? 7 : 4, .00085);
      squareRing(b, y1 + .003, width * 1.10, 0, .004, 'deck');
      if (p.topKind === 'tiered-cabin') {
        b.box(width * .63, room * .18, width * .63, v(0, y + room * .51, 0), 'deck');
        squareRing(b, y + room * .62, width * .84, 0, .003, 'deck');
      } else smallDome(b, y1 + .006, width * .38, room * .14, detail);
      needle(b, y + room * .65, .00080);
    }
  } else if (p.topKind === 'plain-needle') {
    needle(b, p.upperEnd, .00075);
  } else if (p.topKind === 'montmartre') {
    // Both 2015 views show a solid narrow pyramid; no occupied observation cabin or transmission mast.
    squareRing(b, .928, .038, .025, .004, 'deck');
    const corners = [v(-.015, .933, -.015), v(.015, .933, -.015), v(.015, .933, .015), v(-.015, .933, .015), v(0, 1, 0)];
    b.surface(corners, [0, 4, 1, 1, 4, 2, 2, 4, 3, 3, 4, 0, 0, 1, 2, 0, 2, 3], 'deck');
  } else if (p.topKind === 'kings-island') {
    // The large octagonal observation enclosure and tiered roof dominate the verified 2009 silhouette.
    const scale = (p.topWidth ?? .088) / .088;
    const lower = chamferedSquare(.085 * scale, .30), upper = chamferedSquare(.088 * scale, .30);
    b.polygonRing(lower, .48, .836, .009, 'deck');
    b.polygonRing(chamferedSquare(.077 * scale, .30), .63, .852, .025, 'shadow');
    b.polygonRing(upper, .63, .884, .033, 'deck');
    polygonRails(b, upper, .903, .007, high ? 4 : 2, .001);
    // Set-back window band remains visible between the upper and lower structural rings.
    for (let i = 0; i < upper.length; i += 1) {
      const a = upper[i], z = upper[(i + 1) % upper.length];
      const delta = v(z.x - a.x, 0, z.y - a.y), length = delta.length();
      const rotation = new THREE.Quaternion().setFromAxisAngle(Y, -Math.atan2(delta.z, delta.x));
      b.box(length * .94, .016, .0013, v((a.x + z.x) * .475, .876, (a.y + z.y) * .475), 'glass', rotation);
      b.beam(v(a.x * .78, .826, a.y * .78), v(a.x, .835, a.y), .0020, 'shadow');
    }
    const base = chamferedSquare(.065 * scale, .15), top = chamferedSquare(.042 * scale, .15);
    const roof = [...base.map(point => v(point.x, .913, point.y)), ...top.map(point => v(point.x, .960, point.y))];
    const faces: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      const next = (i + 1) % 8;
      faces.push(i, i + 8, next, next, i + 8, next + 8);
    }
    b.surface(roof, faces, 'deck');
    b.polygonRing(top, 0, .960, .0023, 'deck');
    b.cylinder(.007 * scale, .003 * scale, .960, .977, 'deck', 8);
    needle(b, .977, .00075);
  } else if (p.topKind === 'bloemfontein') {
    squareRing(b, .880, .051, .018, .0035, 'deck');
    squareRails(b, .882, .051, .013, high ? 5 : 3, .0010);
    squareRing(b, .899, .039, .017, .0034, 'deck');
    const levels = subdivided(.904, .997, high ? 9 : 5);
    for (let j = 0; j < levels.length - 1; j += 1) {
      const y0 = levels[j], y1 = levels[j + 1], r0 = lerp(.0080, .0035, (y0 - .904) / .093), r1 = lerp(.0080, .0035, (y1 - .904) / .093);
      for (let side = 0; side < 4; side += 1) {
        b.beam(facePoint(-r0, y0, side, r0), facePoint(-r1, y1, side, r1), .00082, 'antenna');
        b.beam(facePoint(-r0, y0, side, r0), facePoint(r1, y1, side, r1), .00061, 'antenna');
        b.beam(facePoint(-r0, y0, side, r0), facePoint(r0, y0, side, r0), .00057, 'antenna');
      }
    }
    b.cylinder(.00075, 0, .997, 1, 'antenna', 6);
    // The photographed business sign is retained as a plain sign panel; its lettering is outside this geometry scope.
    for (const side of [0, 1]) {
      const rotation = new THREE.Quaternion().setFromAxisAngle(Y, side * Math.PI / 2);
      b.box(.074, .042, .0016, facePoint(0, .473, side, .0375), 'stone', rotation);
      b.beam(facePoint(-.037, .453, side, .039), facePoint(.037, .453, side, .039), .0014, 'deck');
    }
  } else if (p.topKind === 'las-vegas') {
    glassCabin(b, .846, .875, .047, detail);
    squareRing(b, .841, .070, .036, .008, 'deck');
    squareRails(b, .846, .069, .018, high ? 10 : 5, .0010);
    squareRing(b, .875, .054, .027, .004, 'deck');
    squareRails(b, .879, .054, .022, high ? 9 : 4, .00075);
    // The two side arc covers are an open protective cage above the square deck, rather than Paris's modern mast.
    for (const side of [0, 1]) for (const offset of [-.019, .019]) {
      for (let j = 0; j < (high ? 16 : 8); j += 1) {
        const count = high ? 16 : 8, a = Math.PI * j / count, z = Math.PI * (j + 1) / count;
        b.beam(facePoint(.027 * Math.cos(a), .899 + .030 * Math.sin(a), side, offset),
          facePoint(.027 * Math.cos(z), .899 + .030 * Math.sin(z), side, offset), .00082, 'deck');
      }
    }
    smallDome(b, .930, .012, .016, detail);
    b.cylinder(.0060, .0030, .946, .965, 'deck', 8);
    needle(b, .965, .00082);
  } else if (p.topKind === 'paris') {
    glassCabin(b, 276 / 330, .867, .0355, detail);
    squareRails(b, .838, .048, .0085, high ? 12 : 6, .00065);
    squareRails(b, .869, .043, .0060, high ? 10 : 5, .00062);
    b.cylinder(.015, .010, .870, .885, 'deck', 12);
    b.cylinder(.0053, .0031, .884, .916, 'antenna', 8);
    // A restrained contemporary antenna silhouette; exact individual transmitter units are not surveyed.
    for (const [y0, y1, radius] of [[.914, .939, .0033], [.939, .958, .00255], [.958, .978, .0018]]) {
      b.cylinder(radius, radius * .85, y0, y1, 'antenna', 8);
      b.cylinder(radius * 1.35, radius * 1.35, y0, y0 + .0019, 'antenna', 8);
    }
    needle(b, .976, .00128);
    if (high) for (const [x, z] of [[-.009, 0], [.009, 0], [0, -.009], [0, .009]]) {
      b.beam(v(x, .878, z), v(x * .36, .918, z * .36), .00075, 'antenna');
    }
  } else if (p.topKind === 'open-cage') {
    // Parque Europa has an open bulb-shaped lattice crown, not Paris's occupied observation rooms.
    const topY = (y: number) => p.key === 'parque-europa' ? y : p.upperEnd + (1 - p.upperEnd) * (y - .855) / .145;
    const rings = [{ y: topY(.855), r: .014 }, { y: topY(.878), r: .0215 }, { y: topY(.923), r: .0195 }, { y: topY(.955), r: .002 }];
    const spokes = high ? 12 : 8;
    for (let j = 0; j < rings.length - 1; j += 1) {
      const a = rings[j], z = rings[j + 1];
      for (let i = 0; i < spokes; i += 1) {
        const t = Math.PI * 2 * i / spokes, t1 = Math.PI * 2 * (i + 1) / spokes;
        b.beam(v(a.r * Math.cos(t), a.y, a.r * Math.sin(t)),
          v(z.r * Math.cos(t), z.y, z.r * Math.sin(t)), .00094);
        if (j < 2) b.beam(v(a.r * Math.cos(t), a.y, a.r * Math.sin(t)),
          v(a.r * Math.cos(t1), a.y, a.r * Math.sin(t1)), .00078);
        if (high && j === 1) b.beam(v(a.r * Math.cos(t), a.y, a.r * Math.sin(t)),
          v(z.r * Math.cos(t1), z.y, z.r * Math.sin(t1)), .00068, 'shadow');
      }
    }
    for (const y of [.884, .894, .904, .914, .923]) {
      const r = lerp(.0215, .0195, (y - .878) / (.923 - .878));
      for (let i = 0; i < spokes; i += 1) {
        const a = Math.PI * 2 * i / spokes, z = Math.PI * 2 * (i + 1) / spokes;
        b.beam(v(r * Math.cos(a), topY(y), r * Math.sin(a)), v(r * Math.cos(z), topY(y), r * Math.sin(z)), .00068);
      }
    }
    needle(b, topY(.954), .00080);
  } else if (p.topKind === 'karachi') {
    // Two separate chamfered balconies and a tall central glazed elevator shaft.
    for (const [y, width] of [[.866, .066], [.939, .058]]) {
      const points = chamferedSquare(width);
      b.polygonRing(points, .53, y, .0048, 'deck');
      polygonRails(b, points, y + .0025, .011, high ? 4 : 2, .00082);
    }
    glassCabin(b, .871, .932, .033, detail);
    b.cylinder(.018, .006, .940, .958, 'deck', 8);
    needle(b, .958, .00125);
  } else if (p.topKind === 'shenzhen') {
    // Two new full-height views show a low angular turret, not a tall water-tank-like box.
    b.polygonRing(chamferedSquare(.049), .41, .921, .006, 'deck');
    glassCabin(b, .927, .954, .034, detail);
    polygonRails(b, chamferedSquare(.049), .926, .0075, high ? 4 : 2, .00070);
    b.polygonRing(chamferedSquare(.040), 0, .958, .0035, 'deck');
    b.cylinder(.012, .0058, .960, .970, 'deck', 12);
    b.cylinder(.0028, .0014, .970, .986, 'antenna', 8);
    needle(b, .984, .00070);
  } else if (p.topKind === 'tianducheng') {
    // Tianducheng's historical small viewing box, canopy and straight needle are distinct from the Paris mast.
    b.polygonRing(chamferedSquare(.041), .42, .848, .009, 'deck');
    polygonRails(b, chamferedSquare(.041), .852, .006, high ? 4 : 2, .00062);
    glassCabin(b, .862, .887, .0275, detail);
    squareRails(b, .890, .0355, .0048, high ? 8 : 4, .00058);
    smallDome(b, .897, .016, .016, detail);
    needle(b, .913, .00076);
  } else if (p.topKind === 'macao') {
    b.polygonRing(chamferedSquare(.052), .41, .879, .005, 'deck');
    polygonRails(b, chamferedSquare(.053), .882, .008, high ? 4 : 2, .00072);
    glassCabin(b, .888, .919, .038, detail);
    b.polygonRing(chamferedSquare(.044), 0, .923, .0037, 'deck');
    // The daytime reference shows a faceted hipped cap, not a smooth hemispherical dome.
    const roofRings = [{ y: .927, width: .038 }, { y: .937, width: .026 }, { y: .945, width: .010 }];
    for (let level = 0; level < roofRings.length - 1; level += 1) {
      const lower = roofRings[level], upper = roofRings[level + 1];
      const a = chamferedSquare(lower.width), c = chamferedSquare(upper.width);
      for (let i = 0; i < a.length; i += 1) {
        const j = (i + 1) % a.length;
        b.surface([v(a[i].x, lower.y, a[i].y), v(a[j].x, lower.y, a[j].y),
          v(c[j].x, upper.y, c[j].y), v(c[i].x, upper.y, c[i].y)], [0, 2, 1, 0, 3, 2], 'deck');
        b.beam(v(a[i].x, lower.y, a[i].y), v(c[i].x, upper.y, c[i].y), .00055, 'structure');
      }
    }
    b.cylinder(.0060, .0028, .946, .962, 'deck', 8);
    needle(b, .961, .00092);
  } else if (p.topKind === 'cowboy') {
    squareRing(b, .819, .045, .022, .0025, 'deck');
    squareRing(b, .852, .071, .024, .0025, 'deck');
    squareRails(b, .841, .071, .014, high ? 7 : 4, .0015);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.beam(v(sx * .015, .813, sz * .015), v(sx * .033, .852, sz * .033), .0023);
      b.beam(v(sx * .033, .852, sz * .033), v(sx * .018, .873, sz * .018), .0017);
    }
    buildCowboyHat(b, detail);
  }
}

function buildLift(b: ModelBuilder, p: TowerProfile, ss: Station[], detail: Detail): void {
  if (p.key === 'karachi') {
    b.box(.025, .926 - .007, .020, v(0, (.926 + .007) / 2, 0), 'glass');
    for (const x of [-.0135, .0135]) for (const z of [-.011, .011]) {
      b.beam(v(x, .007, z), v(x, .934, z), .00118, 'shadow');
    }
    for (const y of subdivided(.018, .927, detail === 'detail' ? 36 : 18)) {
      b.beam(v(-.0135, y, .011), v(.0135, y, .011), .00077, 'deck');
      if (detail === 'detail') b.beam(v(-.0135, y, -.011), v(.0135, y, -.011), .00077, 'deck');
    }
  } else if (p.key === 'macao') {
    const y0 = p.first.y + .002, y1 = .917;
    // Macau's documented elevator core is recessed and structurally framed.
    // The photographs do not show Karachi's conspicuous pale glazed column;
    // keep a narrow neutral service spine, rather than inventing a blue glass tube.
    b.box(.0105, y1 - y0, .009, v(0, (y0 + y1) / 2, 0), 'shadow');
    for (const x of [-.012, .012]) for (const z of [-.010, .010]) {
      b.beam(v(x, y0, z), v(x, y1, z), .0011, 'shadow');
    }
    for (const y of subdivided(y0, y1, detail === 'detail' ? 25 : 14)) {
      b.beam(v(-.012, y, .010), v(.012, y, .010), .00065, 'deck');
    }
    // The real bridge connects to the hotel. The standalone tower omits that unsupported cut span.
  } else if (detail === 'detail' && ['paris', 'shenzhen', 'tianducheng', 'las-vegas'].includes(p.key)) {
    // Inclined lower guide tracks remain inside two pylons; the upper guide rails are central.
    const levels = subdivided(.017, p.second.y, 23);
    for (const sx of [-1, 1]) {
      for (let j = 0; j < levels.length - 1; j += 1) {
        const a = sectionCorners(ss, levels[j], sx, 1), z = sectionCorners(ss, levels[j + 1], sx, 1);
        b.beam(a[0].clone().lerp(a[1], .39), z[0].clone().lerp(z[1], .39), .00078, 'shadow');
        b.beam(a[0].clone().lerp(a[1], .61), z[0].clone().lerp(z[1], .61), .00078, 'shadow');
      }
    }
    for (const x of [-.0036, .0036]) for (const z of [-.0018, .0018]) {
      b.beam(v(x, p.second.y + .008, z), v(x, p.upperEnd - .004, z), .00058, 'shadow');
    }
  }
}

function buildSpire(b: ModelBuilder, p: TowerProfile, detail: Detail): void {
  if (p.key === 'by-paryz-eiffel-tower') {
    buildParyzMonument(b, p, detail);
    return;
  }
  const levels = subdivided(.003, .934, detail === 'detail' ? p.upperBays : Math.ceil(p.upperBays / 2));
  const radius = (y: number) => lerp(p.baseWidth / 2, .0042, (y - .003) / .931);
  for (let i = 0; i < levels.length - 1; i += 1) {
    const y0 = levels[i], y1 = levels[i + 1], r0 = radius(y0), r1 = radius(y1);
    for (let side = 0; side < 4; side += 1) {
      b.beam(facePoint(-r0, y0, side, r0), facePoint(-r1, y1, side, r1), p.mainWidth, 'structure');
      latticeFace(b, facePoint(-r0, y0, side, r0), facePoint(r0, y0, side, r0),
        facePoint(-r1, y1, side, r1), facePoint(r1, y1, side, r1), 1, p.latticeWidth, false);
    }
  }
  b.beam(v(0, .934, 0), v(0, .999, 0), .0025, 'structure');
  b.beam(v(-.029, .970, 0), v(.029, .970, 0), .0024, 'structure');
}

/** Paryž's 2015 ground-level photograph: splayed independent feet and a long narrow shaft.
 * The background building is separate. Photo proportions and hidden-face symmetry are estimates.
 */
function buildParyzMonument(b: ModelBuilder, p: TowerProfile, detail: Detail): void {
  const high = detail === 'detail';
  const shape: Station[] = p.customStations ?? [
    { y: .006, c: .0705, w: .023, linear: true }, { y: .176, c: .041, w: .012 },
    { y: .225, c: .0265, w: .0038 }, { y: .548, c: .0188, w: .003 },
    { y: .758, c: .0165, w: .0025 }, { y: .822, c: .011, w: .002 },
    { y: .882, c: .0018, w: .0014 },
  ];
  const joinY = shape[2].y, crossBase = shape[shape.length - 1].y;
  const lowerLevels = [...subdivided(shape[0].y, shape[1].y, high ? 4 : 3), joinY];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const foot = sectionCorners(shape, shape[0].y, sx, sz);
    b.box(.029, .006, .029, v(sx * shape[0].c, .003, sz * shape[0].c), 'stone');
    for (let j = 0; j < lowerLevels.length - 1; j += 1) {
      const lo = sectionCorners(shape, lowerLevels[j], sx, sz), hi = sectionCorners(shape, lowerLevels[j + 1], sx, sz);
      for (let corner = 0; corner < 4; corner += 1) b.beam(lo[corner], hi[corner], .0023);
      for (let side = 0; side < 4; side += 1) latticeFace(b, lo[side], lo[(side + 1) % 4], hi[side], hi[(side + 1) % 4], 1, .0010, false);
    }
    // Keep the four separate ground contacts; there is no perimeter cage closing the feet.
    for (let side = 0; side < 4; side += 1) b.beam(foot[side], foot[(side + 1) % 4], .0016);
  }
  squareRing(b, shape[1].y, .114, .091, .0025, 'deck');
  const levels = [...new Set([joinY, ...subdivided(joinY, crossBase, high ? 17 : 12), ...shape.slice(3).map(s => s.y)])].sort((a, z) => a - z);
  for (let j = 0; j < levels.length - 1; j += 1) {
    const lo = outerCorners(shape, levels[j]), hi = outerCorners(shape, levels[j + 1]);
    const chord = levels[j] > .758 ? .0012 : .00165;
    for (let side = 0; side < 4; side += 1) {
      b.beam(lo[side], hi[side], chord);
      latticeFace(b, lo[side], lo[(side + 1) % 4], hi[side], hi[(side + 1) % 4], 1, .00085, false);
    }
  }
  // One clearly visible high platform; do not add the usual two large Eiffel tourist decks.
  squareRing(b, .548, .063, .044, .003, 'deck');
  squareRails(b, .550, .062, .013, high ? 5 : 3, .00075);
  b.beam(v(0, crossBase, 0), v(0, .999, 0), .0020);
  b.beam(v(-.040, .959, 0), v(.040, .959, 0), .00185);
}

/** Gasquet only: load-bearing fieldstone volumes with shallow embedded cobbles.
 * Paste before buildMasonry; call only for the exact key + photoPebbleSurface.
 * Existing b.surface and public b.buckets are used; no Builder API changes.
 */
function buildGasquetFieldstone(b: ModelBuilder, p: TowerProfile, detail: Detail): void {
  type MeshData = { points: THREE.Vector3[]; indices: number[]; colors: number[] };
  type Level = { y: number; x: number; z: number; rx: number; rz: number };
  const core: MeshData = { points: [], indices: [], colors: [] };
  const rocks: MeshData = { points: [], indices: [], colors: [] };
  const palette = ['#62665e', '#777a70', '#535b55', '#6b7067', '#868477', '#585f59', '#70766e'].map(c => new THREE.Color(c));
  const mortar = new THREE.Color('#353d37');
  const noise = (a: number, seed = 0) => { const q = Math.sin(a * 127.17 + seed * 31.713) * 43758.5453; return q - Math.floor(q); };
  const push = (mesh: MeshData, points: THREE.Vector3[], indices: number[], tint: THREE.Color, shades?: number[]) => {
    const offset = mesh.points.length;
    mesh.points.push(...points); mesh.indices.push(...indices.map(i => i + offset));
    for (let i = 0; i < points.length; i++) { const s = shades?.[i] ?? 1; mesh.colors.push(tint.r * s, tint.g * s, tint.b * s); }
  };
  const mixLevel = (levels: Level[], y: number): Level => {
    let at = levels.findIndex((a, i) => i < levels.length - 1 && y <= levels[i + 1].y);
    if (at < 0) at = levels.length - 2;
    const a = levels[at], z = levels[at + 1], t = Math.max(0, Math.min(1, (y - a.y) / (z.y - a.y)));
    return { y, x: lerp(a.x, z.x, t), z: lerp(a.z, z.z, t), rx: lerp(a.rx, z.rx, t), rz: lerp(a.rz, z.rz, t) };
  };
  const surfacePoint = (level: Level, angle: number, exponent: number) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    return v(level.x + Math.sign(c) * Math.pow(Math.abs(c), exponent) * level.rx,
      level.y, level.z + Math.sign(s) * Math.pow(Math.abs(s), exponent) * level.rz);
  };
  const solid = (levels: Level[], exponent = .72, sides = 16) => {
    const points: THREE.Vector3[] = [], indices: number[] = [];
    for (const level of levels) for (let j = 0; j < sides; j++) points.push(surfacePoint(level, j * Math.PI * 2 / sides, exponent));
    for (let row = 0; row < levels.length - 1; row++) for (let j = 0; j < sides; j++) {
      const a = row * sides + j, z = row * sides + (j + 1) % sides, c = a + sides, d = z + sides;
      indices.push(a, c, z, z, c, d);
    }
    const lo = points.length; points.push(v(levels[0].x, levels[0].y, levels[0].z));
    const hi = points.length, last = levels.at(-1)!; points.push(v(last.x, last.y, last.z));
    for (let j = 0; j < sides; j++) {
      indices.push(lo, j, (j + 1) % sides);
      const a = (levels.length - 1) * sides + j, z = (levels.length - 1) * sides + (j + 1) % sides;
      indices.push(hi, z, a);
    }
    push(core, points, indices, mortar);
  };
  // Six irregular outline points are shared between LODs, so a finer crown
  // changes curvature but never the outside stone footprint. The back is
  // embedded; only a broad low cap emerges from the mortar, not a whole ball.
  let stoneId = 0;
  const pebble = (centre: THREE.Vector3, normal: THREE.Vector3, up: THREE.Vector3, width: number, height: number, depth: number, seed: number) => {
    stoneId++;
    const n = normal.clone().normalize(), x = up.clone().cross(n).normalize(), y = n.clone().cross(x).normalize();
    const tilt = (noise(seed, 8) - .5) * .36, co = Math.cos(tilt), si = Math.sin(tilt);
    const ax = x.clone().multiplyScalar(co).addScaledVector(y, si), ay = y.clone().multiplyScalar(co).addScaledVector(x, -si);
    const outline: Array<[number, number]> = [];
    for (let j = 0; j < 6; j++) {
      const angle = j * Math.PI / 3 + (noise(seed + j, 3) - .5) * .12;
      const r = .91 + noise(seed + j, 4) * .09;
      outline.push([Math.cos(angle) * width * .5 * r, Math.sin(angle) * height * .56 * r]);
    }
    const points: THREE.Vector3[] = [], indices: number[] = [], shades: number[] = [];
    const rings = detail === 'detail' ? [[.86, -.74, .70], [1, .10, .86], [.59, .56, 1.0]] : [[.86, -.74, .70], [1, .10, .89]];
    for (const [radius, z, shade] of rings) for (const [u, w] of outline) {
      points.push(centre.clone().addScaledVector(ax, u * radius).addScaledVector(ay, w * radius).addScaledVector(n, z * depth)); shades.push(shade);
    }
    for (let ring = 0; ring < rings.length - 1; ring++) for (let j = 0; j < 6; j++) {
      const a = ring * 6 + j, z = ring * 6 + (j + 1) % 6, c = a + 6, d = z + 6;
      indices.push(a, z, c, z, d, c);
    }
    const cap = points.length; points.push(centre.clone().addScaledVector(n, depth * .72)); shades.push(1.03);
    const back = points.length; points.push(centre.clone().addScaledVector(n, -depth * .74)); shades.push(.65);
    const front = (rings.length - 1) * 6;
    for (let j = 0; j < 6; j++) { indices.push(cap, front + j, front + (j + 1) % 6); indices.push(back, (j + 1) % 6, j); }
    const tint = palette[Math.floor(noise(seed, 9) * palette.length)].clone().multiplyScalar(.91 + noise(seed, 10) * .16);
    push(rocks, points, indices, tint, shades);
  };
  const courses = (levels: Level[], exponent: number, rowPitch: number, stoneWidth: number, seed: number) => {
    const min = levels[0].y, max = levels.at(-1)!.y;
    const rowCount = Math.max(1, Math.round((max - min) / rowPitch));
    const weights = Array.from({ length: rowCount }, (_, i) => .83 + noise(i, seed) * .34), total = weights.reduce((s, x) => s + x, 0);
    let cursor = min;
    for (let row = 0; row < rowCount; row++) {
      const rowHeight = (max - min) * weights[row] / total, y = cursor + rowHeight * .50; cursor += rowHeight;
      const level = mixLevel(levels, y), samples = 96;
      const curve = Array.from({ length: samples + 1 }, (_, i) => surfacePoint(level, i * Math.PI * 2 / samples, exponent));
      const lengths = [0]; for (let i = 1; i <= samples; i++) lengths.push(lengths.at(-1)! + curve[i].distanceTo(curve[i - 1]));
      const perimeter = lengths.at(-1)!, count = Math.max(6, Math.round(perimeter / stoneWidth));
      const widths = Array.from({ length: count }, (_, i) => .75 + noise(i + row * 41, seed + 1) * .52), sum = widths.reduce((s, x) => s + x, 0);
      let along = perimeter * ((row % 2) * .43 + noise(row, seed + 2) * .23) / count;
      for (let j = 0; j < count; j++) {
        const width = perimeter * widths[j] / sum, distance = (along + width * .5) % perimeter; along += width;
        let segment = lengths.findIndex((l, i) => i < samples && distance <= lengths[i + 1]); if (segment < 0) segment = samples - 1;
        const t = (distance - lengths[segment]) / (lengths[segment + 1] - lengths[segment]);
        const angle = (segment + t) * Math.PI * 2 / samples;
        const centre = surfacePoint(level, angle, exponent);
        const tangent = surfacePoint(level, angle + .01, exponent).sub(surfacePoint(level, angle - .01, exponent));
        const vertical = surfacePoint(mixLevel(levels, Math.min(max, y + .005)), angle, exponent).sub(surfacePoint(mixLevel(levels, Math.max(min, y - .005)), angle, exponent));
        const normal = vertical.clone().cross(tangent).normalize();
        const s = seed * 1000 + row * 79 + j;
        pebble(centre.addScaledVector(normal, .0008), normal, vertical, Math.max(.009, width - .0017), rowHeight * .98, .014 + noise(s, 2) * .008, s);
      }
    }
  };
  const column = (levels: Level[], exponent: number, rowPitch: number, stoneWidth: number, seed: number) => { solid(levels, exponent); courses(levels, exponent, rowPitch, stoneWidth, seed); };
  const firstY = p.first.y, secondY = p.second.y;
  const deckBottom = firstY - .029, deckTop = firstY + .034;
  // Four real thick lower piers and four separate sloping middle piers.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const seed = (sx + 2) * 13 + (sz + 2) * 7;
    column([{ y: 0, x: sx * .263, z: sz * .263, rx: .071, rz: .071 }, { y: .080, x: sx * .243, z: sz * .243, rx: .068, rz: .068 }, { y: deckBottom + .008, x: sx * .200, z: sz * .200, rx: .061, rz: .061 }], .72, .036, .053, seed);
    column([{ y: deckTop - .005, x: sx * .201, z: sz * .201, rx: .061, rz: .061 }, { y: secondY - .015, x: sx * .092, z: sz * .092, rx: .046, rz: .046 }, { y: secondY + .011, x: sx * .086, z: sz * .086, rx: .045, rz: .045 }], .86, .033, .050, seed + 20);
  }
  // Low load-bearing arches with a closed rounded rectangular cross-section.
  // Stones follow the arch course, including its inner reveal, rather than
  // being randomly stuck onto the front of a paper-thin facade.
  for (let side = 0; side < 4; side++) {
    const point = (theta: number) => facePoint(.188 * Math.cos(theta), .076 + .142 * Math.sin(theta), side, .222 - .020 * Math.sin(theta));
    const cross = (theta: number, phi: number) => {
      const centre = point(theta), tangent = point(theta + .001).sub(point(theta - .001)).normalize();
      const face = facePoint(0, 0, side, 1), radial = tangent.clone().cross(face).normalize();
      const c = Math.cos(phi), s = Math.sin(phi);
      return centre.addScaledVector(radial, Math.sign(c) * Math.pow(Math.abs(c), .72) * .044).addScaledVector(face, Math.sign(s) * Math.pow(Math.abs(s), .72) * .047);
    };
    const points: THREE.Vector3[] = [], indices: number[] = [], steps = 20, rings = 12;
    for (let i = 0; i <= steps; i++) for (let j = 0; j < rings; j++) points.push(cross(i / steps * Math.PI, j / rings * Math.PI * 2));
    for (let i = 0; i < steps; i++) for (let j = 0; j < rings; j++) { const a = i * rings + j, z = i * rings + (j + 1) % rings; indices.push(a, a + rings, z, z, a + rings, z + rings); }
    for (const end of [0, steps]) { const at = points.length; points.push(point(end / steps * Math.PI)); for (let j = 0; j < rings; j++) { const a = end * rings + j, z = end * rings + (j + 1) % rings; indices.push(...(end ? [at, z, a] : [at, a, z])); } }
    push(core, points, indices, mortar);
    const segments = 13, belt = 6;
    for (let i = 0; i < segments; i++) for (let j = 0; j < belt; j++) {
      const theta = (i + .50) / segments * Math.PI, phi = (j + (i % 2) * .35) / belt * Math.PI * 2;
      const centre = cross(theta, phi), normal = centre.clone().sub(point(theta)).normalize();
      const up = point(theta + .01).sub(point(theta - .01)).normalize();
      pebble(centre.addScaledVector(normal, .0005), normal, up, .050 + noise(i + j, side + 4) * .010, .042, .016, 40000 + side * 1000 + i * 10 + j);
    }
  }
  // Thick square first platform: three shallow stone courses around its edge.
  column([{ y: deckBottom, x: 0, z: 0, rx: p.first.width / 2, rz: p.first.width / 2 }, { y: deckTop, x: 0, z: 0, rx: p.first.width / 2, rz: p.first.width / 2 }], .38, .032, .063, 91);
  // A thin upper collar, followed by the characteristic broad, round shaft.
  column([{ y: secondY - .015, x: 0, z: 0, rx: .140, rz: .140 }, { y: secondY + .010, x: 0, z: 0, rx: .135, rz: .135 }], .80, .03, .050, 103);
  column([{ y: secondY + .005, x: 0, z: 0, rx: .119, rz: .119 }, { y: .711, x: 0, z: 0, rx: .099, rz: .099 }, { y: .884, x: 0, z: 0, rx: .071, rz: .071 }, { y: .916, x: 0, z: 0, rx: .071, rz: .071 }], 1, .028, .047, 117);
  // Broad flattened stone cap with a modest central peak, never an iron mast.
  column([{ y: .909, x: 0, z: 0, rx: .070, rz: .070 }, { y: .926, x: 0, z: 0, rx: .117, rz: .117 }, { y: .951, x: 0, z: 0, rx: .112, rz: .112 }, { y: .978, x: 0, z: 0, rx: .054, rz: .054 }, { y: .995, x: 0, z: 0, rx: .012, rz: .012 }], 1, .028, .046, 131);
  // Flat platform tops receive a sparse shallow cobble course, but not a
  // uniformly gravel-covered ground plane. There is no venue/surrounding base.
  for (const [y, half, pitch] of [[deckTop + .001, p.first.width / 2 - .008, .055], [.952, .083, .046]]) {
    const n = Math.floor(half * 2 / pitch);
    for (let ix = 0; ix < n; ix++) for (let iz = 0; iz < n; iz++) {
      const x = -half + (ix + .5) * (half * 2 / n), z = -half + (iz + .5) * (half * 2 / n);
      if (y < .5 && Math.abs(Math.abs(x) - .201) < .067 && Math.abs(Math.abs(z) - .201) < .067) continue;
      if (y > .5 && x * x + z * z > half * half) continue;
      pebble(v(x, y, z), v(0, 1, 0), v(0, 0, 1), pitch * .96, pitch * .84, .010, 70000 + ix * 37 + iz);
    }
  }
  const commit = (data: MeshData, paint: Paint) => {
    const before = b.buckets.get(paint)?.colors.length ?? 0;
    b.surface(data.points, data.indices, paint);
    const bucket = b.buckets.get(paint)!;
    for (let i = 0; i < data.colors.length; i++) bucket.colors[before + i] = data.colors[i];
  };
  commit(core, 'shadow'); commit(rocks, 'stone');
}

/** Natural stone overrides apply only to natural-colour display styles. */
function applyGasquetStoneMaterials(materials: Record<Paint, THREE.MeshStandardMaterial>, style: TowerRenderStyle): void {
  for (const paint of ['stone', 'shadow'] as Paint[]) {
    const material = materials[paint];
    if (style === 'metal' || style === 'porcelain' || style === 'blueprint') {
      material.vertexColors = false;
      if (paint === 'stone' && style !== 'blueprint') {
        material.color.copy(materials.structure.color);
        material.metalness = materials.structure.metalness;
        material.roughness = materials.structure.roughness;
        material.envMapIntensity = materials.structure.envMapIntensity;
      }
      continue;
    }
    material.metalness = 0; material.roughness = paint === 'stone' ? .93 : .99;
    material.envMapIntensity = .28; material.color.set('#ffffff');
    if (material instanceof THREE.MeshPhysicalMaterial) { material.clearcoat = 0; material.clearcoatRoughness = 1; material.specularIntensity = .18; }
    if (style === 'illuminated') material.emissiveIntensity = paint === 'stone' ? .035 : .008;
  }
}

function buildMasonry(b: ModelBuilder, p: TowerProfile, detail: Detail): void {
  const lower = new THREE.Shape(), r = p.baseWidth / 2, top = p.first.width * .40;
  const spring = .050, span = r * .56, crown = p.first.y * (p.masonryArchRatio ?? .61);
  lower.moveTo(-r, .002); lower.lineTo(-top, p.first.y - .003); lower.lineTo(top, p.first.y - .003);
  lower.lineTo(r, .002); lower.lineTo(span, .002); lower.lineTo(span, spring);
  for (let i = 0; i <= 24; i += 1) {
    const t = Math.PI * i / 24;
    lower.lineTo(span * Math.cos(t), spring + (crown - spring) * Math.sin(t));
  }
  lower.lineTo(-span, .002); lower.closePath();
  for (let side = 0; side < 4; side += 1) b.facade(lower, side,
    y => lerp(r, top, y / p.first.y), 'stone');
  if (p.masonryTruncated) {
    squareRing(b,p.first.y,p.first.width,0,.023,'stone');
    const low=p.first.width*.77,high=p.topWidth??.25;
    b.taperedSquare(low,high,p.first.y+.016,p.upperEnd,'stone');
    for(let side=0;side<4;side++) {
      const y0=p.first.y+.045,y1=p.upperEnd-.025;
      b.beam(facePoint(-low*.29,y0,side,low*.497),facePoint(high*.29,y1,side,high*.501),.0012,'shadow');
      b.beam(facePoint(low*.29,y0,side,low*.497),facePoint(-high*.29,y1,side,high*.501),.0012,'shadow');
    }
    return;
  }
  const middle = new THREE.Shape(), bottom = p.first.width * .38, upper = p.second.width * .32;
  middle.moveTo(-bottom, p.first.y); middle.lineTo(-upper, p.second.y); middle.lineTo(upper, p.second.y);
  middle.lineTo(bottom, p.first.y); middle.lineTo(bottom * .54, p.first.y);
  middle.lineTo(upper * .51, p.second.y - .039); middle.lineTo(-upper * .51, p.second.y - .039);
  middle.lineTo(-bottom * .54, p.first.y); middle.closePath();
  if (p.masonrySolidMiddle) b.taperedSquare(p.first.width * .81, p.second.width * .83, p.first.y, p.second.y, 'stone');
  else for (let side = 0; side < 4; side += 1) b.facade(middle, side,
    y => lerp(bottom, upper, (y - p.first.y) / (p.second.y - p.first.y)), 'stone');
  for (const platform of [p.first, p.second]) {
    squareRing(b, platform.y, platform.width, platform.opening, .013, 'stone');
    if(!p.masonryPlainPlatforms) squareRails(b, platform.y + .0065, platform.width * .94, .019, detail === 'detail' ? 18 : 10, .0030, 'stone');
  }
  if(p.photoCrown){buildPhotoMarks(b,p);return;}
  if (p.masonryUpperOpen) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.beam(v(sx * p.second.width * .29, p.second.y + .007, sz * p.second.width * .29),
      v(sx * .014, .934, sz * .014), .026, 'stone', .024);
  } else b.taperedSquare(p.second.width * .48, .030, p.second.y + .007, .927, 'stone');
  b.box(.068, .016, .068, v(0, .939, 0), 'stone');
  if (p.topKind === 'urn') {
    b.cylinder(.010, .018, .947, .958, 'stone', 10);
    b.cylinder(.018, .025, .958, .972, 'stone', 10);
    b.cylinder(.025, .012, .972, .986, 'stone', 10);
    b.cylinder(.009, 0, .986, 1, 'stone', 10);
  } else b.taperedSquare(.029, 0, .947, 1, 'stone');
}

function buildHybridPedestal(b: ModelBuilder, p: TowerProfile, detail: Detail): void {
  // Yanam's photograph has a tall enclosed plinth below the lattice; it does not have four open Eiffel feet.
  b.box(.139, .286, .134, v(0, .143, 0), 'stone');
  for (const side of [0, 2]) {
    const rotation = new THREE.Quaternion().setFromAxisAngle(Y, side * Math.PI / 2);
    b.box(.030, .257, .0017, facePoint(0, .148, side, .0678), 'glass', rotation);
    b.box(.011, .257, .0019, facePoint(0, .148, side, .0692), 'shadow', rotation);
  }
  const polygon = chamferedSquare(.224, .18);
  b.polygonRing(polygon, 0, .288, .008, 'deck');
  for (let side = 0; side < 4; side += 1) {
    const rotation = new THREE.Quaternion().setFromAxisAngle(Y, side * Math.PI / 2);
    b.box(.202, .087, .0015, facePoint(0, .336, side, .109), 'glass', rotation);
    for (const x of [-.103, 0, .103]) b.beam(facePoint(x, .291, side, .111), facePoint(x, .383, side, .111), .0033, 'stone');
  }
  b.polygonRing(polygon, 0, .383, .007, 'deck');
  b.taperedSquare(.175, .129, .384, .451, 'deck');
  const levels = subdivided(.453, p.upperEnd, detail === 'detail' ? 18 : 10);
  const radius = (y: number) => lerp(.064, .010, (y - .453) / (p.upperEnd - .453));
  for (let i = 0; i < levels.length - 1; i += 1) {
    const y0 = levels[i], y1 = levels[i + 1], r0 = radius(y0), r1 = radius(y1);
    for (let side = 0; side < 4; side += 1) {
      b.beam(facePoint(-r0, y0, side, r0), facePoint(-r1, y1, side, r1), .0023);
      latticeFace(b, facePoint(-r0, y0, side, r0), facePoint(r0, y0, side, r0),
        facePoint(-r1, y1, side, r1), facePoint(r1, y1, side, r1), 1, .0012, false);
    }
  }
  squareRing(b, .552, .108, .051, .007, 'deck');
  for(const platform of p.extraPlatforms??[])buildPlatform(b,p,platform,detail);
  buildTop(b, p, detail);
  if(p.photoCrown)buildPhotoMarks(b,p);
}

function buildPerforatedPlayground(b: ModelBuilder, p: TowerProfile, detail: Detail): void {
  const ss = stations(p), ys = subdivided(.003, p.upperEnd, 38);
  const radius = (y: number) => interpolate(ss, y, 'c') + interpolate(ss, y, 'w') / 2;
  const panel = new THREE.Shape();
  panel.moveTo(-radius(ys[0]), ys[0]);
  for (const y of ys.slice(1)) panel.lineTo(-radius(y), y);
  for (const y of [...ys].reverse()) panel.lineTo(radius(y), y);
  const span = p.archSpan * .90, spring = .012, crown = p.first.y * .78;
  panel.lineTo(span, .003); panel.lineTo(span, spring);
  for (let i = 0; i <= 24; i += 1) {
    const t = Math.PI * i / 24;
    panel.lineTo(span * Math.cos(t), spring + (crown - spring) * Math.sin(t));
  }
  panel.lineTo(-span, .003); panel.closePath();
  const y0 = p.first.y + .025, y1 = p.second.y - .021, loOpening = p.first.opening * .43, hiOpening = p.second.opening * .40;
  const window = new THREE.Path(); window.moveTo(-loOpening, y0); window.lineTo(-hiOpening, y1);
  window.lineTo(hiOpening, y1); window.lineTo(loOpening, y0); window.closePath(); if (!p.omitSlide) panel.holes.push(window);
  const spacing = detail === 'detail' ? .021 : .030, holeR = detail === 'detail' ? .0030 : .0028;
  for (let y = .021; y < p.upperEnd - .013; y += spacing) {
    const r = radius(y);
    for (let x = -r + .010; x < r - .010; x += spacing) {
      if (y < crown + .006) {
        const opening = y < spring ? span : span * Math.sqrt(Math.max(0, 1 - ((y - spring) / (crown - spring)) ** 2));
        if (Math.abs(x) < opening + .007) continue;
      }
      if (y > y0 - .006 && y < y1 + .006) {
        const opening = lerp(loOpening, hiOpening, Math.max(0, Math.min(1, (y - y0) / (y1 - y0))));
        if (Math.abs(x) < opening + .007) continue;
      }
      const hole = new THREE.Path();
      if (p.omitSlide) {
        // Police's kit plates show square fixing holes; preserve them even in overview.
        hole.moveTo(x-holeR,y-holeR); hole.lineTo(x-holeR,y+holeR);
        hole.lineTo(x+holeR,y+holeR); hole.lineTo(x+holeR,y-holeR); hole.closePath();
      } else hole.absarc(x, y, holeR, 0, Math.PI * 2, true);
      panel.holes.push(hole);
    }
  }
  for (let side = 0; side < 4; side += 1) b.facade(panel, side, radius, 'structure');
  buildPlatform(b, p, p.first, detail); buildPlatform(b, p, p.second, detail);
  if (p.omitSlide) {
    const r=p.second.width*.58, lo=p.second.y-.022, hi=p.second.y+.050;
    const belt=new THREE.Shape();belt.moveTo(-r,lo);belt.lineTo(r,lo);belt.lineTo(r,hi);belt.lineTo(-r,hi);belt.closePath();
    for(let col=0;col<8;col+=1)for(let row=0;row<3;row+=1){
      const x=-r+(col+.5)*r/4,y=lo+(row+.5)*(hi-lo)/3,w=.0035;
      const h=new THREE.Path();h.moveTo(x-w,y-w);h.lineTo(x-w,y+w);h.lineTo(x+w,y+w);h.lineTo(x+w,y-w);h.closePath();belt.holes.push(h);
    }
    for(let side=0;side<4;side+=1)b.facade(belt,side,()=>r,'deck');
  }
  const topY = p.upperEnd, roomWidth = .040, r = roomWidth / 2;
  const hut = new THREE.Shape(); hut.moveTo(-r, topY); hut.lineTo(r, topY); hut.lineTo(r, .957); hut.lineTo(-r, .957); hut.closePath();
  const opening = new THREE.Path(); opening.moveTo(-.006, topY + .009); opening.lineTo(-.006, .948);
  opening.lineTo(.006, .948); opening.lineTo(.006, topY + .009); opening.closePath(); hut.holes.push(opening);
  for (let side = 0; side < 4; side += 1) b.facade(hut, side, () => r, 'structure');
  b.taperedSquare(.048, 0, .957, .980, 'deck'); b.beam(v(0, .977, 0), v(0, 1, 0), .00090, 'antenna');
  // The visible fixed slide is retained; its width and curvature are photo-estimated.
  if (p.omitSlide) return;
  const points: THREE.Vector3[] = [], indices: number[] = [];
  const at = (t: number, x: number) => v(x, p.first.y * (1 - t) ** 1.65 + .003, lerp(p.first.width * .48, .365, t));
  for (let i = 0; i <= 18; i += 1) { points.push(at(i / 18, -.050), at(i / 18, .050)); }
  for (let i = 0; i < 18; i += 1) {
    const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    for (const x of [-.050, .050]) b.beam(at(i / 18, x), at((i + 1) / 18, x), .0015, 'antenna');
  }
  b.surface(points, indices, 'antenna');
}

function buildRoofSection(b: ModelBuilder, p: TowerProfile, detail: Detail): void {
  // Epcot reference shows the roof-emerging portion. Do not invent a complete lower tower or pavilion.
  const high = detail === 'detail', floorY = p.second.y;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const levels = subdivided(.004, floorY, high ? 6 : 4);
    for (let i = 0; i < levels.length - 1; i += 1) {
      const r0 = lerp(.082, .049, levels[i] / floorY), r1 = lerp(.082, .049, levels[i + 1] / floorY);
      const lo = v(sx * r0, levels[i], sz * r0), hi = v(sx * r1, levels[i + 1], sz * r1);
      const w0 = .017, w1 = .011;
      const corners = (point: THREE.Vector3, width: number) => [point.clone().add(v(-width / 2, 0, -width / 2)),
        point.clone().add(v(width / 2, 0, -width / 2)), point.clone().add(v(width / 2, 0, width / 2)), point.clone().add(v(-width / 2, 0, width / 2))];
      const lower = corners(lo, w0), upper = corners(hi, w1);
      for (let side = 0; side < 4; side += 1) {
        b.beam(lower[side], upper[side], .0019);
        latticeFace(b, lower[side], lower[(side + 1) % 4], upper[side], upper[(side + 1) % 4], 1, .0008, false);
      }
    }
  }
  if (!p.first.hidden) buildPlatform(b, p, p.first, detail);
  buildPlatform(b, p, p.second, detail);
  const levels = subdivided(floorY, p.upperEnd, high ? 26 : 14);
  const radius = (y: number) => lerp(.049, p.upperCentre + p.upperSection / 2, ((y - floorY) / (p.upperEnd - floorY)) ** .83);
  for (let i = 0; i < levels.length - 1; i += 1) {
    const y0 = levels[i], y1 = levels[i + 1], r0 = radius(y0), r1 = radius(y1);
    for (let side = 0; side < 4; side += 1) {
      b.beam(facePoint(-r0, y0, side, r0), facePoint(-r1, y1, side, r1), .00175);
      latticeFace(b, facePoint(-r0, y0, side, r0), facePoint(r0, y0, side, r0),
        facePoint(-r1, y1, side, r1), facePoint(r1, y1, side, r1), high && r0 > .030 ? 2 : 1, .00080, high);
    }
  }
  buildTop(b, p, detail);
}

function buildVisibleTrussSection(b: ModelBuilder, p: TowerProfile, detail: Detail): void {
  // A cropped/occluded photograph supports only this exposed mast; no borrowed Eiffel feet.
  const count = detail === 'detail' ? p.upperBays : Math.max(4, Math.ceil(p.upperBays * .65));
  const levels = subdivided(.003, p.upperEnd, count);
  const radius = (y: number) => lerp(p.sectionBaseRadius ?? .08, p.upperCentre + p.upperSection / 2,
    Math.pow(y / p.upperEnd, p.sectionCurve ?? .8));
  for (let i = 0; i < levels.length - 1; i += 1) {
    const y0 = levels[i], y1 = levels[i + 1], r0 = radius(y0), r1 = radius(y1);
    for (let side = 0; side < 4; side += 1) {
      b.beam(facePoint(-r0, y0, side, r0), facePoint(-r1, y1, side, r1), p.mainWidth);
      latticeFace(b, facePoint(-r0,y0,side,r0), facePoint(r0,y0,side,r0), facePoint(-r1,y1,side,r1), facePoint(r1,y1,side,r1), 1, p.latticeWidth, false);
    }
  }
  for (const platform of [p.first,p.second,...(p.extraPlatforms ?? [])]) buildPlatform(b,p,platform,detail);
  buildTop(b,p,detail);
  if(p.photoCrown)buildPhotoMarks(b,p);
}

function buildBrickEiffel(b:ModelBuilder,p:TowerProfile,detail:Detail):void{
  // Billund's dark LEGO tower is built from stepped perforated walls, not thin steel rods.
  const high=detail==='detail', ss=stations(p), dy=high?.009:.014, dx=high?.008:.012;
  const radius=(y:number)=>interpolate(ss,y,'c')+interpolate(ss,y,'w')/2;
  for(let y=.009;y<p.upperEnd;y+=dy){
    const r=radius(y),count=Math.max(3,Math.floor(2*r/dx)),step=2*r/count;
    for(let col=0;col<count;col+=1){
      const x=-r+(col+.5)*step;
      if(y<p.archCrown){const opening=p.archSpan*Math.sqrt(Math.max(0,1-(y/p.archCrown)**2));if(Math.abs(x)<opening)continue;}
      if(y>p.first.y+.037&&y<p.second.y-.027){const t=(y-p.first.y)/(p.second.y-p.first.y),opening=lerp(p.first.opening,p.second.opening,t)*.43;if(Math.abs(x)<opening)continue;}
      const boundary=Math.abs(x)>r-step*1.7;
      const band=Math.floor(y/dy)%5===0;
      const diagonal=Math.abs(((col+Math.floor(y/dy))%6)-2.5)<1.1||Math.abs(((col-Math.floor(y/dy)+600)%6)-2.5)<1.1;
      if(!boundary&&!band&&!diagonal)continue;
      for(let side=0;side<4;side+=1){const rotation=new THREE.Quaternion().setFromAxisAngle(Y,side*Math.PI/2);b.box(step*.985,dy*.97,high?.014:.016,facePoint(x,y,side,r),'structure',rotation);}
    }
  }
  for(const s of [p.first,p.second]){
    squareRing(b,s.y,s.width,s.opening,.012,'deck');squareRing(b,s.y+s.rail,s.width,s.opening,.006,'deck');
    const r=s.width/2,count=s===p.first?16:10;
    for(let side=0;side<4;side+=1)for(let i=0;i<=count;i+=1){const x=lerp(-r+.007,r-.007,i/count);
      b.box(.005,s.rail,.006,facePoint(x,s.y+s.rail/2,side,r),'deck');
      b.box(.008,.016,.018,facePoint(x,s.y-.014,side,r-.006),'shadow');
    }
  }
  const y=p.upperEnd,w=p.topWidth??.049;
  b.box(w,.043,w,v(0,y+.0215,0),'structure');
  b.box(w*1.2,.008,w*1.2,v(0,y+.042,0),'deck');
  for(let i=0;i<4;i+=1)b.box(w*(.93-i*.20),.009,w*(.93-i*.20),v(0,y+.050+i*.009,0),'structure');
}

function buildOutlineEiffel(b:ModelBuilder,p:TowerProfile,detail:Detail):void{
  // Gîte street-view evidence is only ~70 x 180 pixels. Keep the observed broad opaque silhouette,
  // round lower opening and rectangular middle void; do not invent masonry joints or iron lattice.
  const radii=[{y:0,r:p.baseWidth/2},{y:p.first.y,r:p.first.width*.45},
    {y:p.second.y,r:p.second.width*.44},{y:.71,r:.027},{y:p.upperEnd,r:.023}];
  const radius=(y:number)=>{const i=radii.findIndex((s,j)=>j<radii.length-1&&y>=s.y&&y<=radii[j+1].y);
    return i<0?radii.at(-1)!.r:lerp(radii[i].r,radii[i+1].r,(y-radii[i].y)/(radii[i+1].y-radii[i].y));};
  const opening=.044,spring=.060,crown=.137;
  const levels=[...new Set([...radii.map(s=>s.y),.272,.429,...subdivided(spring,crown,detail==='detail'?14:8)])].sort((a,z)=>a-z);
  for(let i=0;i<levels.length-1;i+=1){
    const y0=levels[i],y1=levels[i+1],mid=(y0+y1)/2,r0=radius(y0),r1=radius(y1);
    const gap=(y:number)=>mid<spring?opening:mid<crown?opening*Math.sqrt(Math.max(0,1-((y-spring)/(crown-spring))**2)):mid>.272&&mid<.429?.032:0;
    const g0=gap(y0),g1=gap(y1);
    // Each band is planar. Splitting at profile bends avoids false diagonal creases from long triangles.
    for(let side=0;side<4;side+=1)for(const sign of [-1,1])b.surface([
      facePoint(sign*r0,y0,side,r0),facePoint(sign*g0,y0,side,r0),
      facePoint(sign*g1,y1,side,r1),facePoint(sign*r1,y1,side,r1)],
      sign<0?[0,1,2,0,2,3]:[0,2,1,0,3,2],'structure');
  }
  // The narrow ledges are visible; no rail, access stair or ornamental bracing is added.
  squareRing(b,p.first.y,p.first.width,p.first.opening,.012,'deck');
  squareRing(b,p.second.y,p.second.width,p.second.opening,.008,'deck');
  b.box(.054,.018,.054,v(0,p.upperEnd+.009,0),'deck');
  b.taperedSquare(.054,.020,p.upperEnd+.018,.986,'structure');
  b.taperedSquare(.020,0,.986,1,'structure');
}

function buildSpringEiffel(b:ModelBuilder,p:TowerProfile,detail:Detail):void{
  // Berlin Berg 11's inspected source is a mesh of visible bed-spring loops, not an Eiffel X-truss.
  const high=detail==='detail',ss=stations(p),steps=high?10:6,tubeSides=3;
  const loop=(centre:THREE.Vector3,r:number,side:number)=>{
    const points:THREE.Vector3[]=[],indices:number[]=[],wire=.00070;
    for(let i=0;i<steps;i+=1){const a=i*Math.PI*2/steps;
      for(let j=0;j<tubeSides;j+=1){const t=j*Math.PI*2/tubeSides;
        points.push(facePoint((r+wire*Math.cos(t))*Math.cos(a),(r+wire*Math.cos(t))*Math.sin(a),side,wire*Math.sin(t)).add(centre));
      }
    }
    for(let i=0;i<steps;i+=1)for(let j=0;j<tubeSides;j+=1){const a=i*tubeSides+j,z=((i+1)%steps)*tubeSides+j,c=i*tubeSides+(j+1)%tubeSides,d=((i+1)%steps)*tubeSides+(j+1)%tubeSides;indices.push(a,z,c,c,z,d);}
    b.surface(points,indices,'structure');
  };
  squareRing(b,.006,.50,.475,.011,'shadow');
  const levels=[...new Set([.023,p.first.y,p.second.y,...subdivided(.023,p.upperEnd,high?39:22)])].sort((a,z)=>a-z);
  for(const sx of [-1,1])for(const sz of [-1,1]){
    for(let j=0;j<levels.length-1;j+=1){
      const lo=sectionCorners(ss,levels[j],sx,sz),hi=sectionCorners(ss,levels[j+1],sx,sz),midY=(levels[j]+levels[j+1])/2;
      for(let face=0;face<4;face+=1){
        b.beam(lo[face],hi[face],.0012,'shadow');
        const a=lo[face].clone().lerp(hi[face],.5),z=lo[(face+1)%4].clone().lerp(hi[(face+1)%4],.5);
        const width=a.distanceTo(z),cols=Math.max(1,Math.ceil(width/(high?.019:.032)));
        for(let col=0;col<cols;col+=1){const centre=a.clone().lerp(z,(col+.5)/cols);centre.y=midY;loop(centre,high?.0090:.0105,face%2);}
      }
    }
  }
  for(const floor of [p.first,p.second]){
    squareRing(b,floor.y,floor.width,floor.opening,.005,'shadow');
    const count=high?Math.ceil(floor.width/.018):Math.ceil(floor.width/.030),r=floor.width/2;
    for(let side=0;side<4;side+=1)for(let j=0;j<count;j+=1){
      const x=lerp(-r+.01,r-.01,(j+.5)/count);
      for(const dy of [-.009,.009])loop(facePoint(x,floor.y+dy,side,r),high?.010:.011,side);
    }
  }
  // A loose rounded loop crown is visible. No mast, antenna or Paris observation cabin is inferred.
  const crownLoops=high?22:12;
  for(let i=0;i<crownLoops;i+=1){const a=i*Math.PI*2/crownLoops;
    loop(v(.038*Math.cos(a),p.upperEnd+.018,.038*Math.sin(a)),.015,i%2);
    loop(v(.021*Math.cos(a),p.upperEnd+.043,.021*Math.sin(a)),.012,(i+1)%2);
  }
}

function buildConnections(b: ModelBuilder, p: TowerProfile, ss: Station[], detail: Detail): void {
  if (detail !== 'detail' || p.flatLattice || p.surfaceKind) return;
  // Select a few visible lower-chord joints, rather than spending thousands of triangles on every rivet.
  // Placement and head sizes are illustrative fabrication details, not a structural survey.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const ratio of [.34, .67, .95]) {
    const y = p.first.y * ratio, corners = sectionCorners(ss, y, sx, sz);
    const corner = corners[sx > 0 ? (sz > 0 ? 2 : 1) : (sz > 0 ? 3 : 0)];
    for (const side of [sx > 0 ? 1 : 3, sz > 0 ? 0 : 2]) {
      const normal = side === 0 ? v(0, 0, 1) : side === 1 ? v(1, 0, 0) : side === 2 ? v(0, 0, -1) : v(-1, 0, 0);
      const rotation = new THREE.Quaternion().setFromAxisAngle(Y, side * Math.PI / 2);
      const centre = corner.clone().addScaledVector(normal, p.mainWidth * .40);
      b.box(p.mainWidth * 1.7, p.mainWidth * 2.1, .00035, centre, 'shadow', rotation);
      for (const offset of [-.56, .56]) {
        const position = centre.clone().add(v(0, p.mainWidth * offset, 0)).addScaledVector(normal, .00027);
        b.bolt(position, normal, p.mainWidth * .12);
      }
    }
  }
}

function buildZeppelin(b: ModelBuilder, detail: Detail): void {
  // Santos Dumont's documented suspended airship is a separate silhouette-bearing ornament.
  const centre = v(-.083, .871, .019), rotation = new THREE.Quaternion().setFromAxisAngle(v(0, 0, 1), .23);
  b.ellipsoid(.052, .0128, .0128, centre, rotation, 'antenna', detail === 'detail' ? 24 : 12);
  b.box(.022, .0060, .009, centre.clone().add(v(0, -.019, 0)), 'shadow');
  b.beam(v(-.014, .853, .010), centre.clone().add(v(.031, -.005, 0)), .00080, 'antenna');
  b.beam(v(-.014, .897, .010), centre.clone().add(v(.009, .009, 0)), .00065, 'antenna');
  const tail = centre.clone().add(v(.041, .009, 0));
  b.surface([tail, tail.clone().add(v(.016, .016, 0)), tail.clone().add(v(.017, -.009, 0))], [0, 1, 2], 'antenna');
}

function buildSideLadder(b: ModelBuilder, p: TowerProfile, detail: Detail): void {
  if (p.externalStair) {
    // Rawa Pening's photo shows a broad public stair and paired handrails, not a rung ladder.
    const lo=v(p.baseWidth*.78,.009,.008), hi=v(p.first.width*.48,p.first.y,.008), count=detail==='detail'?20:12;
    for(let i=0;i<=count;i+=1){
      const point=lo.clone().lerp(hi,i/count);
      b.box(.027,.003,.073,point,'deck');
      if(i%2===0)for(const z of [-.038,.038])b.beam(point.clone().add(v(0,0,z)),point.clone().add(v(0,.034,z)),.0020,'structure');
    }
    for(const z of [-.038,.038]){
      b.beam(lo.clone().add(v(0,.034,z)),hi.clone().add(v(0,.034,z)),.0024,'structure');
      b.beam(lo.clone().add(v(0,0,z)),hi.clone().add(v(0,0,z)),.004,'structure');
    }
    return;
  }
  const top = v(p.first.width * .47, p.first.y + .008, .008), foot = v(p.baseWidth * .68, .003, .008);
  for (const z of [-.012, .012]) b.beam(foot.clone().add(v(0, 0, z)), top.clone().add(v(0, 0, z)), .0024, 'deck');
  for (const t of subdivided(0, 1, detail === 'detail' ? 14 : 9)) {
    const point = foot.clone().lerp(top, t);
    b.beam(point.clone().add(v(0, 0, -.012)), point.clone().add(v(0, 0, .012)), .0018, 'deck');
  }
}

function buildEvidenceAccess(b: ModelBuilder,p:TowerProfile,detail:Detail):void {
  if(p.centralBraceSpine){
    // Gouda's visible dark centre frame is represented only between its two photographed platforms.
    const levels=subdivided(p.first.y,p.second.y,detail==='detail'?8:5),r=.012;
    for(let j=0;j<levels.length-1;j+=1)for(let side=0;side<4;side+=1){
      b.beam(facePoint(-r,levels[j],side,r),facePoint(-r,levels[j+1],side,r),.0016,'shadow');
      latticeFace(b,facePoint(-r,levels[j],side,r),facePoint(r,levels[j],side,r),facePoint(-r,levels[j+1],side,r),facePoint(r,levels[j+1],side,r),1,.0011,false,false,'cross','shadow');
    }
  }
  if(p.steelButtresses)for(const sx of [-1,1])for(const sz of [-1,1]){
    b.beam(v(sx*p.baseWidth*.47,.007,sz*p.baseWidth*.47),v(sx*p.first.width*.46,p.first.y,sz*p.first.width*.46),.007,'shadow');
  }
  if(p.internalStairs){
    const ss=stations(p),lo=.07,hi=p.upperEnd-.025,flights=7;
    for(let f=0;f<flights;f+=1){
      const y0=lerp(lo,hi,f/flights),y1=lerp(lo,hi,(f+1)/flights),r=interpolate(ss,(y0+y1)/2,'c')*.72;
      const sign=f%2?1:-1,a=v(-r*sign,y0,.004),z=v(r*sign,y1,.004),count=detail==='detail'?9:5;
      for(let j=0;j<=count;j+=1)b.box(.024,.0025,.025,a.clone().lerp(z,j/count),'deck');
      for(const dz of [-.014,.014])b.beam(a.clone().add(v(0,0,dz)),z.clone().add(v(0,0,dz)),.0025,'structure');
    }
  }
}

function buildFlankingTurrets(b: ModelBuilder, p: TowerProfile, detail: Detail): void {
  // The Kanzaki photograph shows two fixed companion towers on the upper gallery, one site in total.
  const high = detail === 'detail', width = .036, r = width / 2;
  const lo = p.extraPlatforms?.[0]?.y ?? p.first.y, galleryY = p.second.y, headY = galleryY + .074;
  for (const sign of [-1, 1]) {
    const x = sign * p.second.width * .41;
    const point = (dx: number, y: number, dz: number) => v(x + dx, y, dz);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.beam(point(sx * r, lo, sz * r), point(sx * r, headY, sz * r), .0022);
    }
    const levels = subdivided(lo, galleryY, high ? 7 : 4);
    for (let j = 0; j < levels.length - 1; j += 1) for (let side = 0; side < 4; side += 1) {
      const a = side * Math.PI / 2, z = (side + 1) * Math.PI / 2;
      const corners = (angle: number, y: number) => point((Math.cos(angle) - Math.sin(angle)) * r,
        y, (Math.sin(angle) + Math.cos(angle)) * r);
      b.beam(corners(a, levels[j]), corners(z, levels[j + 1]), .00075);
      b.beam(corners(z, levels[j]), corners(a, levels[j + 1]), .00075);
    }
    for (const y of [galleryY, headY]) b.box(width * 1.2, .003, width * 1.2, point(0, y, 0), 'deck');
    for (let side = 0; side < 4; side += 1) {
      const normal = side * Math.PI / 2;
      for (let j = 0; j < (high ? 8 : 4); j += 1) {
        const count = high ? 8 : 4, a = Math.PI * j / count, z = Math.PI * (j + 1) / count;
        const arc = (t: number) => point(r * Math.cos(t) * Math.cos(normal),
          galleryY + .049 + .020 * Math.sin(t), r * Math.cos(t) * Math.sin(normal));
        b.beam(arc(a), arc(z), .0010);
      }
    }
    const domeBase = headY + .004, spokes = high ? 12 : 8;
    for (let i = 0; i < spokes; i += 1) {
      const a = i * Math.PI * 2 / spokes;
      b.beam(point(r * Math.cos(a), domeBase, r * Math.sin(a)), point(0, domeBase + .030, 0), .00085, 'deck');
    }
    b.ellipsoid(.006, .008, .006, point(0, domeBase + .040, 0), new THREE.Quaternion(), 'deck', high ? 12 : 8);
    b.beam(point(0, domeBase + .046, 0), point(0, domeBase + .060, 0), .0015, 'deck');
  }
}

function buildPerforatedLowerGallery(b: ModelBuilder, p: TowerProfile, detail: Detail): void {
  const r = p.first.width / 2, lo = p.first.y - .058, hi = p.first.y + .010;
  const panel = new THREE.Shape(); panel.moveTo(-r, lo); panel.lineTo(r, lo);
  panel.lineTo(r, hi); panel.lineTo(-r, hi); panel.closePath();
  const columns = detail === 'detail' ? 14 : 10;
  for (let row = 0; row < 2; row += 1) for (let column = 0; column < columns; column += 1) {
    const x = -r + p.first.width * (column + .5) / columns, y = lo + (hi - lo) * (row + .5) / 2;
    const halfW = p.first.width / columns * .24, halfH = (hi - lo) * .145;
    const hole = new THREE.Path(); hole.moveTo(x - halfW, y - halfH); hole.lineTo(x - halfW, y + halfH);
    hole.lineTo(x + halfW, y + halfH); hole.lineTo(x + halfW, y - halfH); hole.closePath(); panel.holes.push(hole);
  }
  for (let side = 0; side < 4; side += 1) b.facade(panel, side, () => r, 'deck');
}

/** A historical hybrid ride: Hopi Hari's Eiffel base ends beneath a long, largely solid drop-tower mast.
 * The static carriage is a coarse 2004 appearance cue, not a reconstruction of the ride mechanism.
 */
function buildDropTowerEiffel(b: ModelBuilder, detail: Detail): void {
  const high=detail==='detail';
  const ss:Station[]=[{y:0,c:.142,w:.031,linear:true},{y:.09,c:.109,w:.028},
    {y:.21,c:.072,w:.022},{y:.345,c:.052,w:.018}];
  const levels=[0,.045,.09,.15,.21,.277,.345];
  for(const sx of [-1,1])for(const sz of [-1,1]){
    for(let i=0;i<levels.length-1;i+=1){
      const lo=sectionCorners(ss,levels[i],sx,sz),hi=sectionCorners(ss,levels[i+1],sx,sz);
      for(let side=0;side<4;side+=1){
        b.beam(lo[side],hi[side],.0025,'structure',.0021);
        latticeFace(b,lo[side],lo[(side+1)%4],hi[side],hi[(side+1)%4],1,.00115,high,false,'cross');
      }
    }
  }
  for(const [y,width,band]of [[.09,.261,.018],[.21,.199,.014],[.345,.146,.012]]){
    squareRing(b,y,width,width-.018,.003,'deck');
    for(let side=0;side<4;side+=1){
      const r=width/2,steps=high?18:10;
      for(let i=0;i<steps;i+=1){
        const x0=lerp(-r,r,i/steps),x1=lerp(-r,r,(i+1)/steps);
        b.beam(facePoint(x0,y-band,side,r),facePoint(x1,y,side,r),.00105);
        b.beam(facePoint(x1,y-band,side,r),facePoint(x0,y,side,r),.00105);
      }
      b.beam(facePoint(-r,y-band,side,r),facePoint(r,y-band,side,r),.0014,'deck');
    }
  }
  // Broad flat cornice is the top of the Eiffel frame. No upper Eiffel shaft is added above it.
  squareRing(b,.350,.151,.030,.009,'deck');
  for(let side=0;side<4;side+=1){
    const rotation=new THREE.Quaternion().setFromAxisAngle(Y,side*Math.PI/2);
    b.box(.151,.011,.002,facePoint(0,.344,side,.0755),'shadow',rotation);
  }
  b.taperedSquare(.021,.021,0,.925,'shadow');
  for(const side of [0,1,2,3]){
    for(const x of [-.0065,.0065])b.beam(facePoint(x,.026,side,.012),facePoint(x,.932,side,.012),.0013,'deck');
    if(high||side===1)for(let i=0;i<36;i+=1){
      const y=.030+i*.025;
      b.beam(facePoint(-.0065,y,side,.012),facePoint(.0065,y,side,.012),.0008,'deck');
    }
  }
  b.cylinder(.029,.029,.927,.990,'deck',high?36:20);
  b.cylinder(.0296,.0296,.927,.931,'shadow',high?36:20);
  const rails=high?36:20;
  for(let i=0;i<rails;i+=1){
    const a=i*Math.PI*2/rails,z=(i+1)*Math.PI*2/rails;
    b.beam(v(.027*Math.cos(a),1,.027*Math.sin(a)),v(.027*Math.cos(z),1,.027*Math.sin(z)),.0006,'shadow');
    if(i%2===0)b.beam(v(.027*Math.cos(a),.990,.027*Math.sin(a)),v(.027*Math.cos(a),1,.027*Math.sin(a)),.0006,'shadow');
    if(high)b.beam(v(.0292*Math.cos(a),.932,.0292*Math.sin(a)),v(.0292*Math.cos(a),.987,.0292*Math.sin(a)),.00038,'shadow');
  }
  // Fixed simplified seat banks retain the red silhouette in the photo; unseen engineering is omitted.
  for(const side of [0,1,3]){
    const rotation=new THREE.Quaternion().setFromAxisAngle(Y,side*Math.PI/2);
    b.box(.027,.005,.012,facePoint(0,.893,side,.018),'shadow',rotation);
    for(const x of [-.008,0,.008]){
      b.box(.006,.013,.005,facePoint(x,.904,side,.022),'enamel',rotation);
      b.box(.006,.003,.010,facePoint(x,.896,side,.025),'enamel',rotation);
      b.beam(facePoint(x-.002,.900,side,.028),facePoint(x-.002,.913,side,.025),.0007,'deck');
      b.beam(facePoint(x+.002,.900,side,.028),facePoint(x+.002,.913,side,.025),.0007,'deck');
    }
  }
}

function buildRemainingDetails(b:ModelBuilder,p:TowerProfile,ss:Station[],detail:Detail):void{
  if(p.key==='in-pune-seven-wonders-dream-park'){
    const high=detail==='detail',sides=high?14:8;
    // Flat round junction plates are drawn as thin discs, avoiding oversized spherical rivets.
    for(let side=0;side<4;side+=1)for(const y of[.105,.175,.235,.310,.375,.444,.545,.605,.665,.725,.785,.845]){
      const r=interpolate(ss,y,'c')+interpolate(ss,y,'w')/2;
      const xs=y<p.second.y?[-interpolate(ss,y,'c'),interpolate(ss,y,'c')]:[-r*.48,r*.48];
      for(const x of xs){
        const radius=y<.49?.0050:.0037,points=[facePoint(x,y,side,r+.0025)],indices:number[]=[];
        for(let i=0;i<=sides;i+=1){const a=Math.PI*2*i/sides;points.push(facePoint(x+radius*Math.cos(a),y+radius*Math.sin(a),side,r+.0025));}
        for(let i=1;i<=sides;i+=1)indices.push(0,i,i+1);
        b.surface(points,indices,'deck');
      }
    }
    // Repeated fine leaf loops sit inside the lower arch band; they are not a solid ornamental wall.
    const arc=(t:number,drop:number,side:number)=>{
      const y=p.archStart+(p.archCrown-p.archStart)*Math.sin(t)-drop;
      return facePoint(p.archSpan*.97*Math.cos(t),y,side,interpolate(ss,y,'c')+interpolate(ss,y,'w')/2+.002);
    };
    for(let side=0;side<4;side+=1){
      const steps=high?48:24;
      for(let i=0;i<steps;i+=1)b.beam(arc(Math.PI*i/steps,.014,side),arc(Math.PI*(i+1)/steps,.014,side),.00085,'deck');
      const cells=high?18:10,segments=high?8:4;
      for(let i=0;i<cells;i+=1){
        const a=Math.PI*(i+.10)/cells,z=Math.PI*(i+.90)/cells;
        for(const sign of[-1,1])for(let j=0;j<segments;j+=1){
          const point=(s:number)=>arc(lerp(a,z,s),.008+sign*.0045*Math.sin(s*Math.PI),side);
          b.beam(point(j/segments),point((j+1)/segments),.00043,'deck');
        }
      }
    }
    return;
  }
  if(p.key==='in-parle-point-parle-point-surat'){
    // Round plates at visible brace junctions are the characteristic decoration in the 2005 reference.
    const heights=[.119,.185,.290,.349,.408,.628,.758,.861];
    for(let side=0;side<4;side+=1)for(const y of heights){
      const depth=interpolate(ss,y,'c')+interpolate(ss,y,'w')/2+.0022;
      const xs=y<p.second.y?[-interpolate(ss,y,'c'),interpolate(ss,y,'c')]:[0];
      const radius=y<.45?.0056:.0034,rotation=new THREE.Quaternion().setFromAxisAngle(Y,side*Math.PI/2);
      for(const x of xs)b.ellipsoid(radius,radius,.00065,facePoint(x,y,side,depth),rotation,'deck',detail==='detail'?12:8);
    }
    return;
  }
  if(p.key==='sk-svrcinovec-paris-hotel'){
    // Two small dark panels interrupt the thin tower body in the 2010 front elevation.
    const y=.650,depth=interpolate(ss,y,'c')+interpolate(ss,y,'w')/2+.0015;
    for(const x of [-.011,.011])b.box(.018,.018,.0013,v(x,y,depth),'shadow');
  }
  if(p.key!=='ru-volzhskiy-frantsuzskiy-bul-var')return;
  // Volzhsky has a third slim arch chord and short ties, with no solid Paris spandrel or restaurant deck.
  const steps=detail==='detail'?40:24;
  for(let side=0;side<4;side+=1){
    const point=(t:number,offset:number)=>{
      const y=p.archStart+(p.archCrown-p.archStart)*Math.sin(t)+offset;
      return facePoint(p.archSpan*Math.cos(t),y,side,interpolate(ss,y,'c')+interpolate(ss,y,'w')/2+.002);
    };
    for(let i=0;i<steps;i+=1){
      const a=Math.PI*i/steps,z=Math.PI*(i+1)/steps;
      b.beam(point(a,.012),point(z,.012),.0018,'structure',.0028);
      if(i%2===0)b.beam(point(a,0),point(a,.012),.00125,'structure');
    }
  }
}

/** Cita is an opaque blue decorative shell with painted-looking dark lines, not an open iron tower.
 * The cropped ground is removed by visibleAboveY; symmetric hidden faces remain a stated approximation.
 */
function buildSolidPanelEiffel(b: ModelBuilder, detail: Detail): void {
  const levels = [{ y: 0, r: .224 }, { y: .285, r: .133 }, { y: .49, r: .077 },
    { y: .72, r: .038 }, { y: .9, r: .022 }];
  const radius = (y: number) => {
    if (y <= levels[0].y) return levels[0].r;
    if (y >= levels[levels.length-1].y) return levels[levels.length-1].r;
    const i = Math.max(0, levels.findIndex((s, index) => index < levels.length - 1 && y <= levels[index + 1].y));
    const a = levels[i], z = levels[i + 1]; return lerp(a.r, z.r, (y - a.y) / (z.y - a.y));
  };
  const arch = (y: number) => y < .242 ? .103 * Math.sqrt(Math.max(0, 1 - ((y - .024) / .218) ** 2)) : 0;
  const lower = new THREE.Shape();
  lower.moveTo(-radius(0), 0); lower.lineTo(-radius(.285), .285);
  lower.lineTo(radius(.285), .285); lower.lineTo(radius(0), 0); lower.lineTo(.103, 0);
  lower.lineTo(.103, .024);
  for (let i = 0; i <= 40; i += 1) {
    const a = Math.PI * i / 40; lower.lineTo(.103 * Math.cos(a), .024 + .218 * Math.sin(a));
  }
  lower.lineTo(-.103, 0); lower.closePath();
  const paintedLine = (a: THREE.Vector2, z: THREE.Vector2, side: number, width = .0022) => {
    const steps = Math.max(2, Math.ceil(a.distanceTo(z) / .012));
    const offset = new THREE.Vector2(-(z.y-a.y), z.x-a.x).normalize().multiplyScalar(width/2);
    for (let i = 0; i < steps; i += 1) {
      const lo = a.clone().lerp(z, i / steps), hi = a.clone().lerp(z, (i + 1) / steps);
      if ([lo, hi].some(q => q.y < .242 && Math.abs(q.x) < arch(q.y) + width)) continue;
      if ([lo, hi].some(q => q.y > .295 && q.y < .444 && Math.abs(q.x) < .055 * Math.sqrt(Math.max(0,1-((q.y-.314)/.13)**2)) + width)) continue;
      const points = [lo.clone().add(offset), hi.clone().add(offset), hi.clone().sub(offset), lo.clone().sub(offset)]
        .map(q=>facePoint(q.x,q.y,side,radius(q.y)+.0014));
      b.surface(points,[0,1,2,0,2,3,0,2,1,0,3,2],'shadow');
    }
  };
  for (let side = 0; side < 4; side += 1) {
    b.facade(lower, side, radius, 'structure');
    for (let i = 1; i < levels.length - 1; i += 1) {
      const lo = levels[i], hi = levels[i + 1];
      const panel = new THREE.Shape(); panel.moveTo(-lo.r, lo.y); panel.lineTo(lo.r, lo.y);
      panel.lineTo(hi.r, hi.y); panel.lineTo(-hi.r, hi.y); panel.closePath();
      b.facade(panel, side, radius, 'structure');
    }
    const rows = [0, .065, .13, .19, .242, .275, .305, .36, .415, .475, .535, .595, .655, .715, .775, .835, .90];
    for (let row = 0; row < rows.length - 1; row += 1) {
      const y0 = rows[row], y1 = rows[row + 1], r0 = radius(y0), r1 = radius(y1);
      for (let column = 0; column < 2; column += 1) {
        const x0 = lerp(-r0, r0, column / 2), x1 = lerp(-r0, r0, (column + 1) / 2);
        const x2 = lerp(-r1, r1, column / 2), x3 = lerp(-r1, r1, (column + 1) / 2);
        paintedLine(new THREE.Vector2(x0, y0), new THREE.Vector2(x3, y1), side);
        paintedLine(new THREE.Vector2(x1, y0), new THREE.Vector2(x2, y1), side);
      }
      paintedLine(new THREE.Vector2(-r0, y0), new THREE.Vector2(r0, y0), side, .0018);
      for (const sign of [-1, 1]) paintedLine(new THREE.Vector2(sign * r0, y0), new THREE.Vector2(sign * r1, y1), side, .0032);
    }
    // Dark border follows the actual lower opening. The smaller upper arch is painted on the blue skin.
    for (const [base, rise, half, width] of [[.024, .218, .103, .0042], [.314, .13, .055, .0026]]) {
      const steps = detail === 'detail' ? 40 : 24;
      for (let i = 0; i < steps; i += 1) {
        const point = (t: number) => {
          const y = base + rise * Math.sin(t); return facePoint(half * Math.cos(t), y, side, radius(y) + .002);
        };
        b.beam(point(Math.PI * i / steps), point(Math.PI * (i + 1) / steps), width, 'shadow', .002);
      }
    }
  }
  for (const [y, width, thick] of [[.285, .292, .021], [.49, .178, .010]]) {
    squareRing(b, y, width, Math.max(.01, width - .036), thick, 'deck');
    squareRing(b, y + thick * .60, width * 1.035, width - .030, .003, 'shadow');
  }
  b.box(.051, .010, .051, v(0, .903, 0), 'deck');
  b.box(.039, .035, .039, v(0, .9255, 0), 'structure');
  for (const y of [.912, .940]) b.box(.046, .003, .046, v(0, y, 0), 'shadow');
  b.box(.058, .013, .058, v(0, .949, 0), 'deck');
  b.cylinder(.0009, .0008, .955, .996, 'antenna', 8);
  b.ellipsoid(.002, .002, .002, v(0, .998, 0), new THREE.Quaternion(), 'shadow', 8);
}

/** Small vector legends: simplified lettering without image textures or invented operational signage. */
function modelLegend(b: ModelBuilder, text: string, centreX: number, y: number, z: number,
  width: number, height: number, paint: Paint): void {
  const glyphs: Record<string, number[][]> = {
    A: [[0,0,2,6,4,0],[1,2,3,2]], E: [[4,6,0,6,0,0,4,0],[0,3,3,3]],
    I: [[0,6,4,6],[2,6,2,0],[0,0,4,0]], L: [[0,6,0,0,4,0]],
    M: [[0,0,0,6,2,3,4,6,4,0]], N: [[0,0,0,6,4,0,4,6]],
    O: [[1,0,0,1,0,5,1,6,3,6,4,5,4,1,3,0,1,0]],
    P: [[0,0,0,6,3,6,4,5,4,4,3,3,0,3]], R: [[0,0,0,6,3,6,4,5,4,4,3,3,0,3],[2,3,4,0]],
    T: [[0,6,4,6],[2,6,2,0]], W: [[0,6,1,0,2,3,3,0,4,6]],
    Y: [[0,6,2,3,4,6],[2,3,2,0]], K: [[0,0,0,6],[4,6,0,3,4,0]],
    '2': [[0,5,1,6,3,6,4,5,4,4,0,0,4,0]], '1': [[1,5,2,6,2,0],[0,0,4,0]],
  };
  const cell = width / (text.length * 6 - 2), thickness = Math.min(cell * .80, height * .13);
  for (let i = 0; i < text.length; i += 1) for (const stroke of glyphs[text[i]] ?? []) {
    for (let j = 0; j < stroke.length - 2; j += 2) {
      const point = (k: number) => v(centreX - width / 2 + (i * 6 + stroke[k]) * cell, y + stroke[k + 1] / 6 * height, z);
      b.beam(point(j), point(j + 2), thickness, paint, thickness * .65);
    }
  }
}

/** Decorations and crowns from three specific licensed references; no inherited additions on older models. */
function buildCompletionDetails(b: ModelBuilder, p: TowerProfile, ss: Station[], detail: Detail): void {
  if (p.key === 'at-st-polten-tower-on-a-small-road-beside-the-railway-line') {
    const depth = (y: number) => interpolate(ss, y, 'c') + interpolate(ss, y, 'w') / 2 + .002;
    for (const platform of [p.first, p.second]) {
      const y = platform.y, half = platform.width / 2, lo = y - platform.fascia;
      squareRing(b, y, platform.width * 1.07, platform.opening, .003, 'shadow');
      for (let side = 0; side < 4; side += 1) {
        // Folded pale skirt, wider at its lower edge; narrow vertical ribs retain its sheet-metal appearance.
        const bottom = half * 1.08, top = half * .95;
        b.surface([facePoint(-bottom, lo, side, bottom), facePoint(bottom, lo, side, bottom),
          facePoint(top, y, side, top), facePoint(-top, y, side, top)], [0,1,2,0,2,3], 'deck');
        const count = detail === 'detail' ? 18 : 10;
        for (let i = 0; i <= count; i += 1) b.beam(facePoint(lerp(-bottom, bottom, i/count), lo, side, bottom + .0007),
          facePoint(lerp(-top, top, i/count), y, side, top + .0007), .00085, 'shadow');
      }
    }
    const plaque = new THREE.Shape(); plaque.moveTo(-.027, .212); plaque.lineTo(.065, .212);
    plaque.lineTo(.046, .358); plaque.lineTo(-.019, .358); plaque.closePath();
    b.facade(plaque, 0, depth, 'clock');
    // The crest is an abstract blue/red mark; no claim to reproduce the city's heraldic artwork.
    b.ellipsoid(.024, .030, .001, v(.014, .278, depth(.278) + .003), new THREE.Quaternion(), 'accentBlue', 16);
    b.box(.013, .017, .001, v(.004, .278, depth(.278) + .004), 'enamel');
    modelLegend(b, 'WILLKOMMEN', .014, .331, depth(.331) + .003, .059, .007, 'shadow');
    for (const y of [.224, .232]) b.box(.069, .002, .001, v(.015, y, depth(y) + .003), 'enamel');
    // The photographed French tricolour hangs on the adjacent side of the lower lattice.
    for (let i = 0; i < 3; i += 1) {
      const x0 = -.028 + i * .018, x1 = x0 + .018, y0 = .258, y1 = .324;
      const points = [facePoint(x0,y0,1,depth(y0)+.002), facePoint(x1,y0,1,depth(y0)+.002),
        facePoint(x1,y1,1,depth(y1)+.002), facePoint(x0,y1,1,depth(y1)+.002)];
      b.surface(points,[0,1,2,0,2,3,0,2,1,0,3,2],(['accentBlue','clock','enamel'] as Paint[])[i]);
    }
    for (const y of [.870,.903]) squareRing(b,y,.059,.030,.006,'deck');
    for (const sx of [-1,1]) for (const sz of [-1,1]) b.beam(v(sx*.021,.873,sz*.021),v(sx*.021,.900,sz*.021),.004,'shadow');
    squareRails(b,.907,.052,.010,4,.0007);
    for (let side=0;side<4;side+=1) {
      b.beam(facePoint(-.004,.915,side,.004),facePoint(-.004,.975,side,.004),.0008);
      for (let i=0;i<7;i+=1) {
        const y=.915+i*.0085;
        b.beam(facePoint(-.004,y,side,.004),facePoint(.004,y+.0085,side,.004),.00055);
        b.beam(facePoint(-.004,y,side,.004),facePoint(.004,y,side,.004),.00055);
      }
    }
    b.cylinder(.0015,.0008,.974,1,'antenna',8);
    return;
  }
  const korat = p.key === 'th-nakhon-ratchasima-terminal-21-korat';
  const pattaya = p.key === 'th-pattaya-city-terminal-21-pattaya';
  if (!korat && !pattaya) return;
  const y = p.upperEnd, room = 1-y, width = korat ? .069 : .053;
  squareRing(b,y,width, width*.5,.006,'deck');
  for (let side=0;side<4;side+=1) {
    const r=width*.39;
    for (let i=0;i<4;i+=1) {
      const x0=lerp(-r,r,i/4),x1=lerp(-r,r,(i+1)/4);
      b.beam(facePoint(x0,y,side,r),facePoint(x0,y+room*.42,side,r),.0015);
      b.beam(facePoint(x0,y,side,r),facePoint(x1,y+room*.42,side,r),.0009);
      b.beam(facePoint(x1,y,side,r),facePoint(x0,y+room*.42,side,r),.0009);
    }
  }
  b.box(width*.91,room*.12,width*.91,v(0,y+room*.46,0),'deck');
  b.box(width*.66,room*.16,width*.66,v(0,y+room*.60,0),'shadow');
  b.box(width*.77,room*.09,width*.77,v(0,y+room*.705,0),'deck');
  b.box(width*.47,room*.10,width*.47,v(0,y+room*.80,0),'deck');
  b.cylinder(korat?.0032:.0008,korat?.0027:.0006,y+room*.84,1,'deck',8);
  if (!pattaya) return;
  // Broad opaque lower gallery panels and a projecting top lip are visible in the 2019 reference.
  const r=p.first.width*.487, lo=p.first.y+.002, hi=p.first.y+.037;
  for(let side=0;side<4;side+=1){
    const rotation=new THREE.Quaternion().setFromAxisAngle(Y,side*Math.PI/2);
    b.box(r*2,hi-lo,.0018,facePoint(0,(hi+lo)/2,side,r),'deck',rotation);
    for(let i=0;i<=20;i+=1)b.beam(facePoint(lerp(-r,r,i/20),lo,side,r+.0015),
      facePoint(lerp(-r,r,i/20),hi,side,r+.0015),.0009,'shadow');
  }
  // Lettering is fixed geometry; no photographed animation, fixture positions or light programme is asserted.
  modelLegend(b,'TERMINAL 21',0,.164,.213,.294,.041,'clock');
  modelLegend(b,'PATTAYA',.075,.127,.213,.152,.027,'clock');
}

/** Tyndall's 2015 CC0 reference: one light four-chord shaft, star-cut arch plates and a long bare mast.
 * These unit-height proportions describe appearance, not surveyed dimensions or a present-day condition.
 */
function buildFlagpoleEiffel(b: ModelBuilder, detail: Detail): void {
  const high = detail === 'detail';
  const silhouette: Station[] = [
    { y: .003, c: .086, w: 0 }, { y: .126, c: .058, w: 0 },
    { y: .214, c: .040, w: 0 }, { y: .310, c: .027, w: 0 },
    { y: .402, c: .017, w: 0 }, { y: .49, c: .009, w: 0 },
    { y: .55, c: .0056, w: 0 }, { y: .66, c: .0056, w: 0 },
  ];
  const radius = (y: number) => interpolate(silhouette, y, 'c');
  const corners = (y: number) => [v(-radius(y), y, radius(y)), v(radius(y), y, radius(y)),
    v(radius(y), y, -radius(y)), v(-radius(y), y, -radius(y))];
  const levels = [.126, .214, .310, .402, .455, .49, .52, .55, .578, .606, .634, .66];
  // Curved flat legs continue into four thin upper chords; no thick Paris pylons or viewing decks.
  const chordLevels = [...subdivided(.003, .55, 44), .66];
  for (let corner = 0; corner < 4; corner += 1) {
    const foot = corners(.003)[corner];
    b.box(.014, .003, .014, v(foot.x, .0015, foot.z), 'stone');
    for (let i = 0; i < chordLevels.length - 1; i += 1) {
      const lo = chordLevels[i], hi = chordLevels[i + 1];
      const width = lo < .126 ? lerp(.0075, .0041, lo / .126) : lerp(.0034, .00135, (lo - .126) / .534);
      b.strip(corners(lo)[corner], corners(hi)[corner], width, v(0, 0, 1));
      // A narrow perpendicular flange gives the corner angle its light, folded-metal section.
      b.strip(corners(lo)[corner], corners(hi)[corner], width * .65, v(1, 0, 0));
    }
  }
  for (let i = 0; i < levels.length - 1; i += 1) {
    const lo = corners(levels[i]), hi = corners(levels[i + 1]);
    const brace = levels[i] < .31 ? .00135 : .00090;
    for (let side = 0; side < 4; side += 1) {
      const next = (side + 1) % 4;
      b.beam(lo[side], hi[next], brace);
      b.beam(lo[next], hi[side], brace);
      b.beam(hi[side], hi[next], brace * .9);
    }
  }
  for (const y of [.126, .214, .310, .402, .66]) {
    const ring = corners(y);
    for (let side = 0; side < 4; side += 1) {
      const next = (side + 1) % 4;
      b.beam(ring[side], ring[next], .0018);
      if (y < .45) b.beam(ring[side].clone().add(v(0, -.004, 0)), ring[next].clone().add(v(0, -.004, 0)), .0013);
    }
  }
  const panel = new THREE.Shape();
  panel.moveTo(-.088, .003); panel.lineTo(-.059, .126);
  panel.lineTo(.059, .126); panel.lineTo(.088, .003); panel.lineTo(.073, .003);
  const archSteps = high ? 40 : 24;
  for (let i = 0; i <= archSteps; i += 1) {
    const t = Math.PI * i / archSteps;
    panel.lineTo(.073 * Math.cos(t), .003 + .111 * Math.sin(t));
  }
  panel.closePath();
  const star = (x: number, y: number, size: number) => {
    const hole = new THREE.Path();
    for (let i = 0; i < 10; i += 1) {
      const a = Math.PI / 2 - i * Math.PI / 5, r = size * (i % 2 ? .43 : 1);
      if (i === 0) hole.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
      else hole.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
    }
    hole.closePath(); panel.holes.push(hole);
  };
  star(0, .120, .0025);
  for (const sign of [-1, 1]) {
    star(sign * .023, .117, .0034); star(sign * .044, .110, .0058);
    star(sign * .054, .094, .0036); star(sign * .060, .080, .0025);
  }
  // The two visible faces establish the motif; repeating it on hidden faces is a restrained symmetry assumption.
  for (let side = 0; side < 4; side += 1) b.facade(panel, side, y => radius(y) + .0005, 'structure');
  b.cylinder(.0017, .00125, .657, .995, 'structure', high ? 12 : 8);
  b.ellipsoid(.0017, .0025, .0017, v(0, .9975, 0), new THREE.Quaternion(), 'antenna', 8);
  if (high) {
    // A slim slack halyard and static, gently draped flag represent this photograph only.
    const rope = [v(.002, .987, 0), v(-.008, .63, .002), v(-.019, .30, .002)];
    b.beam(rope[0], rope[1], .00024, 'antenna'); b.beam(rope[1], rope[2], .00024, 'antenna');
  }
  const flagPoint = (u: number, w: number) => v(.0017 + .035 * u, .982 - .014 * u - .043 * w,
    .004 * Math.sin(u * Math.PI * 2 - w * 1.2) * u);
  const patch = (u0: number, u1: number, w0: number, w1: number, paint: Paint) => {
    const points = [flagPoint(u0, w0), flagPoint(u1, w0), flagPoint(u1, w1), flagPoint(u0, w1)];
    // Both sides are visible even with the opaque structural paint buckets.
    b.surface(points, [0, 2, 1, 0, 3, 2, 0, 1, 2, 0, 2, 3], paint);
  };
  const flagColumns = high ? 8 : 4;
  for (let stripe = 0; stripe < 13; stripe += 1) for (let column = 0; column < flagColumns; column += 1) {
    const u0 = column / flagColumns, u1 = (column + 1) / flagColumns;
    if (stripe < 7 && u0 < .5) patch(u0, Math.min(u1, .5), stripe / 13, (stripe + 1) / 13, 'clock');
    if (stripe >= 7 || u1 > .5) patch(stripe < 7 ? Math.max(u0, .5) : u0, u1, stripe / 13, (stripe + 1) / 13,
      stripe % 2 ? 'structure' : 'enamel');
  }
  // Fine canton dots are a display simplification, not a texture or a substitute for the reference photo.
  if (high) for (let row = 0; row < 9; row += 1) {
    const count = row % 2 ? 5 : 6;
    for (let column = 0; column < count; column += 1) {
      const u = (column + (row % 2 ? 1 : .5)) / 12, w = (row + .5) * 7 / 117;
      const pos = flagPoint(u, w); pos.z += .00016;
      b.ellipsoid(.00021, .00024, .00021, pos, new THREE.Quaternion(), 'structure', 6);
    }
  }
}

/**
 * Evidence-based simplified tower. +Y is up; geometry ground=0, highest needle=1.
 * Every returned Group owns all its GPU geometry/materials. Dispose deduplicated
 * mesh.geometry and mesh.material on removal; there are no shared caches/textures.
 */
type CPhotoVariant = 'olympic-eiffel' | 'masonry-inlay' | 'lean-rail-eiffel'
  | 'carved-wood-relief' | 'plywood-eiffel' | 'stilt-eiffel' | 'memorial-cross' | 'limboto-podium';
interface CPhotoProfile extends TowerProfile {
  photoVariant?: CPhotoVariant;
  variantRailLean?: number;
  variantStiltHeight?: number;
  variantRingWidth?: number;
  variantReliefDepth?: number;
}

function cVariantBody(b: ModelBuilder, p: CPhotoProfile, detail: Detail, omitRails=false): void {
  const shape=stations(p);
  buildPylons(b,p,shape,detail); buildArches(b,p,shape,detail);
  for(const platform of [p.first,p.second,...(p.extraPlatforms??[])])
    buildPlatform(b,p,omitRails?{...platform,rail:0}:platform,detail);
  buildTop(b,p,detail);
  if(p.photoCrown||p.photoSymbol||p.photoRoundSign||p.photoLettering||p.photoCube)buildPhotoMarks(b,p);
}

function cVariantExtrude(b: ModelBuilder, shape: THREE.Shape, depth:number, paint:Paint):void {
  const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:12,steps:1});
  const a=g.attributes.position,points:THREE.Vector3[]=[];
  for(let i=0;i<a.count;i++)points.push(v(a.getX(i),a.getY(i),a.getZ(i)-depth/2));
  const indices=g.index?Array.from(g.index.array):Array.from({length:a.count},(_,i)=>i);
  b.surface(points,indices,paint);g.dispose();
}

function cVariantRing(b:ModelBuilder,cx:number,cy:number,z:number,r:number,color:string,p:CPhotoProfile):void {
  // White stone material is selected explicitly by the Olympic recipe. Tint only
  // newly emitted ring vertices, never the tower or a previously existing model.
  const before=b.buckets.get('stone')?.colors.length??0;
  const count=36;
  for(let i=0;i<count;i++){
    const a=i*Math.PI*2/count,c=(i+1)*Math.PI*2/count;
    b.beam(v(cx+r*Math.cos(a),cy+r*Math.sin(a),z),v(cx+r*Math.cos(c),cy+r*Math.sin(c),z),.0032,'stone');
  }
  const bucket=b.buckets.get('stone')!,tint=new THREE.Color(color),base=new THREE.Color(p.foundationPaint??'#ffffff');
  for(let i=before;i<bucket.colors.length;i+=3){
    bucket.colors[i]*=tint.r/Math.max(base.r,.01);
    bucket.colors[i+1]*=tint.g/Math.max(base.g,.01);
    bucket.colors[i+2]*=tint.b/Math.max(base.b,.01);
  }
}

function cVariantOlympic(b:ModelBuilder,p:CPhotoProfile,detail:Detail):void {
  cVariantBody(b,p,detail);
  const width=p.variantRingWidth??p.first.width*.84,r=width/6.6;
  const y=lerp(p.first.y,p.second.y,.52),d=interpolate(stations(p),y,'c')+p.firstSection/2+.020;
  const centers:[number,number,string][]=[[-2.2*r,y+.42*r,'#318abb'],[0,y+.42*r,'#343a3c'],[2.2*r,y+.42*r,'#c95575'],[-1.1*r,y-.58*r,'#e2ba38'],[1.1*r,y-.58*r,'#4e9f70']];
  for(const[x,yy,color]of centers)cVariantRing(b,x,yy,d,r,color,p);
}

function cVariantLeanRails(b:ModelBuilder,p:CPhotoProfile,detail:Detail):void {
  cVariantBody(b,p,detail,true);
  const lean=p.variantRailLean??.014;
  for(const s of[p.first,p.second]){
    const lo=s.width/2,hi=lo+lean,count=s.width>.25?16:12;
    for(let side=0;side<4;side++){
      b.beam(facePoint(-lo,s.y+.002,side,lo),facePoint(lo,s.y+.002,side,lo),.0019,'deck');
      b.beam(facePoint(-hi,s.y+s.rail,side,hi),facePoint(hi,s.y+s.rail,side,hi),.0017,'deck');
      for(let i=0;i<=count;i++){
        const x0=lerp(-lo,lo,i/count),x1=lerp(-hi,hi,i/count);
        b.beam(facePoint(x0,s.y+.002,side,lo),facePoint(x1,s.y+s.rail,side,hi),.0024,'structure');
      }
    }
  }
}

function cVariantStilts(b:ModelBuilder,p:CPhotoProfile,detail:Detail):void {
  cVariantBody(b,p,detail);
  const lift=p.variantStiltHeight??.19,scale=1-lift;
  // The normal body is compressed vertically into the space above an OPEN stand.
  // Do not also set raisedSupportHeight, which would add solid masonry supports.
  for(const bucket of b.buckets.values())for(let i=0;i<bucket.positions.length;i+=3){
    bucket.positions[i+1]=lift+bucket.positions[i+1]*scale;
    const n=v(bucket.normals[i],bucket.normals[i+1]/scale,bucket.normals[i+2]).normalize();
    bucket.normals[i]=n.x;bucket.normals[i+1]=n.y;bucket.normals[i+2]=n.z;
  }
  const c=(p.baseWidth-p.footWidth)/2,w=.006;
  for(const sx of[-1,1])for(const sz of[-1,1]){
    b.beam(v(sx*c,.005,sz*c),v(sx*c,lift,sz*c),w,'stone');
    b.box(.030,.006,.030,v(sx*c,.003,sz*c),'stone');
  }
  for(const y of[.014,lift])for(let side=0;side<4;side++)
    b.beam(facePoint(-c,y,side,c),facePoint(c,y,side,c),.0055,'stone');
}

function cVariantInsetPatch(b:ModelBuilder,side:number,y0:number,y1:number,lo0:number,hi0:number,lo1:number,hi1:number,depth:(y:number)=>number):void {
  if(hi0-lo0<.007||hi1-lo1<.007)return;
  const a=facePoint(lo0,y0,side,depth(y0)+.0016),z=facePoint(hi0,y0,side,depth(y0)+.0016);
  const c=facePoint(hi1,y1,side,depth(y1)+.0016),d=facePoint(lo1,y1,side,depth(y1)+.0016);
  b.surface([a,z,c,d],[0,1,2,0,2,3],'clock');
  // Pale diagonal seams over a brown inset make four triangular tile fields.
  b.beam(a,c,.0025,'stone',.0017);b.beam(z,d,.0025,'stone',.0017);
}

function cVariantMasonryInlay(b:ModelBuilder,p:CPhotoProfile,detail:Detail):void {
  buildMasonry(b,{...p,masonryPlainPlatforms:true},detail);
  const r=p.baseWidth/2,top=p.first.width*.40,span=r*.56,spring=.050,crownY=p.first.y*(p.masonryArchRatio??.61);
  const depth=(y:number)=>lerp(r,top,y/p.first.y);
  const opening=(y:number)=>y<spring?span:y<crownY?span*Math.sqrt(Math.max(0,1-((y-spring)/(crownY-spring))**2)):0;
  for(let side=0;side<4;side++){
    for(let row=0;row<3;row++){
      const y0=lerp(.016,p.first.y-.019,row/3),y1=lerp(.016,p.first.y-.019,(row+1)/3)-.006;
      for(const sign of[-1,1]){
        const a=Math.max(opening(y0)+.010,depth(y0)*.42),c=Math.max(opening(y1)+.010,depth(y1)*.42);
        cVariantInsetPatch(b,side,y0,y1,sign<0?-depth(y0)+.009:a,sign<0?-a:depth(y0)-.009,
          sign<0?-depth(y1)+.009:c,sign<0?-c:depth(y1)-.009,depth);
      }
    }
    const midDepth=(y:number)=>lerp(p.first.width*.38,p.second.width*.32,(y-p.first.y)/(p.second.y-p.first.y));
    for(const sign of[-1,1]){
      const y0=p.first.y+.018,y1=p.second.y-.048,d0=midDepth(y0),d1=midDepth(y1);
      cVariantInsetPatch(b,side,y0,y1,sign<0?-d0+.005:d0*.60,sign<0?-d0*.60:d0-.005,
        sign<0?-d1+.005:d1*.60,sign<0?-d1*.60:d1-.005,midDepth);
    }
    const upperDepth=(y:number)=>lerp(p.second.width*.24,.015,(y-(p.second.y+.007))/(.927-(p.second.y+.007)));
    for(let row=0;row<6;row++){
      const y0=lerp(p.second.y+.027,.910,row/6),y1=lerp(p.second.y+.027,.910,(row+1)/6)-.006;
      cVariantInsetPatch(b,side,y0,y1,-upperDepth(y0)*.73,upperDepth(y0)*.73,-upperDepth(y1)*.73,upperDepth(y1)*.73,upperDepth);
    }
  }
}

function cVariantCarvedRelief(b:ModelBuilder,p:CPhotoProfile,detail:Detail):void {
  void detail; // Fixed silhouette and aperture layout in both LODs.
  const r=p.baseWidth/2,f=p.first.width*.43,m=p.second.width*.36,d=p.variantReliefDepth??.075;
  const s=new THREE.Shape();s.moveTo(-r,0);s.lineTo(-f,p.first.y);s.lineTo(-m,p.second.y);s.lineTo(-.025,.890);
  s.quadraticCurveTo(-.046,.925,-.022,.949);s.lineTo(-.008,.987);s.quadraticCurveTo(0,1,.009,.987);
  s.lineTo(.023,.949);s.quadraticCurveTo(.046,.925,.025,.890);s.lineTo(m,p.second.y);s.lineTo(f,p.first.y);s.lineTo(r,0);
  const span=r*.58,spring=.028,arch=p.first.y*.78;s.lineTo(span,0);s.lineTo(span,spring);
  for(let j=0;j<=20;j++){const a=j*Math.PI/20;s.lineTo(span*Math.cos(a),spring+(arch-spring)*Math.sin(a));}
  s.lineTo(-span,0);s.closePath();
  const middle=new THREE.Path();middle.moveTo(-f*.46,p.first.y+.022);middle.lineTo(-m*.50,p.second.y-.019);
  middle.lineTo(m*.50,p.second.y-.019);middle.lineTo(f*.46,p.first.y+.022);middle.closePath();s.holes.push(middle);
  const slot=new THREE.Path();slot.moveTo(-.012,p.second.y+.020);slot.lineTo(-.006,.854);slot.lineTo(.006,.854);slot.lineTo(.012,p.second.y+.020);slot.closePath();s.holes.push(slot);
  cVariantExtrude(b,s,d,'structure');
  // A bounded piece of trunk records the relief origin; this is NOT a model of
  // the whole unseen tree. Keep it behind the carving and within tower height.
  b.cylinder(.101,.082,.005,.888,'shadow',12,0,-d*.79);
  b.box(p.first.width,.018,d+.008,v(0,p.first.y,d*.02),'deck');b.box(p.second.width,.013,d+.004,v(0,p.second.y,d*.02),'deck');
  for(const sign of[-1,1])for(let row=0;row<7;row++){
    const y=lerp(p.second.y+.050,.844,(row+.5)/7),x=sign*lerp(m*.63,.017,(y-p.second.y)/(.89-p.second.y)),half=.0065;
    b.beam(v(x-half,y-.014,d/2+.001),v(x+half,y+.014,d/2+.001),.0028,'shadow');
    b.beam(v(x+half,y-.014,d/2+.001),v(x-half,y+.014,d/2+.001),.0028,'shadow');
  }
}

function cVariantPlywood(b:ModelBuilder,p:CPhotoProfile,detail:Detail):void {
  void detail; // Fixed silhouette and aperture layout in both LODs.
  const radius=(y:number)=>y<=p.first.y?lerp(p.baseWidth/2,p.first.width*.46,y/p.first.y):y<=p.second.y?
    lerp(p.first.width*.46,p.second.width*.46,(y-p.first.y)/(p.second.y-p.first.y)):
    lerp(p.second.width*.46,.007,(y-p.second.y)/(1-p.second.y));
  const s=new THREE.Shape();s.moveTo(-radius(0),0);for(const y of[p.first.y,p.second.y,1])s.lineTo(-radius(y),y);
  for(const y of[1,p.second.y,p.first.y,0])s.lineTo(radius(y),y);
  const span=p.baseWidth*.31,spring=.017,arch=p.first.y*.79;s.lineTo(span,0);s.lineTo(span,spring);
  for(let j=0;j<=22;j++){const a=j*Math.PI/22;s.lineTo(span*Math.cos(a),spring+(arch-spring)*Math.sin(a));}
  s.lineTo(-span,0);s.closePath();
  // Middle is woven board lattice; upper is a solid sheet with just five large windows.
  const y0=p.first.y+.037,y1=p.second.y-.026,rows=7;
  for(let row=0;row<rows;row++){
    const y=lerp(y0,y1,(row+.5)/rows),rr=radius(y)*.86,cols=5;
    for(let col=0;col<cols;col++){
      const x=lerp(-rr,rr,(col+.5)/cols),hw=rr/cols*.72,hh=(y1-y0)/rows*.35;
      const h=new THREE.Path();h.moveTo(x-hw,y);h.lineTo(x,y+hh);h.lineTo(x+hw,y);h.lineTo(x,y-hh);h.closePath();s.holes.push(h);
    }
  }
  for(const [t,offset]of [[.12,-.42],[.21,.35],[.38,0],[.58,0],[.78,0]]){
    const y=lerp(p.second.y,1,t),r=radius(y),x=r*offset,hw=Math.min(.020,r*.30),hh=Math.min(.025,(1-p.second.y)*.05);
    const h=new THREE.Path();h.moveTo(x-hw,y);h.lineTo(x,y+hh);h.lineTo(x+hw,y);h.lineTo(x,y-hh);h.closePath();s.holes.push(h);
  }
  for(let side=0;side<4;side++)b.facade(s,side,radius,'structure');
  const signY=p.first.y+.018,signW=p.first.width*1.06,front=radius(signY)+.010;
  b.box(signW,.048,.008,v(0,signY,front),'deck');
  const glyphs:Record<string,number[][][]>={
    L:[[[0,1],[0,0],[.8,0]]],I:[[[.4,0],[.4,1]]],A:[[[0,0],[.4,1],[.8,0]],[[.18,.42],[.63,.42]]],
    P:[[[0,0],[0,1],[.7,1],[.8,.75],[.65,.55],[0,.55]]],R:[[[0,0],[0,1],[.7,1],[.8,.75],[.65,.55],[0,.55]],[[.36,.55],[.8,0]]],
    S:[[[.8,.95],[.6,1],[0,.9],[0,.55],[.8,.4],[.8,.05],[.2,0],[0,.1]]]
  };
  const text='LILLA PARIS',cell=signW*.075,h=.028,start=-cell*text.length/2;
  for(let i=0;i<text.length;i++)for(const line of glyphs[text[i]]??[])for(let j=0;j<line.length-1;j++){
    const a=line[j],z=line[j+1];b.beam(v(start+i*cell+a[0]*cell,signY-h/2+a[1]*h,front+.005),v(start+i*cell+z[0]*cell,signY-h/2+z[1]*h,front+.005),.0013,'enamel');
  }
}

function cInsidePolygon(x:number,y:number,pts:number[][]):boolean {
  let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const a=pts[i],z=pts[j];if((a[1]>y)!==(z[1]>y)&&x<(z[0]-a[0])*(y-a[1])/(z[1]-a[1])+a[0])inside=!inside;
  }return inside;
}

function cPolygonClearance(x:number,y:number,pts:number[][]):number {
  let nearest=Infinity;
  for(let i=0;i<pts.length;i++){
    const a=pts[i],z=pts[(i+1)%pts.length],dx=z[0]-a[0],dy=z[1]-a[1];
    const t=THREE.MathUtils.clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy),0,1);
    nearest=Math.min(nearest,Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t));
  }
  return nearest;
}

function cVariantMemorialCross(b:ModelBuilder,p:CPhotoProfile,detail:Detail):void {
  void detail; // Fixed silhouette and aperture layout in both LODs.
  const scale=p.baseWidth/.56;
  const raw=[[-.15,0],[-.067,.33],[-.042,.65],[-.26,.60],[-.28,.79],[-.055,.75],[-.080,1],[.080,1],[.055,.75],[.28,.79],[.26,.60],[.042,.65],[.067,.33],[.15,0],[.075,0],[.026,.205],[-.026,.205],[-.075,0]];
  const pts=raw.map(([x,y])=>[x*scale,y]),s=new THREE.Shape();s.moveTo(pts[0][0],pts[0][1]);
  for(const[x,y]of pts.slice(1))s.lineTo(x,y);s.closePath();
  // Fixed lattice keeps both LODs the same silhouette and under the small budget.
  for(let y=.030;y<.965;y+=.037)for(let x=-.255*scale;x<.256*scale;x+=.033*scale){
    const hw=.0105*scale,hh=.0128,diamond=[[x-hw,y],[x,y+hh],[x+hw,y],[x,y-hh]];
    // Earcut requires holes strictly inside the concave outline. A corner-only
    // containment check allowed near-touching diamonds to bridge the arm recess.
    if(!diamond.every(([xx,yy])=>cInsidePolygon(xx,yy,pts)&&cPolygonClearance(xx,yy,pts)>.0025*scale))continue;
    const hole=new THREE.Path();hole.moveTo(diamond[0][0],diamond[0][1]);for(const[xx,yy]of diamond.slice(1))hole.lineTo(xx,yy);hole.closePath();s.holes.push(hole);
  }
  cVariantExtrude(b,s,.021,'structure');
  for(let i=0;i<pts.length;i++){
    const a=pts[i],z=pts[(i+1)%pts.length];b.beam(v(a[0],a[1],.012),v(z[0],z[1],.012),.0048,'deck');
  }
  b.beam(v(0,.206,.014),v(0,.960,.014),.007,'shadow');
  b.beam(v(-.232*scale,.702,.014),v(.232*scale,.702,.014),.007,'shadow');
}

/** Explicit Limboto architectural podium; never selected by Yanam or other keys. */
function buildLimbotoPodium(b:ModelBuilder,p:TowerProfile,detail:Detail):void {
  const high=detail==='detail',roofY=p.first.y,archRoof=roofY*.64;
  const groundR=p.baseWidth/2,wallR=p.baseWidth*.405;
  const depth=(y:number)=>lerp(groundR,wallR,y/archRoof);
  const arch=new THREE.Shape(),span=p.baseWidth*.235,spring=.020,crown=archRoof*.86;
  arch.moveTo(-groundR,0);arch.lineTo(-wallR,archRoof);arch.lineTo(wallR,archRoof);arch.lineTo(groundR,0);
  arch.lineTo(span,0);arch.lineTo(span,spring);
  for(let i=0;i<=24;i++){const a=Math.PI*i/24;arch.lineTo(span*Math.cos(a),spring+(crown-spring)*Math.sin(a));}
  arch.lineTo(-span,0);arch.closePath();
  for(let side=0;side<4;side++)b.facade(arch,side,depth,'stone');
  squareRing(b,archRoof,p.baseWidth*.87,0,.010,'stone');
  const storey=(roofY-archRoof)/2;
  for(let level=0;level<2;level++){
    const floor=archRoof+level*storey,outer=p.baseWidth*(level===0?1.045:.990),r=p.baseWidth*(level===0?.389:.373);
    squareRing(b,floor,outer,0,.007,'deck');
    squareRails(b,floor+.005,outer*.96,storey*.49,high?18:12,.0015);
    for(let side=0;side<4;side++){
      const q=new THREE.Quaternion().setFromAxisAngle(Y,side*Math.PI/2),wallH=storey*.76;
      b.box(r*2,wallH,.006,facePoint(0,floor+storey*.47,side,r),'stone',q);
      for(let col=0;col<6;col++){
        const cell=r*2/6,x=-r+(col+.5)*cell;
        b.box(cell*.73,wallH*.63,.002,facePoint(x,floor+storey*.48,side,r+.0042),'glass',q);
        b.beam(facePoint(x-cell*.46,floor+.009,side,r+.006),facePoint(x-cell*.46,floor+storey*.91,side,r+.006),.0021,'structure');
      }
      for(const sign of[-1,1])b.beam(facePoint(sign*outer*.46,floor+.005,side,outer*.46),facePoint(sign*outer*.46,floor+storey,side,outer*.46),.0031,'deck');
    }
  }
  // The metal tower begins ON the roof, not as Eiffel legs inside a solid plinth.
  const ss=stations(p),topDeck=Math.max(p.second.y,...(p.extraPlatforms??[]).map(s=>s.y));
  const lower=[...new Set([roofY,p.second.y,topDeck,...subdivided(roofY,topDeck,high?13:9)])].sort((a,z)=>a-z);
  for(const sx of[-1,1])for(const sz of[-1,1])for(let j=0;j<lower.length-1;j++){
    const lo=sectionCorners(ss,lower[j],sx,sz),hi=sectionCorners(ss,lower[j+1],sx,sz);
    for(let k=0;k<4;k++){
      b.beam(lo[k],hi[k],p.mainWidth*.80,'structure');
      latticeFace(b,lo[k],lo[(k+1)%4],hi[k],hi[(k+1)%4],1,p.latticeWidth,high,false);
    }
  }
  if(topDeck<p.upperEnd){
    const levels=subdivided(topDeck,p.upperEnd,high?7:5);
    for(let j=0;j<levels.length-1;j++){
      const lo=outerCorners(ss,levels[j]),hi=outerCorners(ss,levels[j+1]);
      for(let k=0;k<4;k++){
        b.beam(lo[k],hi[k],p.mainWidth*.67,'structure');
        latticeFace(b,lo[k],lo[(k+1)%4],hi[k],hi[(k+1)%4],1,p.latticeWidth,high,false);
      }
    }
  }
  for(const platform of[p.first,p.second,...(p.extraPlatforms??[])])buildPlatform(b,p,platform,detail);
  buildTop(b,p,detail);
  if(p.photoCrown||p.photoSymbol||p.photoCube)buildPhotoMarks(b,p);
}

function buildCPhotoVariant(b:ModelBuilder,raw:TowerProfile,detail:Detail):boolean {
  const p=raw as CPhotoProfile;
  switch(p.photoVariant){
    case 'limboto-podium':buildLimbotoPodium(b,p,detail);return true;
    case 'olympic-eiffel':cVariantOlympic(b,p,detail);return true;
    case 'masonry-inlay':cVariantMasonryInlay(b,p,detail);return true;
    case 'lean-rail-eiffel':cVariantLeanRails(b,p,detail);return true;
    case 'carved-wood-relief':cVariantCarvedRelief(b,p,detail);return true;
    case 'plywood-eiffel':cVariantPlywood(b,p,detail);return true;
    case 'stilt-eiffel':cVariantStilts(b,p,detail);return true;
    case 'memorial-cross':cVariantMemorialCross(b,p,detail);return true;
    default:return false;
  }
}

export function createTowerModel(modelKey: SupportedModelKey, detail: Detail = 'detail', renderStyle: TowerRenderStyle = 'heritage'): THREE.Group {
  const profile = PROFILES.get(modelKey);
  if (!profile) throw new Error(`Unknown tower model key: ${modelKey}`);
  const builder = new ModelBuilder(profile.surfaceKind === 'bamboo', profile.surfaceKind === 'lego', detail === 'overview' ? .040 : .024);
  if (buildCPhotoVariant(builder, profile, detail)) return builder.finish(profile, detail, renderStyle);
  if(profile.topology==='topiary-eiffel') {
    buildTopiary(builder,profile,detail);return builder.finish(profile,detail,renderStyle);
  }
  if(profile.topology==='garden-lamp') {
    buildGardenLamp(builder,profile,detail);return builder.finish(profile,detail,renderStyle);
  }
  if(profile.topology==='coffee-kiosk') {
    buildCoffeeKiosk(builder,profile,detail);return builder.finish(profile,detail,renderStyle);
  }
  if(profile.photoTimber) {
    buildPhotoTimber(builder,profile,detail);return builder.finish(profile,detail,renderStyle);
  }
  if (profile.topology === 'drop-tower-eiffel') {
    buildDropTowerEiffel(builder, detail);
    return builder.finish(profile, detail, renderStyle);
  }
  if (profile.topology === 'solid-panel-eiffel') {
    buildSolidPanelEiffel(builder, detail);
    return builder.finish(profile, detail, renderStyle);
  }
  if (profile.topology === 'flagpole-eiffel') {
    buildFlagpoleEiffel(builder, detail);
    return builder.finish(profile, detail, renderStyle);
  }
  if (profile.topology === 'spring-eiffel') {
    buildSpringEiffel(builder,profile,detail);
    return builder.finish(profile,detail,renderStyle);
  }
  if (profile.topology === 'outline-eiffel') {
    buildOutlineEiffel(builder,profile,detail);
    return builder.finish(profile,detail,renderStyle);
  }
  if (profile.topology === 'brick-eiffel') {
    buildBrickEiffel(builder,profile,detail);
    return builder.finish(profile,detail,renderStyle);
  }
  if (profile.topology === 'visible-truss-section') {
    buildVisibleTrussSection(builder, profile, detail);
    return builder.finish(profile, detail, renderStyle);
  }
  if (profile.topology === 'spire') {
    buildSpire(builder, profile, detail);
    return builder.finish(profile, detail, renderStyle);
  }
  if(profile.key === 'us-gasquet-gasquet-market' && profile.photoPebbleSurface) {
    buildGasquetFieldstone(builder,profile,detail);return builder.finish(profile,detail,renderStyle);
  }
  if (profile.topology === 'masonry' || profile.topology === 'hybrid-pedestal') {
    if (profile.topology === 'masonry') buildMasonry(builder, profile, detail);
    else buildHybridPedestal(builder, profile, detail);
    return builder.finish(profile, detail, renderStyle);
  }
  if (profile.topology === 'perforated-playground') {
    buildPerforatedPlayground(builder, profile, detail);
    return builder.finish(profile, detail, renderStyle);
  }
  if (profile.topology === 'roof-section') {
    buildRoofSection(builder, profile, detail);
    return builder.finish(profile, detail, renderStyle);
  }
  const shape = stations(profile);
  buildPylons(builder, profile, shape, detail);
  if(profile.photoPerforatedLegs)buildPhotoPerforatedLegs(builder,profile,shape,detail);
  if (profile.photoFilledPanels) buildPhotoFilledPanels(builder, profile, shape, detail);
  if (profile.photoPerforatedShell) buildPhotoPerforatedShell(builder, profile, shape, detail);
  buildArches(builder, profile, shape, detail);
  buildPlatform(builder, profile, profile.first, detail);
  buildPlatform(builder, profile, profile.second, detail);
  buildHeroDepth(builder, profile, shape, detail);
  for (const platform of profile.extraPlatforms ?? []) buildPlatform(builder, profile, platform, detail);
  if (profile.flankingTurrets) buildFlankingTurrets(builder, profile, detail);
  if (profile.perforatedLowerGallery) buildPerforatedLowerGallery(builder, profile, detail);
  buildLift(builder, profile, shape, detail);
  buildTop(builder, profile, detail);
  buildCompletionDetails(builder, profile, shape, detail);
  buildRemainingDetails(builder, profile, shape, detail);
  for (const panel of profile.photoPanels ?? []) {
    for (const side of panel.side === undefined ? [0, 1, 2, 3] : [panel.side]) {
      builder.box(panel.width, panel.height, .0015, facePoint(0, panel.y, side, panel.depth), panel.paint,
        new THREE.Quaternion().setFromAxisAngle(Y, side * Math.PI / 2));
    }
  }
  if(profile.photoCube || profile.photoRoundSign || profile.photoLettering || profile.photoArrow || profile.photoBiplane || profile.photoDiamondCrown || profile.photoCrown || profile.photoSymbol || profile.photoTurbine) buildPhotoMarks(builder,profile);
  if (profile.zeppelin) buildZeppelin(builder, detail);
  if (profile.sideLadder) buildSideLadder(builder, profile, detail);
  if (profile.internalStairs || profile.steelButtresses || profile.centralBraceSpine) buildEvidenceAccess(builder,profile,detail);
  buildConnections(builder, profile, shape, detail);
  return builder.finish(profile, detail, renderStyle);
}
