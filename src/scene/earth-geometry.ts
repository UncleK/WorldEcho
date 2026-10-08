import { BufferAttribute, BufferGeometry, ShapeUtils, Vector2, Vector3 } from 'three';

export type LandData = { features: { geometry: { type: string; coordinates: number[][][] | number[][][][] } }[] };
export const LAND_BASE_RADIUS = 1.0025;
export const MAX_LAND_RADIUS = 1.0045;
type Coordinate = [number, number];

function normalAt(lon: number, lat: number): Vector3 {
  const phi = lat * Math.PI / 180, lambda = lon * Math.PI / 180;
  return new Vector3(Math.cos(phi) * Math.sin(lambda), Math.sin(phi), Math.cos(phi) * Math.cos(lambda));
}

/** Authored miniature relief. It is deliberately not presented as measured elevation. */
export function miniatureRadius(lat: number, lon: number): number {
  const p = normalAt(lon, lat);
  const broad = Math.sin(p.x * 15 + Math.sin(p.y * 11)) * Math.cos(p.z * 13 + p.y * 5);
  const fine = Math.sin(p.x * 47 + p.z * 17) * Math.sin(p.y * 39 - p.z * 13);
  return LAND_BASE_RADIUS + 0.0012 * Math.max(0, broad) ** 2 + 0.0003 * (fine + 1);
}

function unwrapRing(source: number[][]): Coordinate[] {
  const ring: Coordinate[] = [];
  // Natural Earth's polar polygon is already cut at +/-180 and closes along
  // the South Pole. Unwrapping that planar cap removes Antarctica's interior.
  const polarCap = source.some((coordinate) => Math.abs(coordinate[1]) > 89.99);
  for (const coordinate of source) {
    let lon = coordinate[0];
    const previous = ring[ring.length - 1];
    if (previous && !polarCap) {
      while (lon - previous[0] > 180) lon -= 360;
      while (lon - previous[0] < -180) lon += 360;
    }
    if (!previous || Math.abs(lon - previous[0]) + Math.abs(coordinate[1] - previous[1]) > 1e-8) ring.push([lon, coordinate[1]]);
  }
  if (ring.length > 2 && Math.abs(ring[0][0] - ring.at(-1)![0]) + Math.abs(ring[0][1] - ring.at(-1)![1]) < 1e-8) ring.pop();
  return ring;
}

function simplifyRing(ring: Coordinate[], tolerance: number): Coordinate[] {
  if (ring.length < 8) return ring;
  const lineDistance = (p: Coordinate, a: Coordinate, b: Coordinate) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length)) : 0;
    return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
  };
  const simplify = (points: Coordinate[]): Coordinate[] => {
    let furthest = 0, distance = tolerance;
    for (let i = 1; i < points.length - 1; i += 1) {
      const candidate = lineDistance(points[i], points[0], points.at(-1)!);
      if (candidate > distance) { distance = candidate; furthest = i; }
    }
    if (!furthest) return [points[0], points.at(-1)!];
    return [...simplify(points.slice(0, furthest + 1)).slice(0, -1), ...simplify(points.slice(furthest))];
  };
  const half = Math.floor(ring.length / 2);
  const result = [...simplify(ring.slice(0, half + 1)).slice(0, -1), ...simplify([...ring.slice(half), ring[0]]).slice(0, -1)];
  return result.length >= 3 ? result : ring;
}

