import { useEffect, useState } from 'react';
import { TextureLoader, type Texture } from 'three';

export interface EarthAtlas { color: Texture; height: Texture; night: Texture; surface: Texture }
export type EarthAtlasStatus = 'idle' | 'loading' | 'ready' | 'failed';

const urls = ['earth-color.webp', 'earth-height.webp', 'earth-realism/night.webp', 'earth-realism/surface.webp']
  .map(name => `${import.meta.env.BASE_URL}assets/${name}`);
// Own the decoded images for this page, independently of scene/style mounts.
// GPU upload happens only when the satellite material actually uses them.
let cachedAtlas: EarthAtlas | null = null;
let pendingAtlas: Promise<EarthAtlas> | null = null;

function loadAtlas(): Promise<EarthAtlas> {
  if (cachedAtlas) return Promise.resolve(cachedAtlas);
  if (pendingAtlas) return pendingAtlas;
  const loader = new TextureLoader();
  pendingAtlas = Promise.allSettled(urls.map(url => loader.loadAsync(url))).then(results => {
    const [color, height, night, surface] = results;
    if (color.status === 'fulfilled' && height.status === 'fulfilled' && night.status === 'fulfilled' && surface.status === 'fulfilled') {
      cachedAtlas = { color: color.value, height: height.value, night: night.value, surface: surface.value };
      return cachedAtlas;
    }
    // A partial download must not leak a texture or poison a later manual retry.
    for (const result of results) if (result.status === 'fulfilled') result.value.dispose();
    throw new Error('Satellite atlas unavailable');
  }).finally(() => { pendingAtlas = null; });
  return pendingAtlas;
}

interface Connection extends EventTarget { saveData?: boolean; effectiveType?: string }

export function useEarthAtlas(required: boolean, sceneReady: boolean) {
  const [atlas, setAtlas] = useState<EarthAtlas | null>(() => cachedAtlas);
  const [status, setStatus] = useState<EarthAtlasStatus>(() => cachedAtlas ? 'ready' : 'idle');
  const [retryCount, setRetryCount] = useState(0);
  const prefetchReady = sceneReady && !required;

  useEffect(() => {
    let active = true;
    let started = false;
    let delay: number | undefined;
    let idle: number | undefined;
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const constrained = () => connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType ?? '');
    const load = () => {
      started = true;
      setStatus('loading');
      void loadAtlas().then(next => {
        if (active) { setAtlas(next); setStatus('ready'); }
      }).catch(() => { if (active) setStatus('failed'); });
    };
    const cancelScheduled = () => {
      if (delay !== undefined) window.clearTimeout(delay);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      delay = idle = undefined;
    };
    const schedule = () => {
      cancelScheduled();
      if (started || cachedAtlas || document.hidden || constrained() || document.readyState !== 'complete') return;
      // Start only after the first rendered scene, page assets and initial interaction.
      delay = window.setTimeout(() => {
        delay = undefined;
        const prefetch = () => {
          idle = undefined;
          if (active && !document.hidden && !constrained()) load();
        };
        if (window.requestIdleCallback) idle = window.requestIdleCallback(prefetch, { timeout: 4000 });
        else prefetch();
      }, 2000);
    };

    if (cachedAtlas) { setAtlas(cachedAtlas); setStatus('ready'); }
    else if (required) load();
    else if (prefetchReady) {
      schedule();
      window.addEventListener('load', schedule);
      document.addEventListener('visibilitychange', schedule);
      connection?.addEventListener('change', schedule);
    }
    return () => {
      active = false;
      cancelScheduled();
      window.removeEventListener('load', schedule);
      document.removeEventListener('visibilitychange', schedule);
      connection?.removeEventListener('change', schedule);
    };
  }, [required, prefetchReady, retryCount]);

  return { atlas, status, retry: () => setRetryCount(value => value + 1) };
}
