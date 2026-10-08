import {
  MeshStandardMaterial, NoColorSpace,
  RepeatWrapping, SphereGeometry, SRGBColorSpace, Texture, Vector3,
} from 'three';
import type { EarthStyle } from '../types';
import { SKY_LIGHTING, resolveEnvironment, type SkyPreset } from './sky';
import { createEarthWeather, createWeatherLayers, EARTH_WEATHER_GLSL, type EarthWeather } from './earth-weather';
import type { PlanetSurface } from './planet';

export interface EarthDetailMaps { night: Texture; surface: Texture }

/** Display presets share one sun direction for tower shadows, water and cloud shading. */
export function earthSunDirection(style: EarthStyle, preset: SkyPreset = 'auto', anchor?: Vector3): Vector3 {
  const environment = resolveEnvironment(style, preset);
  if (!anchor || anchor.lengthSq() < .01) return new Vector3(...SKY_LIGHTING[environment].direction).normalize();
  // Anchor the artistic light to the selected place. Day/night is uniform over the
  // whole globe; this direction only shapes highlights, shadows and cloud relief.
  const up = anchor.clone().normalize();
  const east = new Vector3(up.z, 0, -up.x);
  if (east.lengthSq() < 1e-8) east.set(1, 0, 0);
  east.normalize();
  const north = new Vector3().crossVectors(up, east).normalize();
  const angles = environment === 'night' ? [-.94, .25, .2]
    : environment === 'golden' ? [.18, -.92, .12]
    : environment === 'dusk' ? [-.08, -.96, .16] : [.86, -.45, .28];
  return up.multiplyScalar(angles[0]).addScaledVector(east, angles[1]).addScaledVector(north, angles[2]).normalize();
}

/** Bilinear geographic sampling, matching the atlas seam and north-first image rows. */
function pixels(texture: Texture) {
  const image = texture.image as HTMLImageElement;
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context || !image?.width) throw new Error('Earth terrain pixels unavailable');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  return (lat: number, lon: number, channel = 0) => {
    const u = ((lon + 180) / 360 % 1 + 1) % 1;
    const x = u * width - .5, y = Math.max(0, Math.min(height - 1, (90 - lat) / 180 * height - .5));
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const at = (px: number, py: number) => data[(Math.min(height - 1, py) * width + (px + width) % width) * 4 + channel] / 255;
    return (at(ix, iy) * (1 - fx) + at(ix + 1, iy) * fx) * (1 - fy)
      + (at(ix, iy + 1) * (1 - fx) + at(ix + 1, iy + 1) * fx) * fy;
  };
}

const declarations = EARTH_WEATHER_GLSL + `
uniform sampler2D earthNight;
uniform sampler2D earthLand;
varying vec2 vEarthUv;
varying vec3 vEarthNormal;
varying vec3 vEarthWorld;
float seaHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float seaNoise(vec3 p){
  vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(seaHash(i),seaHash(i+vec3(1,0,0)),f.x),
    mix(seaHash(i+vec3(0,1,0)),seaHash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(seaHash(i+vec3(0,0,1)),seaHash(i+vec3(1,0,1)),f.x),
    mix(seaHash(i+vec3(0,1,1)),seaHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
`;

/**
 * WebGL adaptation of Three.js r186 webgpu_tsl_earth / Bruno Simon's Earth lesson.
 * Day/night, Fresnel and twilight concepts: Three.js authors, MIT (see public/earth-rendering-notices.txt).
 * Terrain is a small display relief derived from the source bump channel, never measured altitude.
 * Texture ownership stays with useEarthAtlas; this factory owns only geometry and materials.
 */
