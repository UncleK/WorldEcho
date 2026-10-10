import { useThree } from '@react-three/fiber';
import type { WebGLRenderer } from 'three';

type Job = { run: () => void; priority: number };
/** A scene-owned queue: keep expensive preparation out of a single React commit. */
export function createSceneWorkQueue(invalidate: () => void) {
  const pending = new Set<Job>();
  let frame = 0;
  const drain = () => {
    frame = 0;
    const start = performance.now();
    let count = 0;
    for (const job of [...pending].sort((a, b) => b.priority - a.priority)) {
      if (!pending.delete(job)) continue;
      job.run(); count++;
      if (count >= 8 || performance.now() - start >= 4) break;
    }
    invalidate();
    if (pending.size) frame = requestAnimationFrame(drain);
  };
  return {
    add(run: () => void, priority = 0) {
      const job = { run, priority }; pending.add(job);
      if (!frame) frame = requestAnimationFrame(drain);
      return () => { pending.delete(job); if (!pending.size && frame) { cancelAnimationFrame(frame); frame = 0; } };
    },
  };
}
const queues = new WeakMap<WebGLRenderer, ReturnType<typeof createSceneWorkQueue>>();
export function useSceneWork() {
  const { gl, invalidate } = useThree();
  let queue = queues.get(gl);
  if (!queue) { queue = createSceneWorkQueue(invalidate); queues.set(gl, queue); }
  return queue;
}
