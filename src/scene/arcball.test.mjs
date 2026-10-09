import test from 'node:test';
import assert from 'node:assert/strict';
import {Quaternion,Vector3} from 'three';
import {arcballPoint,arcballRotation,ArcballMotion} from './arcball.ts';

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

test('sparse input is interpolated across frames, with a bounded coast and a finite stop',()=>{
  const motion=new ArcballMotion(),up=new Vector3(0,1,0),turn=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),.12);
  motion.begin(0);motion.push(turn,40);
  const first=motion.advance(1/60).clone(),second=motion.advance(1/60).clone();
  assert.ok(first.angleTo(new Quaternion())>0&&first.angleTo(turn)>0);
  assert.ok(second.angleTo(new Quaternion())>0);
  motion.release(45,1);let rotation=first.clone().premultiply(second),frames=0;
  while(motion.pending&&frames++<120){const delta=motion.advance(1/60);if(delta)rotation.premultiply(delta);}
  assert.ok(frames<100);assert.ok(rotation.angleTo(new Quaternion())>.12);
  assert.ok(rotation.angleTo(new Quaternion())<=.12*1.35+1e-6);
  assert.ok(up.clone().applyQuaternion(rotation).equals(up));
});

test('coasting is independent of display refresh and pauses do not cause a stale throw',()=>{
  const run=hz=>{const motion=new ArcballMotion(),total=new Quaternion();motion.begin(0);motion.push(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),.08),40);motion.release(45,1);for(let i=0;i<hz;i++){const delta=motion.advance(1/hz);if(delta)total.premultiply(delta);}return total;};
  assert.ok(run(30).angleTo(run(120))<1e-5);
  const motion=new ArcballMotion();motion.begin(0);motion.push(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),.08),40);motion.advance(1/60,true);motion.release(200,1);
  assert.equal(motion.pending,false);
});

test('reset, reduced motion and high-magnification release constrain inertial movement',()=>{
  const motion=new ArcballMotion(),turn=new Quaternion().setFromAxisAngle(new Vector3(0,0,1),.001);
  motion.begin(0);motion.push(turn,10);motion.release(15,96);let total=new Quaternion();
  for(let i=0;i<120&&motion.pending;i++){const delta=motion.advance(1/60);if(delta)total.premultiply(delta);}
  assert.ok(total.angleTo(new Quaternion())<=.001*1.35+1e-6);
  motion.begin(0);motion.push(turn,10);motion.release(15,1);motion.advance(1/60,true);assert.equal(motion.pending,false);
  motion.begin(0);motion.push(turn,10);motion.stop();assert.equal(motion.advance(1/60),null);
});
