import { BackSide, Color, ShaderMaterial } from 'three';
export type SkyPreset='auto'|'morning'|'golden'|'dusk'|'night'|'cloudy'|'overcast';
export function resolveEnvironment(style: string, preset: SkyPreset = 'auto'): Exclude<SkyPreset,'auto'> {
  return preset === 'auto' ? style === 'night' ? 'night' : 'morning' : preset;
}
export function cloudCoverage(preset: Exclude<SkyPreset,'auto'>) {
  return preset === 'overcast' ? .95 : preset === 'cloudy' ? .6 : preset === 'golden' || preset === 'dusk' ? .32 : 0;
}
export const SKY_LIGHTING={
  morning:{direction:[-1.6,2.1,4],key:'#fff0dc',intensity:2.8,hemi:'#c2dbed',ground:'#253341',ambient:.40,fill:'#b5d4ef',fillIntensity:.30,edge:'#b8d2ef',edgeIntensity:.35},
  cloudy:{direction:[-1.6,2.1,4],key:'#fff5e6',intensity:2.35,hemi:'#d4e5f2',ground:'#253341',ambient:.48,fill:'#b5d4ef',fillIntensity:.30,edge:'#b8d2ef',edgeIntensity:.30},
  overcast:{direction:[-1.6,2.1,4],key:'#e4edf5',intensity:1.15,hemi:'#d5e3ed',ground:'#344351',ambient:.66,fill:'#c7d9e4',fillIntensity:.32,edge:'#bed5e5',edgeIntensity:.20},
  golden:{direction:[-4,1.1,2.3],key:'#ffd09a',intensity:2.25,hemi:'#dac1a5',ground:'#352932',ambient:.4,fill:'#e2c6ae',fillIntensity:.28,edge:'#efa16d',edgeIntensity:.45},
  dusk:{direction:[-4,1.1,-.6],key:'#dcbbef',intensity:1.4,hemi:'#aebee2',ground:'#241f39',ambient:.32,fill:'#bcc9e9',fillIntensity:.25,edge:'#8faef3',edgeIntensity:.4},
  night:{direction:[-3.5,.8,-3.2],key:'#91baff',intensity:.90,hemi:'#aec9e6',ground:'#1e2030',ambient:.30,fill:'#c2ddff',fillIntensity:.25,edge:'#79aaff',edgeIntensity:.30}
} as const;
export function createCloudSkyMaterial(theme:'dark'|'light',preset:Exclude<SkyPreset,'auto'>,seed:number){
  const palettes={
    light:{morning:['#e6f0f7','#cfdee9','#fbfdff'],golden:['#f3e9dc','#e5d5c5','#fff5df'],dusk:['#e7e6f0','#cfccde','#f5eef7'],night:['#d3dfeb','#bdcadd','#e8eef7']},
    dark:{morning:['#0b2033','#081221','#42607d'],golden:['#251b1e','#0b1220','#a77553'],dusk:['#141629','#080d18','#675a82'],night:['#030813','#060c19','#29364b']}
  };
  const [top,bottom,cloud]=palettes[theme][preset === 'cloudy' || preset === 'overcast' ? 'morning' : preset];
  return new ShaderMaterial({side:BackSide,depthWrite:false,depthTest:false,toneMapped:false,
    uniforms:{topColor:{value:new Color(top)},bottomColor:{value:new Color(bottom)},cloudColor:{value:new Color(cloud)},strength:{value:theme==='light'?.55:.23},seed:{value:seed}},
    vertexShader:'varying vec3 direction; void main(){direction=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`
      uniform vec3 topColor;uniform vec3 bottomColor;uniform vec3 cloudColor;uniform float strength;uniform float seed;varying vec3 direction;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      void main(){vec3 d=normalize(direction);vec2 p=d.xz*5.+d.y*vec2(2.4,4.1)+seed;float n=noise(p)*.55+noise(p*1.9)*.28+noise(p*3.7)*.17;
        float clouds=smoothstep(.38,.66,n)*strength;vec3 color=mix(bottomColor,topColor,smoothstep(-.65,.85,d.y));color=mix(color,cloudColor,clouds);gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }`
  });
}
