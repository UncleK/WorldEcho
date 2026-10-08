export const EFFECTS = ['hats', 'party', 'water'] as const;
export type EffectName = typeof EFFECTS[number];
export interface PlayState {
  effects: EffectName[];
  seed: string;
  selectedId: string;
  close: boolean;
}
export const CHARACTERS = [
  { id: 'us-paris-texas', effect: 'hats', name: '德州 · 帽子大王', personality: '爱带大家胡闹',
    invitation: '碰一下红帽子，看看世界会发生什么。', action: '抛出帽子', icon: 'hat',
    result: '帽子大王出手了。转动地球，找找谁戴得最离谱。' },
  { id: 'us-las-vegas-paris', effect: 'party', name: '拉斯维加斯 · 派对主持', personality: '喜欢把大家叫到一起',
    invitation: '碰一下亮着的小灯，邀请全世界参加派对。', action: '开一场派对', icon: 'spark',
    result: '灯光沿着地球亮起来。帽子也可以一起加入派对。' },
  { id: 'id-rawa-pening-bamboo', effect: 'water', name: '湖上竹塔 · 造梦者', personality: '慢悠悠地做一个梦',
    invitation: '碰一下塔脚的水面，让一个涟漪环游世界。', action: '轻点水面', icon: 'water',
    result: '一圈涟漪正在旅行。每座塔都有了一小片水景。' },
] satisfies Array<{ id: string; effect: EffectName; name: string; personality: string; invitation: string; action: string; icon: string; result: string }>;

export function hashIdentity(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}

// Identity based, so catalog reordering, clustering and additions cannot change an existing hat.
export function hatChoice(seed: string, towerId: string) {
  const hash = hashIdentity(`${seed}:${towerId}`);
  return { kind: hash % 7, palette: (hash >>> 6) % 7, tilt: ((hash >>> 12) % 21 - 10) / 65 };
}

export function readPlayState(search: string, ids: readonly string[], fallback = CHARACTERS[0].id): PlayState {
  const params = new URLSearchParams(search);
  const requested = new Set((params.get('play') ?? '').split('.'));
  const seed = params.get('seed') ?? 'worldecho';
  const requestedId = params.get('tower') ?? fallback;
  return {
    effects: EFFECTS.filter(effect => requested.has(effect)),
    seed: /^[a-zA-Z0-9_-]{1,32}$/.test(seed) ? seed : 'worldecho',
    selectedId: ids.includes(requestedId) ? requestedId : ids.includes(fallback) ? fallback : ids[0] ?? '',
    close: params.get('view') !== 'globe',
  };
}

export function playUrl(base: string, state: PlayState): string {
  const url = new URL(base);
  // This route owns these parameters; unrelated URL state survives.
  url.searchParams.set('seed', state.seed);
  url.searchParams.set('tower', state.selectedId);
  url.searchParams.set('view', state.close ? 'close' : 'globe');
  if (state.effects.length) url.searchParams.set('play', EFFECTS.filter(effect => state.effects.includes(effect)).join('.'));
  else url.searchParams.delete('play');
  return url.href;
}

export function freshSeed(): string {
  return Array.from(crypto.getRandomValues(new Uint32Array(2)), value => value.toString(36)).join('-');
}

export function advanceClock(previous: number, now: number, paused: boolean): number {
  return paused ? 0 : Math.max(0, Math.min(.15, (now - previous) / 1000));
}
