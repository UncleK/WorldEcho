import { useCallback, useEffect, useRef, useState } from 'react';
import { readTowerPlay, towerPlayUrl, type TowerPlayAction, type TowerPlayState } from '../domain/tower-play';
import { freshSeed, type EffectName } from '../playground/play-state';

export function useTowerPlay() {
  const [state, setState] = useState(() => readTowerPlay(location.search));
  const [action, setAction] = useState<TowerPlayAction | null>(null);
  const current = useRef(state), serial = useRef(0);
  useEffect(() => {
    const restore = () => { const next = readTowerPlay(location.search); current.current = next; setState(next); setAction(null); };
    addEventListener('popstate', restore); return () => removeEventListener('popstate', restore);
  }, []);
  const commit = useCallback((next: TowerPlayState) => {
    current.current = next; setState(next);
    history.replaceState({}, '', towerPlayUrl(location.href, next));
  }, []);
  const activate = useCallback((effect: EffectName) => {
    const before = current.current, enabled = before.effects.includes(effect);
    const effects = enabled && effect !== 'hats' ? before.effects.filter(item => item !== effect) : [...new Set([...before.effects, effect])];
    commit({ effects, seed: effect === 'hats' ? freshSeed() : before.seed });
    setAction(effects.includes(effect) ? { effect, revision: ++serial.current } : null);
  }, [commit]);
  const remove = useCallback((effect?: EffectName) => {
    commit({ ...current.current, effects: effect ? current.current.effects.filter(item => item !== effect) : [] });
    setAction(null);
  }, [commit]);
  return { state, action, activate, remove };
}
