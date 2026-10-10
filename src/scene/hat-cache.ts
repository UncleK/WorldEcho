import { createPlayHat, disposePlayObject } from '../playground/hat-models.ts';
import type { Group } from 'three';

const templates = new Map<string, { object: Group; users: number }>();
/** Geometry and immutable materials are shared; transforms remain instance-owned. */
export function acquireHat(kind: number, palette: number, detail: 'overview' | 'detail') {
  const key = `${kind}:${palette}:${detail}`;
  let entry = templates.get(key);
  if (!entry) { entry = { object: createPlayHat(kind, palette, detail), users: 0 }; templates.set(key, entry); }
  entry.users++;
  const object = entry.object.clone(true);
  object.traverse(child => { child.raycast = () => {}; });
  let released = false;
  return { object, release() {
    if (released) return; released = true;
    if (--entry.users === 0) { disposePlayObject(entry.object); templates.delete(key); }
  } };
}
