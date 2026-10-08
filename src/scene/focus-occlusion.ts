import { Box3, Camera, Group, Matrix4, Mesh, Ray, Vector3, type Material } from 'three';

function body(group: Group): Group | undefined {
  return group.children.find(child => child.userData.bodyPickProxy) as Group | undefined;
}

export function advanceFocusOpacity(current: number, goal: number, delta: number, immediate = false): number {
  const next = immediate ? goal : current + (goal - current) * (1 - Math.exp(-Math.min(delta, .1) * 14));
  // Demand rendering must reach the exact endpoint before its final frame stops.
  return Math.abs(goal - next) < .002 ? goal : next;
}

/** Test camera-to-subject segments against the same banded structure used for picking.
 * A nearby tower behind or beside the subject does not count as an obstruction.
 * All volumes remain in model space: no position, scale or recorded size is changed.
 */
export function findFocusOccluders(groups: Map<string, Group>, selectedId: string, camera: Camera, extraLocalPoint?: Vector3): Set<string> {
  const selected = groups.get(selectedId), subject = selected && body(selected);
  const boxes = subject?.userData.bodyPickVolumes as Box3[] | undefined;
  const blocked = new Set<string>();
  if (!subject || !boxes?.length) return blocked;
  subject.updateWorldMatrix(true, false);
  const origin = camera.getWorldPosition(new Vector3()), samples = new Map<string, Vector3>(), projected = new Vector3();
  for (const box of boxes) {
    const point = box.getCenter(new Vector3());
    // Retain each occupied quadrant at ten heights, including the feet and crown.
    const key = `${Math.floor(point.y * 10)}:${point.x >= 0}:${point.z >= 0}`;
    if (!samples.has(key)) samples.set(key, point);
  }
  if (extraLocalPoint) samples.set('interaction', extraLocalPoint.clone());
  const rays = [...samples.values()].flatMap(point => {
    subject.localToWorld(point); projected.copy(point).project(camera);
    if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) return [];
    return [{ ray: new Ray(origin, point.clone().sub(origin).normalize()), distance: origin.distanceTo(point) }];
  });
  const inverse = new Matrix4(), localRay = new Ray(), hit = new Vector3();
  for (const [id, group] of groups) {
    if (id === selectedId || !group.visible) continue;
    const candidate = body(group), volumes = candidate?.userData.bodyPickVolumes as Box3[] | undefined;
    if (!candidate || !volumes?.length) continue;
    candidate.updateWorldMatrix(true, false); inverse.copy(candidate.matrixWorld).invert();
    const envelope: Box3 = candidate.userData.bodyPickEnvelope ?? volumes.reduce((bounds, volume) => bounds.union(volume), new Box3());
    if (rays.some(({ ray, distance }) => {
      localRay.copy(ray).applyMatrix4(inverse);
      if (!localRay.intersectsBox(envelope)) return false;
      return volumes.some(volume => {
        if (!localRay.intersectBox(volume, hit)) return false;
        hit.applyMatrix4(candidate.matrixWorld);
        return origin.distanceTo(hit) < distance - 0.001;
      });
    })) blocked.add(id);
  }
  return blocked;
}

/** An instance-owned final alpha multiplier, independent of animated night opacity. */
export function installFocusFade(group: Group) {
  const opacity = { value: 1 }, seen = new Set<Material>();
  const materials: Array<{ material: Material; transparent: boolean; depthWrite: boolean }> = [];
  const shadows: Array<{ mesh: Mesh; castShadow: boolean }> = [];
  group.traverse(object => {
    if (!(object instanceof Mesh)) return;
    shadows.push({ mesh: object, castShadow: object.castShadow });
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (seen.has(material)) continue;
      seen.add(material); materials.push({ material, transparent: material.transparent, depthWrite: material.depthWrite });
      const original = material.onBeforeCompile, key = material.customProgramCacheKey();
      material.onBeforeCompile = (shader: Parameters<Material['onBeforeCompile']>[0], renderer: Parameters<Material['onBeforeCompile']>[1]) => {
        original.call(material, shader, renderer);
        shader.uniforms.focusOpacity = opacity;
        shader.fragmentShader = 'uniform float focusOpacity;\n' + shader.fragmentShader;
        // Apply after alpha testing so leaves retain their silhouette as they fade.
        if (shader.fragmentShader.includes('#include <opaque_fragment>')) {
          shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', 'diffuseColor.a *= focusOpacity;\n#include <opaque_fragment>');
        } else {
          // The tower's custom additive night-light shader writes gl_FragColor directly.
          const end = shader.fragmentShader.lastIndexOf('}');
          shader.fragmentShader = shader.fragmentShader.slice(0, end) + '\ngl_FragColor.a *= focusOpacity;\n' + shader.fragmentShader.slice(end);
        }
      };
      material.customProgramCacheKey = () => key + '-focus-opacity-v1';
      material.needsUpdate = true;
    }
  });
  let faded = false;
  return (value: number) => {
    opacity.value = Math.max(0, Math.min(1, value));
    const next = opacity.value < 0.999;
    if (next === faded) return false;
    faded = next;
    for (const entry of materials) {
      entry.material.transparent = next || entry.transparent;
      entry.material.depthWrite = next ? false : entry.depthWrite;
      entry.material.needsUpdate = true;
    }
    for (const entry of shadows) entry.mesh.castShadow = next ? false : entry.castShadow;
    return true;
  };
}
