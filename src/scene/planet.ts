import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Color, DataTexture,
  MeshBasicMaterial, MeshStandardMaterial, RGBAFormat, ShaderMaterial, SphereGeometry,
  SRGBColorSpace, Texture, Vector3, NoColorSpace, DoubleSide,
} from 'three';
import { EARTH_RADIUS } from './geo';
import type { EarthStyle } from '../types';
import { createEarthGeometry, miniatureRadius, type LandData } from './earth-geometry';
import { createRealisticEarth, type EarthDetailMaps } from './realistic-earth';
import { createWeatherLayers, shadeMaterialByWeather, type EarthWeather } from './earth-weather';

export const LAND_RELIEF = 0.0045;

export interface PlanetSurface {
  geometry: SphereGeometry;
  material: MeshStandardMaterial;
  land?: { geometry: BufferGeometry; material: MeshStandardMaterial };
  coast?: { geometry: BufferGeometry; material: MeshStandardMaterial };
  layers?: { geometry: SphereGeometry; material: ShaderMaterial; renderOrder: number }[];
  realistic?: boolean;
  update?: (seconds: number, sunDirection: Vector3, cameraRadius: number, coverage?: number, daylight?: number, warmth?: number) => void;
  radiusAt: (lat: number, lon: number) => number;
  dispose: () => void;
}

/** Atlas north is image row 0, lon 0 is u=.5. No geographic jitter. */
export function createHeightSampler(texture: Texture): (lat: number, lon: number) => number {
  const image = texture.image as HTMLImageElement | ImageBitmap | undefined;
  if (!image || !image.width || !image.height || typeof document === 'undefined') {
    return () => EARTH_RADIUS + LAND_RELIEF;
  }
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return () => EARTH_RADIUS + LAND_RELIEF;
  try {
    context.drawImage(image, 0, 0);
    const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
    return (lat, lon) => {
      const u = ((lon + 180) / 360 % 1 + 1) % 1;
      const v = Math.max(0, Math.min(1, (90 - lat) / 180));
      const x = Math.min(width - 1, Math.floor(u * width));
      const y = Math.min(height - 1, Math.floor(v * height));
      return EARTH_RADIUS + data[(y * width + x) * 4] / 255 * LAND_RELIEF;
    };
  } catch {
    // If pixels are unavailable, keep the anchor outside the highest terrain.
    return () => EARTH_RADIUS + LAND_RELIEF;
  }
}

const noiseShader = `
float globeHash(vec3 p) { p = fract(p * .3183099 + vec3(.1,.2,.3)); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float globeNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f*f*(3.-2.*f);
  return mix(mix(mix(globeHash(i),globeHash(i+vec3(1,0,0)),f.x),mix(globeHash(i+vec3(0,1,0)),globeHash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(globeHash(i+vec3(0,0,1)),globeHash(i+vec3(1,0,1)),f.x),mix(globeHash(i+vec3(0,1,1)),globeHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}`;

function addMineralSurface(material: MeshStandardMaterial, style: EarthStyle, land: boolean) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `varying vec3 vPlanetPosition;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPlanetPosition = position;');
    shader.fragmentShader = `varying vec3 vPlanetPosition;\n${noiseShader}\n${shader.fragmentShader}`.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 p = normalize(vPlanetPosition);
      float grain = globeNoise(p*780.0);
      float mineral = globeNoise(p*26.0)*.60 + globeNoise(p*73.0)*.25 + grain*.15;
      ${land ? `
        ${style === 'day' ? `
          float sahara = exp(-14.0 * dot(p-vec3(.16,.38,.91),p-vec3(.16,.38,.91)));
          float australia = exp(-30.0 * dot(p-vec3(.67,-.43,-.60),p-vec3(.67,-.43,-.60)));
          float dry = clamp(sahara*1.8+australia*1.2+mineral*.22-.17,0.,1.);
          diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.56,.37,.16),dry);
          float ice = smoothstep(.88,.97,abs(p.y)+mineral*.075);
          diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.75,.81,.80),ice);
        ` : ''}
        diffuseColor.rgb *= .87+mineral*.24;
      ` : 'diffuseColor.rgb *= .965+globeNoise(p*130.)*.07;'}
    `);
  };
  material.customProgramCacheKey = () => `towerworld-vector-${style}-${land ? 'land' : 'ocean'}-v4`;
}

