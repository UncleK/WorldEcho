import { EFFECTS, type EffectName } from '../playground/play-state.ts';

export interface TowerPlayState { effects: EffectName[]; seed: string }
export interface TowerPlayAction { effect: EffectName; revision: number }
export const TOWER_TRIGGERS: Record<string, { effect: EffectName; y: number; size: [number, number, number] }> = {
  'us-paris-texas': { effect: 'hats', y: .96, size: [.32, .17, .32] },
  'us-las-vegas-paris': { effect: 'party', y: .43, size: [.26, .19, .26] },
  'id-rawa-pening-bamboo': { effect: 'water', y: .045, size: [.64, .13, .64] },
};

// The main explorer already owns `seed` for its photo challenge.
export function readTowerPlay(search: string): TowerPlayState {
  const params = new URLSearchParams(search), requested = new Set((params.get('echo') ?? '').split('.'));
  const seed = params.get('echoSeed') ?? 'worldecho';
  return { effects: EFFECTS.filter(effect => requested.has(effect)), seed: /^[a-zA-Z0-9_-]{1,32}$/.test(seed) ? seed : 'worldecho' };
}
export function towerPlayUrl(base: string, state: TowerPlayState): string {
  const url = new URL(base);
  if (state.effects.length) {
    url.searchParams.set('echo', EFFECTS.filter(effect => state.effects.includes(effect)).join('.'));
    url.searchParams.set('echoSeed', state.seed);
  } else { url.searchParams.delete('echo'); url.searchParams.delete('echoSeed'); }
  return url.href;
}

const copy = {
  'zh-CN': {
    reset: '重置视角与效果',
    title: '这座塔的小秘密', intro: '点一点模型，把它的性格传给整个世界。', visit: '去地球上试试', learn: '看看怎么玩', clear: '恢复原样', close: '关闭',
    hats: { name: '帽子派对', hint: '点一下红帽子', description: '德州的帽子大王，一出手就给全世界的塔戴上奇怪的帽子。再点一次，换一套。', result: '帽子已经戴好。转动地球，找找谁戴得最离谱。' },
    party: { name: '世界派对', hint: '点一下塔腰的小灯', description: '拉斯维加斯发出开场信号。灯波经过哪里，哪里的塔就亮起自己的夜色，扫光与节拍随后加入。', result: '世界派对已经开场。再点小灯，就可以结束派对。' },
    water: { name: '潮汐星球', hint: '点一下竹塔的塔脚', description: '轻点竹塔的塔脚，水纹会绕着地球扩散。经过的塔染上水光，轻轻浮动。', result: '一圈涟漪，唤醒一座座水上的塔。再点塔脚，让世界恢复平静。' },
  },
  en: {
    reset: 'Reset view and effects',
    title: 'This tower has a secret', intro: 'Touch the model and let its personality travel around the world.', visit: 'Try it on the globe', learn: 'Discover its secret', clear: 'Restore the world', close: 'Turn off',
    hats: { name: 'Hat party', hint: 'Tap the red hat', description: 'The Texas hat king gives every tower a curious hat. Tap again for a new collection.', result: 'The hats are on. Turn the globe and find the most unlikely pairing.' },
    party: { name: 'World party', hint: 'Tap the light halfway up', description: 'Las Vegas sends the opening cue. A wave switches on each tower’s own night colours, followed by sweeping lights and a shared beat.', result: 'The world party has begun. Tap the light again to end it.' },
    water: { name: 'Tidal planet', hint: 'Tap the bamboo tower’s feet', description: 'Tap the bamboo tower’s feet. Ripples travel around the globe, leaving pools of light and gently floating towers in their wake.', result: 'The ripples are waking the towers. Tap the feet again to restore a quiet world.' },
  },
  fr: {
    reset: 'Réinitialiser la vue et les effets',
    title: 'Le petit secret de cette tour', intro: 'Touchez la maquette et partagez son caractère avec le monde.', visit: 'Essayer sur le globe', learn: 'Découvrir son secret', clear: 'Rétablir le monde', close: 'Désactiver',
    hats: { name: 'Fête des chapeaux', hint: 'Touchez le chapeau rouge', description: 'Le roi des chapeaux du Texas coiffe toutes les tours de chapeaux insolites. Touchez à nouveau pour changer de collection.', result: 'Les chapeaux sont là. Tournez le globe pour découvrir les associations les plus drôles.' },
    party: { name: 'Fête mondiale', hint: 'Touchez la petite lumière à mi-hauteur', description: 'Las Vegas donne le signal. Une onde allume les couleurs nocturnes de chaque tour, puis les faisceaux dansent au même rythme.', result: 'La fête mondiale commence. Touchez la lumière à nouveau pour la terminer.' },
    water: { name: 'Planète des marées', hint: 'Touchez les pieds de la tour en bambou', description: 'Touchez les pieds de la tour en bambou. Les ondes parcourent le globe et les tours se mettent à flotter doucement dans la lumière de l’eau.', result: 'Les ondes réveillent les tours. Touchez à nouveau pour retrouver le calme.' },
  },
};
export function towerPlayCopy(language: string) { return copy[language as keyof typeof copy] ?? copy.en; }
