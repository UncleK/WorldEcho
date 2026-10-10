import { AdditiveBlending, BackSide, Mesh, MeshStandardMaterial, ShaderMaterial, SphereGeometry, Texture, Vector3, type Group } from 'three';

export function createEarthWeather(surface: Texture) {
  return {
    earthSurface: { value: surface }, earthSun: { value: new Vector3(0, 1, 1).normalize() },
    earthTime: { value: 0 }, earthCoverage: { value: 0 }, earthClouds: { value: 0 },
    earthDaylight: { value: 1 }, earthWarmth: { value: 0 },
  };
}
export type EarthWeather = ReturnType<typeof createEarthWeather>;

/** The same spherical projection shades both the ground and every real tower model. */
export const EARTH_WEATHER_GLSL = `
uniform sampler2D earthSurface;
uniform vec3 earthSun;
uniform float earthTime;
uniform float earthCoverage;
uniform float earthClouds;
uniform float earthDaylight;
uniform float earthWarmth;
float cloudAt(vec2 uv){
  float density=texture2D(earthSurface,vec2(fract(uv.x+earthTime*.00035),clamp(uv.y,0.,1.))).b;
  return smoothstep(.23-earthCoverage*.12,.88-earthCoverage*.12,density);
}
float earthCloudShadow(vec3 point){
  if(earthCoverage<=0.)return 0.;
  vec3 n=normalize(point);
  vec3 projected=normalize(n+earthSun*.005/max(.15,dot(n,earthSun)));
  vec2 uv=vec2(atan(projected.x,projected.z)/6.28318530718+.5,asin(clamp(projected.y,-1.,1.))/3.14159265359+.5);
  return cloudAt(uv)*earthCoverage;
}
`;

export function shadeMaterialByWeather(material: MeshStandardMaterial, weather: EarthWeather) {
      const previous = material.onBeforeCompile;
      const key = material.customProgramCacheKey();
      material.onBeforeCompile = (shader, renderer) => {
        previous.call(material, shader, renderer);
        Object.assign(shader.uniforms, weather);
        shader.vertexShader = `varying vec3 vWeatherPoint;\n${shader.vertexShader}`
          .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWeatherPoint=(modelMatrix*vec4(transformed,1.)).xyz;');
        shader.fragmentShader = `varying vec3 vWeatherPoint;\n${EARTH_WEATHER_GLSL}\n${shader.fragmentShader}`
          .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
            float weatherShade=earthCloudShadow(vWeatherPoint);
            reflectedLight.directDiffuse*=1.-weatherShade*.52;
            reflectedLight.directSpecular*=1.-weatherShade*.60;`);
      };
      material.customProgramCacheKey = () => `${key}|shared-cloud-shadow-v1`;
}

export function shadeTowerByWeather(group: Group, weather: EarthWeather) {
  const seen = new Set<MeshStandardMaterial>();
  group.traverse(object => {
    if (!(object instanceof Mesh) || object.userData.displayDecoration) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!(material instanceof MeshStandardMaterial) || seen.has(material)) continue;
      seen.add(material); shadeMaterialByWeather(material, weather);
    }
  });
}

export function createWeatherLayers(weather: EarthWeather, mobile: boolean, atmosphere: boolean) {
  const cloudGeometry = new SphereGeometry(1.008, mobile ? 96 : 144, mobile ? 64 : 96);
  cloudGeometry.rotateY(-Math.PI / 2);
  const cloudMaterial = new ShaderMaterial({ transparent: true, depthWrite: false, uniforms: weather,
    vertexShader: `varying vec2 vEarthUv; varying vec3 vEarthNormal; varying vec3 vEarthWorld;
      void main(){vEarthUv=uv;vec4 p=modelMatrix*vec4(position,1.);vEarthWorld=p.xyz;
      vEarthNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: EARTH_WEATHER_GLSL + `
      varying vec2 vEarthUv;varying vec3 vEarthNormal;varying vec3 vEarthWorld;
      void main(){vec3 n=normalize(vEarthNormal);float solar=dot(n,earthSun);
        float daylight=earthDaylight;
        vec3 tint=mix(vec3(.007,.011,.021),vec3(.82,.90,1.),daylight);
        tint*=.68+.32*max(0.,solar);
        tint=mix(tint,vec3(.50,.20,.075),earthWarmth*.38);
        float facing=max(0.,dot(n,normalize(cameraPosition-vEarthWorld)));
        gl_FragColor=vec4(tint,cloudAt(vEarthUv)*earthClouds*smoothstep(0.,.15,facing));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const layers = [{ geometry: cloudGeometry, material: cloudMaterial, renderOrder: 2 }];
  if (atmosphere) {
    const geometry = new SphereGeometry(1.024, mobile ? 80 : 128, mobile ? 48 : 80);
    const material = new ShaderMaterial({ transparent: true, depthWrite: false, side: BackSide,
      blending: AdditiveBlending, uniforms: { ...weather, earthAir: { value: 1 } },
      vertexShader: `varying vec3 airNormal;varying vec3 airWorld;
        void main(){vec4 p=modelMatrix*vec4(position,1.);airWorld=p.xyz;airNormal=normalize(mat3(modelMatrix)*normal);
        gl_Position=projectionMatrix*viewMatrix*p;}`,
      fragmentShader: `uniform vec3 earthSun;uniform float earthAir;uniform float earthDaylight;uniform float earthWarmth;varying vec3 airNormal;varying vec3 airWorld;
        void main(){vec3 n=normalize(airNormal);float solar=dot(n,earthSun);
          float rim=pow(1.-abs(dot(n,normalize(cameraPosition-airWorld))),3.8);
          vec3 tint=mix(vec3(.025,.26,.66),vec3(.43,.075,.016),earthWarmth*.65);
          gl_FragColor=vec4(tint,rim*mix(.17,.48,earthDaylight)*earthAir);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    layers.push({ geometry, material, renderOrder: 3 });
  }
  return {
    layers,
    update: (seconds: number, sun: Vector3, radius: number, coverage = 0, daylight = 1, warmth = 0) => {
      weather.earthTime.value = seconds; weather.earthSun.value.copy(sun); weather.earthCoverage.value = coverage;
      weather.earthDaylight.value = daylight; weather.earthWarmth.value = warmth;
      const fade = Math.max(0, Math.min(1, (radius - 1.12) / .65));
      weather.earthClouds.value = coverage * fade;
      cloudMaterial.visible = coverage > .001 && fade > .001;
      if (atmosphere) layers[1].material.uniforms.earthAir.value = Math.max(.25, fade);
    },
    dispose: () => layers.forEach(layer => { layer.geometry.dispose(); layer.material.dispose(); }),
  };
}