export function createPlanetSurface(colorMap: Texture | null, heightMap: Texture | null, mobile: boolean, style: EarthStyle, landData: LandData, details?: EarthDetailMaps, weather?: EarthWeather): PlanetSurface {
  if (style === 'satellite' && colorMap && heightMap && details) {
    return createRealisticEarth(colorMap, heightMap, details, mobile, style, weather);
  }
  if (style !== 'satellite') {
    const geometry = new SphereGeometry(EARTH_RADIUS, mobile ? 144 : 224, mobile ? 96 : 144);
    const meshes = createEarthGeometry(landData, mobile);
    const palette = style === 'porcelain'
      ? { ocean: '#224d70', land: '#e8dfc7', coast: '#b79758', roughness: 0.39, metalness: 0.06 }
      : style === 'night'
        ? { ocean: '#071a32', land: '#345466', coast: '#628790', roughness: 0.7, metalness: 0.03 }
        : { ocean: '#123d56', land: '#648576', coast: '#aa986c', roughness: 0.82, metalness: 0.01 };
    const material = new MeshStandardMaterial({ color: palette.ocean, roughness: style === 'porcelain' ? 0.32 : 0.52, metalness: 0.13, envMapIntensity: 0.35 });
    const landMaterial = new MeshStandardMaterial({ color: palette.land, roughness: palette.roughness, metalness: palette.metalness, envMapIntensity: 0.3 });
    const coastMaterial = new MeshStandardMaterial({ color: palette.coast, roughness: 0.74, metalness: 0.08, side: DoubleSide });
    if (style === 'night') {
      material.emissive.set('#071222'); material.emissiveIntensity = 0.5;
      landMaterial.emissive.set('#193344'); landMaterial.emissiveIntensity = 0.22;
      coastMaterial.emissive.set('#779caa'); coastMaterial.emissiveIntensity = 0.3;
    }
    addMineralSurface(material, style, false);
    addMineralSurface(landMaterial, style, true);
    const climate = weather ? createWeatherLayers(weather, mobile, false) : null;
    if (weather) for (const surface of [material, landMaterial, coastMaterial]) shadeMaterialByWeather(surface, weather);
    return {
      geometry, material, land: { geometry: meshes.land, material: landMaterial }, coast: { geometry: meshes.coast, material: coastMaterial },
      layers: climate?.layers, update: climate?.update,
      // Coarse coast data omits small islands. Anchor safely above the miniature shell without asserting terrain accuracy.
      radiusAt: miniatureRadius,
      dispose: () => { geometry.dispose(); meshes.land.dispose(); meshes.coast.dispose(); material.dispose(); landMaterial.dispose(); coastMaterial.dispose(); climate?.dispose(); },
    };
  }
  if (!colorMap || !heightMap) throw new Error('Satellite surface requires its loaded atlas');
  colorMap.colorSpace = SRGBColorSpace;
  heightMap.colorSpace = NoColorSpace;
  colorMap.anisotropy = mobile ? 2 : 4;
  heightMap.anisotropy = mobile ? 2 : 4;
  const geometry = new SphereGeometry(EARTH_RADIUS, mobile ? 128 : 160, mobile ? 80 : 112);
  geometry.rotateY(-Math.PI / 2);
  const material = new MeshStandardMaterial({
    map: colorMap,
    displacementMap: heightMap,
    displacementScale: 0.006,
    bumpMap: heightMap,
    bumpScale: 0.0018,
    roughnessMap: heightMap,
    roughness: 0.68,
    metalness: 0,
    envMapIntensity: 0.12,
  });
  // The land mask gives matte land and a restrained sea reflection without another atlas.
  // This replaces the stock roughness-map multiplication, which would make black sea perfectly smooth.
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
      float roughnessFactor = roughness;
      #ifdef USE_ROUGHNESSMAP
        float landMask = texture2D(roughnessMap, vRoughnessMapUv).g;
        roughnessFactor = mix(0.46, 0.91, landMask);
      #endif
    `);
  };
  material.customProgramCacheKey = () => 'towerworld-earth-land-water-v3';
  const sample = createHeightSampler(heightMap);
  const radiusAt = (lat: number, lon: number) => EARTH_RADIUS + (sample(lat, lon) - EARTH_RADIUS) * 0.006 / LAND_RELIEF;
  return { geometry, material, radiusAt, dispose: () => { geometry.dispose(); material.dispose(); } };
}

export function createContactShadowMaterial(): MeshBasicMaterial {
  const size = 48;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1);
      const index = (y * size + x) * 4;
      pixels[index] = 0;
      pixels[index + 1] = 0;
      pixels[index + 2] = 0;
      pixels[index + 3] = Math.round(Math.max(0, 1 - distance) ** 2.5 * 190);
    }
  }
  const map = new DataTexture(pixels, size, size, RGBAFormat);
  map.needsUpdate = true;
  return new MeshBasicMaterial({ map, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false });
}

export function createAtmosphereMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: BackSide,
    blending: AdditiveBlending,
    uniforms: { haloColor: { value: new Color('#4fb4ef') }, sunDirection: { value: new Vector3(3.5, 5, 4.5).normalize() } },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPosition = world.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform vec3 haloColor;
      uniform vec3 sunDirection;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float edge = pow(1.0 - abs(dot(normalize(vWorldNormal), viewDirection)), 3.4);
        float sun = dot(normalize(vWorldNormal), sunDirection);
        vec3 color = mix(haloColor * .48, haloColor, smoothstep(-.45,.65,sun));
        color = mix(color,vec3(.56,.32,.13),smoothstep(.8,1.,sun)*.16);
        float overviewHalo = smoothstep(.05,.55,length(cameraPosition)-1.0);
        gl_FragColor = vec4(color, edge * 0.27 * overviewHalo);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

/** Static, very low-contrast distant haze. No particles or continuous animation loop. */
export function createSpaceMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    side: BackSide, depthWrite: false, depthTest: false,
    vertexShader: `varying vec3 direction; void main(){direction=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      varying vec3 direction;
      void main(){
        vec3 d=normalize(direction);
        float blue=pow(max(0.,dot(d,normalize(vec3(-.3,.45,-.7)))),12.);
        float violet=pow(max(0.,dot(d,normalize(vec3(.5,.12,-.4)))),20.);
        vec3 color=vec3(.0013,.003,.008)+blue*vec3(.006,.014,.028)+violet*vec3(.012,.005,.018);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

/** Fixed seed and no animation: sparse space without an idle render loop. */
export function createStarGeometry(count = 360): BufferGeometry {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  let seed = 47091;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const point = new Vector3();
  for (let i = 0; i < count; i += 1) {
    const y = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const horizontal = Math.sqrt(1 - y * y);
    point.set(horizontal * Math.cos(angle), y, horizontal * Math.sin(angle)).multiplyScalar(25 + random() * 35);
    positions.set(point.toArray(), i * 3);
    const brightness = 0.24 + random() * 0.6;
    colors.set([brightness * 0.86, brightness * 0.93, brightness], i * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}
