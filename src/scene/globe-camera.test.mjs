import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {globeZoomPose,globeDragSpeed} from './globe-camera.ts';

test('Zooming out from a close-up retreats instead of opening an extreme wide-angle lens',()=>{
 const close=1.12,pose=globeZoomPose(1,.25,close,1);assert.equal(pose.zoom,1);assert.ok(pose.distance>close);
 const returned=globeZoomPose(.25,1,pose.distance,1);assert.ok(Math.abs(returned.distance-close)<1e-12);
 const oldCamera=new PerspectiveCamera(48,1,.004,100);oldCamera.zoom=.25;
 const normalCamera=new PerspectiveCamera(42,1,.004,100);normalCamera.zoom=pose.zoom;
 assert.ok(oldCamera.getEffectiveFOV()>120);assert.equal(normalCamera.getEffectiveFOV(),42);
});
test('Lens and retreat handoff is continuous and magnification remains reversible',()=>{
 let zoom=1,distance=3;for(const next of [.99,.5,.25,.5,.99,1,2,12,96,12,1]){const p=globeZoomPose(zoom,next,distance,1);distance=p.distance;zoom=next;assert.ok(p.zoom>=1&&p.zoom<=96);}
 assert.ok(Math.abs(distance-3)<1e-12);const a=globeZoomPose(1,1-1e-7,3,1);assert.ok(Math.abs(a.distance-3)<1e-6);
});
test('Responsive drag slows near the surface and compensates for optical magnification',()=>{
 const overview=globeDragSpeed(4,1,4,1,true),close=globeDragSpeed(1.15,1,4,1,true);
 assert.ok(overview<.5);assert.ok(close<overview*.1);
 const camera=new PerspectiveCamera(42,1,.004,100);camera.position.set(0,0,4);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const movement=z=>{camera.zoom=z;camera.updateProjectionMatrix();const angle=globeDragSpeed(4,z,4,1,true)*.02;return new Vector3(Math.sin(angle),0,Math.cos(angle)).project(camera).x;};
 const ratio=movement(12)/movement(1);assert.ok(ratio>.99&&ratio<1.01);
});
