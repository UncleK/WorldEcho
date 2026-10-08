import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, PerspectiveCamera, ShaderMaterial, Vector3 } from 'three';
import { advanceFocusOpacity, findFocusOccluders, installFocusFade } from './focus-occlusion.ts';

function tower(x=0,z=0){
  const group=new Group(),body=new Group();group.position.set(x,0,z);
  body.userData.bodyPickProxy=true;
  body.userData.bodyPickVolumes=[new Box3(new Vector3(-.1,0,-.1),new Vector3(.1,1,.1))];
  group.add(body);group.updateMatrixWorld(true);return group;
}
function camera(){const c=new PerspectiveCamera(50,1,.01,50);c.position.set(0,.5,5);c.lookAt(0,.5,0);c.updateMatrixWorld();return c;}

test('only structures in front of the selected silhouette fade, never nearby structures behind or beside it',()=>{
  const groups=new Map([['selected',tower()],['front',tower(0,1)],['behind',tower(0,-1)],['side',tower(1,1)]]);
  const transforms=[...groups].map(([id,g])=>[id,g.position.toArray(),g.scale.toArray()]);
  assert.deepEqual([...findFocusOccluders(groups,'selected',camera())],['front']);
  assert.deepEqual([...groups].map(([id,g])=>[id,g.position.toArray(),g.scale.toArray()]),transforms);
  groups.get('front').position.x=2;
  assert.equal(findFocusOccluders(groups,'selected',camera()).size,0);
});

test('offscreen and unmodeled selections do not fade the scene; lower interaction targets are considered',()=>{
  const groups=new Map([['selected',tower(10)],['front',tower(10,1)]]);
  assert.equal(findFocusOccluders(groups,'selected',camera()).size,0);
  groups.set('marker',new Group());assert.equal(findFocusOccluders(groups,'marker',camera()).size,0);
  const selected=tower(),lower=tower(0,1);
  lower.children[0].userData.bodyPickVolumes=[new Box3(new Vector3(-.1,.05,-.1),new Vector3(.1,.15,.1))];
  const local=new Map([['selected',selected],['lower',lower]]);
  assert.equal(findFocusOccluders(local,'selected',camera()).size,0);
  assert.deepEqual([...findFocusOccluders(local,'selected',camera(),new Vector3(0,0,0))],['lower']);
});

test('focus fade restores original blending, depth and shadows without overriding animated opacity or dimensions',()=>{
  const group=new Group(),material=new MeshStandardMaterial({opacity:.8}),geometry=new BoxGeometry();
  const mesh=new Mesh(geometry,material);mesh.castShadow=true;group.add(mesh);
  const fade=installFocusFade(group),shader={uniforms:{},fragmentShader:'void main(){\n#include <opaque_fragment>\n}'};
  material.onBeforeCompile(shader,{});
  fade(.2);assert.equal(shader.uniforms.focusOpacity.value,.2);assert.equal(material.transparent,true);assert.equal(material.depthWrite,false);assert.equal(mesh.castShadow,false);
  material.opacity=.65;fade(.3);assert.equal(material.opacity,.65);assert.deepEqual(mesh.scale.toArray(),[1,1,1]);
  fade(1);assert.equal(material.transparent,false);assert.equal(material.depthWrite,true);assert.equal(mesh.castShadow,true);assert.equal(material.opacity,.65);
  geometry.dispose();material.dispose();
});

test('custom night lights and existing shader hooks retain their animation while fading',()=>{
  const group=new Group(),material=new ShaderMaterial({transparent:true,depthWrite:false,uniforms:{strength:{value:1}}}),geometry=new BoxGeometry();
  material.onBeforeCompile=shader=>{shader.uniforms.otherEffect={value:7};};
  group.add(new Mesh(geometry,material));const fade=installFocusFade(group);
  const shader={uniforms:{},fragmentShader:'void main(){gl_FragColor=vec4(1.); }'};
  material.onBeforeCompile(shader,{});fade(.2);
  assert.equal(shader.uniforms.otherEffect.value,7);assert.equal(material.uniforms.strength.value,1);
  assert.match(shader.fragmentShader,/gl_FragColor\.a \*= focusOpacity/);
  fade(1);assert.equal(material.transparent,true);assert.equal(material.depthWrite,false);
  geometry.dispose();material.dispose();
});

test('the last demand frame fully restores opaque rendering and shadows',()=>{
  const group=new Group(),material=new MeshStandardMaterial(),geometry=new BoxGeometry();
  const mesh=new Mesh(geometry,material);mesh.castShadow=true;group.add(mesh);const fade=installFocusFade(group);
  let opacity=.2;assert.equal(fade(opacity),true);
  for(let frame=0;frame<100&&Math.abs(1-opacity)>=.002;frame++){
    opacity=advanceFocusOpacity(opacity,1,1/60);fade(opacity);
  }
  assert.equal(opacity,1);assert.equal(material.transparent,false);assert.equal(material.depthWrite,true);assert.equal(mesh.castShadow,true);
  assert.equal(fade(1),false);assert.equal(advanceFocusOpacity(.2,1,0,true),1);
  geometry.dispose();material.dispose();
});
