import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {globeZoomAfterFactor,globeCloseView,MAX_GLOBE_ZOOM} from './globe-zoom.ts';

test('optical magnification enlarges a small model without crossing the surface safety boundary',()=>{
  const camera=new PerspectiveCamera(48,1,.004,100);
  camera.position.set(0,0,1.03);camera.lookAt(0,0,1.01);camera.updateMatrixWorld();
  const position=camera.position.clone(),point=new Vector3(.001,0,1.01);
  const initial=point.clone().project(camera).x;
  camera.zoom=12;camera.updateProjectionMatrix();
  assert.ok(point.clone().project(camera).x>initial*11.9);
  assert.deepEqual(camera.position,position);assert.ok(camera.position.length()>1.0045);
});
test('continued zoom is bounded, reversible and reset-independent of model geometry',()=>{
  let zoom=1;for(let i=0;i<50;i++)zoom=globeZoomAfterFactor(zoom,.82);
  assert.equal(zoom,MAX_GLOBE_ZOOM);assert.equal(globeZoomAfterFactor(zoom,2),zoom/2);
  assert.equal(globeZoomAfterFactor(zoom,NaN),zoom);assert.equal(globeZoomAfterFactor(zoom,0),zoom);
});
test('close satellite material is requested for optical zoom as well as physically near views',()=>{
  assert.equal(globeCloseView(3,1),false);assert.equal(globeCloseView(3,4),true);
  assert.equal(globeCloseView(1.3,1),true);
});
