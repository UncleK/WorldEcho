// Runtime model registry validates keys; new evidence-backed cases need no interface edit.
export type ModelKey = string;
export type TowerRenderStyle = 'heritage' | 'metal' | 'porcelain' | 'blueprint' | 'illuminated';
export type ModelView='axonometric'|'front'|'side';
export type FocusProgress = { id: string; phase: 'lift' | 'orbit' | 'approach' | 'arrived' | 'idle'; progress: number };
export type ViewMode = 'globe' | 'comparison';
export type ComparisonKind = 'height' | 'reported' | 'appearance';
export type EarthStyle = 'day' | 'night' | 'porcelain' | 'satellite';
export interface SceneTower {
  id: string; name: string; countryCode: string; lat: number; lon: number;
  heightM: number | null; heightScope: 'structure' | 'total' | 'unknown';
  heightText?: string;
  modelKey: ModelKey | null;
  modelScope?: string | null;
  modelContext?: 'tower-body' | 'inferred-completion';
}
export interface WorldSceneProps {
  towers: SceneTower[]; selectedId: string; comparisonIds: string[];
  viewMode: ViewMode; comparisonKind: ComparisonKind; reducedMotion: boolean;
  onSelect: (id: string) => void; onReady?: () => void;
  onRemoveComparison?: (id: string) => void;
  earthStyle?: EarthStyle; exhibitScale?: number;
  uiTheme?: 'dark'|'light';
  skyPreset?: import('./scene/sky').SkyPreset;
  comparisonView?: ModelView;
  renderStyle?: TowerRenderStyle;
  showLabels?: boolean;
  showConnections?: boolean;
  animationSuspended?: boolean;
  towerPlay?: import('./domain/tower-play').TowerPlayState;
  towerPlayAction?: import('./domain/tower-play').TowerPlayAction | null;
  playOrigins?: SceneTower[];
  onTowerPlay?: (effect: import('./playground/play-state').EffectName) => void;
  onFocusProgress?: (state: FocusProgress) => void;
  onUserInteract?: () => void;
  onClusterSelect?: (ids: string[]) => void;
}
export interface WorldSceneHandle {
  resetView: () => void; zoomBy: (factor: number) => void; rotateBy: (radians: number) => void;
  focusTower: (id: string) => void;
}
