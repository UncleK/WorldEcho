import { Group, Mesh, MeshStandardMaterial, ShaderMaterial } from 'three';

/** Instance-owned display effects; the model factory and its source materials stay unchanged. */
export function installShowMaterials(group:Group){
  const water={value:0},seconds={value:0},seen=new Set(),emission:Array<{material:MeshStandardMaterial;base:number}>=[],lights:Array<{uniform:{value:number};base:number}>=[];
  group.traverse(object=>{
    if(!(object instanceof Mesh))return;
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      if(seen.has(material))continue;seen.add(material);
      if(material instanceof MeshStandardMaterial){
        emission.push({material,base:material.emissiveIntensity});
        const original=material.onBeforeCompile,key=material.customProgramCacheKey();
        material.onBeforeCompile=(shader,renderer)=>{
          original.call(material,shader,renderer);Object.assign(shader.uniforms,{echoWater:water,echoSeconds:seconds});
          shader.vertexShader='varying vec3 echoPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nechoPosition=position;');
          shader.fragmentShader='uniform float echoWater;uniform float echoSeconds;varying vec3 echoPosition;\n'+shader.fragmentShader.replace('#include <tonemapping_fragment>',`
            float caustic=pow(.5+.5*sin(echoPosition.y*34.+echoSeconds*1.3+sin(echoPosition.x*28.-echoSeconds)),5.);
            gl_FragColor.rgb+=vec3(.08,.48,.43)*caustic*echoWater*.42;
            #include <tonemapping_fragment>`);
        };
        material.customProgramCacheKey=()=>key+'-echo-water-caustics-v1';
      }else if(material instanceof ShaderMaterial&&material.uniforms.strength){
        lights.push({uniform:material.uniforms.strength,base:material.uniforms.strength.value});
      }
    }
  });
  return (nightGain:number,waterGain:number,time:number)=>{
    emission.forEach(({material,base})=>{material.emissiveIntensity=base*nightGain;});
    lights.forEach(({uniform,base})=>{uniform.value=base*nightGain;});water.value=waterGain;seconds.value=time;
  };
}