/** Triangulated vector coasts, subdivided onto the sphere; independent of raster atlas resolution. */
export function createEarthGeometry(data: LandData, mobile: boolean) {
  const landPositions: number[] = [], landNormals: number[] = [], wallPositions: number[] = [];
  const stepDegrees = mobile ? 4 : 3;
  const a = new Vector3(), b = new Vector3(), c = new Vector3();
  const pushTriangle = (positions: number[], p: Vector3, q: Vector3, r: Vector3, normals?: number[]) => {
    a.subVectors(q, p); b.subVectors(r, p); c.crossVectors(a, b);
    const points = c.dot(p) >= 0 ? [p, q, r] : [p, r, q];
    for (const point of points) {
      positions.push(point.x, point.y, point.z);
      if (normals) { const n = point.clone().normalize(); normals.push(n.x, n.y, n.z); }
    }
  };
  const landPoint = ([lon, lat]: Coordinate) => normalAt(lon, lat).multiplyScalar(miniatureRadius(lat, lon));
  const midpoint = (p: Coordinate, q: Coordinate): Coordinate => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  // Split shared edges using their own lengths, rather than a face-wide grid.
  // Both sides therefore get identical edge vertices and do not open cracks in close-up.
  const addFace = (p: Coordinate, q: Coordinate, r: Coordinate, depth = 0): void => {
    const pq = Math.hypot(p[0] - q[0], p[1] - q[1]) > stepDegrees;
    const qr = Math.hypot(q[0] - r[0], q[1] - r[1]) > stepDegrees;
    const rp = Math.hypot(r[0] - p[0], r[1] - p[1]) > stepDegrees;
    if ((!pq && !qr && !rp) || depth > 10) { pushTriangle(landPositions, landPoint(p), landPoint(q), landPoint(r), landNormals); return; }
    const a = midpoint(p, q), b = midpoint(q, r), c = midpoint(r, p);
    const next = (x: Coordinate, y: Coordinate, z: Coordinate) => addFace(x, y, z, depth + 1);
    if (pq && qr && rp) { next(p, a, c); next(a, q, b); next(c, b, r); next(a, b, c); }
    else if (pq && qr) { next(q, b, a); next(p, a, r); next(a, b, r); }
    else if (qr && rp) { next(r, c, b); next(q, b, p); next(b, c, p); }
    else if (rp && pq) { next(p, a, c); next(r, c, q); next(c, a, q); }
    else if (pq) { next(p, a, r); next(a, q, r); }
    else if (qr) { next(q, b, p); next(b, r, p); }
    else { next(r, c, q); next(c, p, q); }
  };
  const polygons = data.features.flatMap((feature) => feature.geometry.type === 'MultiPolygon'
    ? feature.geometry.coordinates as number[][][][] : [feature.geometry.coordinates as number[][][]]);
  for (const polygon of polygons) {
    const rings = polygon.map((ring) => simplifyRing(unwrapRing(ring), mobile ? 0.035 : 0.018)).filter((ring) => ring.length >= 3);
    if (!rings.length) continue;
    const outer = rings[0], holes = rings.slice(1);
    const flat = rings.flat();
    const triangles = ShapeUtils.triangulateShape(outer.map(([x, y]) => new Vector2(x, y)), holes.map((ring) => ring.map(([x, y]) => new Vector2(x, y))));
    for (const [ia, ib, ic] of triangles) {
      const pa = flat[ia], pb = flat[ib], pc = flat[ic];
      addFace(pa, pb, pc);
    }
    for (const ring of rings) for (let index = 0; index < ring.length; index += 1) {
      const start = ring[index], end = ring[(index + 1) % ring.length];
      // Pole-closing edges are internal seams; rendering them as cliffs makes an artificial meridian.
      if (Math.abs(start[0] - end[0]) > 180 || (Math.abs(start[0]) === 180 && Math.abs(end[0]) === 180)) continue;
      const divisions = Math.max(1, Math.ceil(Math.hypot(start[0] - end[0], start[1] - end[1]) / stepDegrees));
      for (let part = 0; part < divisions; part += 1) {
        const mix = (t: number): Coordinate => [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t];
        const highA = landPoint(mix(part / divisions)), highB = landPoint(mix((part + 1) / divisions));
        const lowA = highA.clone().normalize().multiplyScalar(0.9998), lowB = highB.clone().normalize().multiplyScalar(0.9998);
        pushTriangle(wallPositions, lowA, highA, highB);
        pushTriangle(wallPositions, lowA, highB, lowB);
      }
    }
  }
  const land = new BufferGeometry();
  land.setAttribute('position', new BufferAttribute(new Float32Array(landPositions), 3));
  land.setAttribute('normal', new BufferAttribute(new Float32Array(landNormals), 3));
  land.computeBoundingSphere();
  const coast = new BufferGeometry();
  coast.setAttribute('position', new BufferAttribute(new Float32Array(wallPositions), 3));
  coast.computeVertexNormals(); coast.computeBoundingSphere();
  return { land, coast };
}
