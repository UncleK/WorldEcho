import test from 'node:test';
import assert from 'node:assert/strict';
import { createTowerModel, setTowerRenderStyle } from './tower-model.ts';

const dispose = model => model.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
const body = model => model.children.filter(o=>!o.userData.displayDecoration);
const shader = material => { const s={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <emissivemap_fragment>'};material.onBeforeCompile(s,null);return {v:s.vertexShader,f:s.fragmentShader}; };
test('in-place styles preserve structural buffers and match fresh recipes, including bands and split batches',()=>{
  for(const key of ['paris','texas','las-vegas','shenzhen','id-rawa-pening-bamboo','us-gasquet-gasquet-market','ca-beloeil-cypress-tree','dk-taastrup-taastrup-eiffel-tower','cz-police-nad-metuji-tower-beside-a-toy-store']) {
    const model=createTowerModel(key,'overview','heritage');
    const geometries=body(model).map(o=>o.geometry),positions=geometries.map(g=>g.attributes.position),indices=geometries.map(g=>g.index);
    for(const style of ['metal','porcelain','blueprint','illuminated','heritage','illuminated','heritage']) {
      setTowerRenderStyle(model,style);
      const fresh=createTowerModel(key,'overview',style);
      assert.deepEqual(body(model).map(o=>o.geometry),geometries,`${key} geometry identity`);
      body(model).forEach((o,i)=>{
        assert.equal(o.geometry.attributes.position,positions[i]);assert.equal(o.geometry.index,indices[i]);
        const expected=body(fresh)[i];
        for(const p of ['color','emissive'])assert.deepEqual(o.material[p].toArray(),expected.material[p].toArray(),`${key} ${style} ${p}`);
        for(const p of ['opacity','roughness','metalness','emissiveIntensity','transparent','depthWrite','clearcoat'])assert.equal(o.material[p],expected.material[p],`${key} ${style} ${p}`);
        assert.deepEqual(shader(o.material),shader(expected.material));
        for(const attr of ['color',...(style==='illuminated'?['nightTint']:[])]) {
          const a=o.geometry.attributes[attr].array,b=expected.geometry.attributes[attr].array;
          assert.equal(a.length,b.length);
          let max=0;for(let j=0;j<a.length;j++)max=Math.max(max,Math.abs(a[j]-b[j]));
          assert.ok(max<.00001,`${key} ${style} ${attr}: ${max}`);
        }
      });
      assert.equal(model.userData.triangleCount,fresh.userData.triangleCount);
      assert.equal(model.userData.vertexCount,fresh.userData.vertexCount);
      assert.equal(model.children.length,fresh.children.length);
      dispose(fresh);
    }
    dispose(model);
  }
});
