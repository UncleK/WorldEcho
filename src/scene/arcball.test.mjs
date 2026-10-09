import test from 'node:test';
import assert from 'node:assert/strict';
import {Quaternion,Vector3} from 'three';
import {arcballPoint,arcballRotation} from './arcball.ts';

test('trackball rotation changes the up basis and can cross both poles without changing camera radius',()=>{
  const position=new Vector3(0,0,3),up=new Vector3(0,1,0),rotation=new Quaternion();
  const from=arcballPoint(400,600,800,800),to=arcballPoint(400,200,800,800);
  for(let i=0;i<4;i++){const q=arcballRotation(from,to,rotation,1);position.applyQuaternion(q);up.applyQuaternion(q);}
  assert.ok(Math.abs(position.length()-3)<1e-9);assert.ok(up.distanceTo(new Vector3(0,1,0))>.2);
});
test('deep magnification slows rotation and a stationary pointer does not move the view',()=>{
  const a=arcballPoint(300,400,800,800),b=arcballPoint(500,400,800,800),basis=new Quaternion();
  const angle=q=>2*Math.acos(q.w);
  assert.ok(Math.abs(angle(arcballRotation(a,b,basis,20))*20-angle(arcballRotation(a,b,basis,1)))<1e-8);
  assert.ok(arcballRotation(a,a,basis).equals(new Quaternion()));
});
