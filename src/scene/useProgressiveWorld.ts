import { useEffect, useRef, useState } from 'react';
import { flushSync } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import type { SceneTower } from '../types';
import type { LandData } from './earth-geometry';
import { geoNormal } from './geo';
import landGeometryUrl from '../../data/geography/ne_50m_land.geojson?url';

const EMPTY_LAND: LandData = { features: [] };
let cachedLand: LandData | null = null;
let pendingLand: Promise<LandData> | null = null;

export function useProgressiveLand(firstFrame: boolean) {
  const [land, setLand] = useState(cachedLand);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!firstFrame || land) return;
    let active = true;
    const frame = requestAnimationFrame(() => {
      pendingLand ??= fetch(landGeometryUrl, { signal: AbortSignal.timeout(45000) }).then(response => {
        if (!response.ok) throw Error('Land unavailable');
        return response.json() as Promise<LandData>;
      }).then(next => {
        if (!Array.isArray(next.features)) throw Error('Land invalid');
        cachedLand = next;
        return next;
      }).finally(() => { pendingLand = null; });
      void pendingLand.then(next => { if (active) setLand(next); }).catch(() => { if (active) setFailed(true); });
    });
    return () => { active = false; cancelAnimationFrame(frame); };
  }, [firstFrame, land]);
  return { land: land ?? EMPTY_LAND, surface: land ? 'ready' as const : failed ? 'failed' as const : 'outline' as const };
}

/** Give the browser a painted frame between small construction batches. */
export function useProgressiveModels(towers: SceneTower[], selectedId: string, camera: PerspectiveCamera, enabled: boolean, mobile: boolean, paused: boolean) {
  const loaded = useRef(new Set<string>());
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled || paused) return;
    let active = true, frame = 0, paint = 0;
    let batchSize = 1;
    let previousCommit = 0;
    const currentIds = new Set(towers.map(tower => tower.id));
    for (const id of loaded.current) if (!currentIds.has(id)) loaded.current.delete(id);
    const remaining = new Map(towers.filter(tower => !loaded.current.has(tower.id)).map(tower => [tower.id, tower]));
    const schedule = () => {
      // Two rAFs guarantee a render opportunity after React commits this batch.
      frame = requestAnimationFrame(() => { paint = requestAnimationFrame(addBatch); });
    };
    const addBatch = () => {
      if (!active || !remaining.size) return;
      if (document.hidden) return;
      const now = performance.now();
      if (previousCommit) batchSize = now - previousCommit > 55 ? 1 : mobile ? 2 : 4;
      const direction = camera.position.clone().normalize();
      const ordered = [...remaining.values()].map(tower => ({ tower, priority: tower.id === selectedId ? 2 : geoNormal(tower.lat, tower.lon).dot(direction) }))
        .sort((a,b) => b.priority-a.priority).map(item => item.tower);
      for (const tower of ordered.slice(0, batchSize)) { loaded.current.add(tower.id); remaining.delete(tower.id); }
      previousCommit = now;
      // This is the R3F reconciler's flush, so a batch is committed before the next
      // frame is scheduled. Concurrent React otherwise merges many queued batches.
      flushSync(() => setRevision(value => value + 1));
      if (remaining.size) schedule();
    };
    const resume = () => { if (!document.hidden && remaining.size) { cancelAnimationFrame(frame); cancelAnimationFrame(paint); schedule(); } };
    if (remaining.size) schedule();
    document.addEventListener('visibilitychange', resume);
    return () => { active = false; cancelAnimationFrame(frame); cancelAnimationFrame(paint); document.removeEventListener('visibilitychange', resume); };
  }, [towers, selectedId, camera, enabled, mobile, paused]);
  // The revision triggers a commit while the stable set preserves already built models.
  void revision;
  return loaded.current;
}