export function createRealisticEarth(
  color: Texture, land: Texture, maps: EarthDetailMaps, mobile: boolean, style: EarthStyle, weather = createEarthWeather(maps.surface),
): PlanetSurface {
  color.colorSpace = maps.night.colorSpace = SRGBColorSpace;
  land.colorSpace = maps.surface.colorSpace = NoColorSpace;
  for (const texture of [color, land, maps.night, maps.surface]) {
    texture.anisotropy = mobile ? 4 : 8;
    texture.wrapS = RepeatWrapping;
  }
  const sampleRelief = pixels(maps.surface), sampleLand = pixels(land);
  const radiusAt = (lat: number, lon: number) => {
    const mask = Math.min(1, sampleLand(lat, lon) / .65);
    return 1 + mask * (.00065 + Math.pow(sampleRelief(lat, lon), .8) * .00375);
  };
  const geometry = new SphereGeometry(1, mobile ? 160 : 256, mobile ? 112 : 176);
  geometry.rotateY(-Math.PI / 2);
  const positions = geometry.attributes.position, point = new Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i).normalize();
    const lat = Math.asin(Math.max(-1, Math.min(1, point.y))) * 180 / Math.PI;
    const lon = Math.atan2(point.x, point.z) * 180 / Math.PI;
    point.multiplyScalar(radiusAt(lat, lon));
    positions.setXYZ(i, point.x, point.y, point.z);
  }
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  const uniforms = { ...weather, earthNight: { value: maps.night }, earthLand: { value: land } };
  const material = new MeshStandardMaterial({ map: color, bumpMap: maps.surface, bumpScale: .0028,
    roughness: .8, metalness: 0, envMapIntensity: .08, emissive: '#ffffff', emissiveIntensity: 1 });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `varying vec2 vEarthUv; varying vec3 vEarthNormal; varying vec3 vEarthWorld;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vEarthUv = uv;
        vEarthNormal = normalize(mat3(modelMatrix) * normalize(position));`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vEarthWorld = (modelMatrix * vec4(transformed,1.)).xyz;`);
    shader.fragmentShader = declarations + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 earthN = normalize(vEarthNormal);
      float solar = dot(earthN,earthSun);
      float landAmount = smoothstep(.05,.65,texture2D(earthLand,vEarthUv).r);
      float daylight = earthDaylight;
      float closeUp = 1.-smoothstep(.28,1.05,length(cameraPosition-vEarthWorld));
      float detailFilter = 1.-smoothstep(.7,2.5,1100.*max(length(dFdx(earthN)),length(dFdy(earthN))));
      float landGrainA=0.,landGrainB=0.;
      if(closeUp>.01 && landAmount>.05){
        landGrainA=seaNoise(earthN*1100.)-.5;
        landGrainB=seaNoise(earthN.yzx*1453.+vec3(17.3))-.5;
        float dry=smoothstep(-.02,.055,diffuseColor.r-diffuseColor.g);
        vec3 localTint=mix(vec3(.10,.15,.085),vec3(.36,.25,.14),dry);
        float ice=smoothstep(.52,.78,min(diffuseColor.r,min(diffuseColor.g,diffuseColor.b)));
        localTint=mix(localTint,vec3(.63,.70,.73),ice);
        float value=clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))*1.8+.6,.7,1.25);
        diffuseColor.rgb=mix(diffuseColor.rgb,localTint*value,closeUp*.62*landAmount);
        diffuseColor.rgb*=1.+landGrainA*.10*closeUp*detailFilter;
      }
      float cloudShade = earthCloudShadow(vEarthWorld);
      diffuseColor.rgb = mix(mix(diffuseColor.rgb,vec3(.008,.026,.057),.4),diffuseColor.rgb,landAmount);
    `).replace('#include <roughnessmap_fragment>', `
      float roughnessFactor = mix(.30,.88,landAmount);
    `).replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      vec3 east = normalize(vec3(earthN.z,0.,-earthN.x)+vec3(.00001,0.,.00001));
      vec3 north = normalize(cross(earthN,east));
      float waveA = seaNoise(earthN*330.+vec3(earthTime*.32,0.,earthTime*.12))-.5;
      float waveB = seaNoise(earthN.yzx*417.+vec3(0.,-earthTime*.26,13.7))-.5;
      float waveFilter = 1.-smoothstep(.65,2.3,417.*max(length(dFdx(earthN)),length(dFdy(earthN))));
      vec3 ripple = east*waveA+north*waveB;
      normal = normalize(mix(normal,mat3(viewMatrix)*earthN,1.-landAmount)
        + mat3(viewMatrix)*ripple*.04*waveFilter*(1.-landAmount)
        + mat3(viewMatrix)*(east*landGrainA+north*landGrainB)*.035*detailFilter*closeUp*landAmount);
    `).replace('#include <lights_fragment_end>', `
      #include <lights_fragment_end>
      reflectedLight.directDiffuse *= 1.-cloudShade*.52;
      reflectedLight.directSpecular *= 1.-cloudShade*.60;
    `).replace('#include <emissivemap_fragment>', `
      totalEmissiveRadiance = texture2D(earthNight,vEarthUv).rgb * (1.-daylight)
        * (1.-cloudShade*.48) * .06 * mix(1.,.08,closeUp);
    `).replace('vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;', `
      vec3 daySurface = max(totalDiffuse,diffuseColor.rgb*.48) + totalSpecular*mix(.38,1.,landAmount);
      daySurface *= mix(vec3(1.),vec3(1.10,.88,.68),earthWarmth*.35);
      vec3 nightSurface = diffuseColor.rgb*vec3(.075,.11,.17) + totalSpecular*.035;
      vec3 outgoingLight = mix(nightSurface,daySurface,daylight) + totalEmissiveRadiance;
      float edge = pow(1.-max(0.,dot(earthN,normalize(cameraPosition-vEarthWorld))),3.5);
      vec3 airColor = mix(vec3(.035,.23,.53),vec3(.30,.055,.009),earthWarmth*.65);
      outgoingLight = mix(outgoingLight,airColor,edge*mix(.06,.27,daylight));
    `);
  };
  material.customProgramCacheKey = () => 'worldecho-earth-webgl-v4-display-lighting';

  const climate = createWeatherLayers(weather, mobile, true);
  return {
    geometry, material, radiusAt, realistic: true,
    layers: climate.layers, update: climate.update,
    dispose: () => { geometry.dispose(); material.dispose(); climate.dispose(); },
  };
}
