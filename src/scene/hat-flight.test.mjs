import test from 'node:test';
import assert from 'node:assert/strict';
import { createHatFlightPlan, hatChasePose, hatFlightProgress, HAT_FLIGHT_START, HAT_FLIGHT_DURATION, HAT_FLIGHT_END } from './hat-flight.ts';
const places=[['us-paris-texas',33.64,-95.52,.09],['tennessee',36.3,-88.3,.1],['paris',48.86,2.29,.32],['greece',37.15,21.58,.12],['delhi',28.6,77.2,.12],['hangzhou',30.29,120.2,.24],['bamboo',-7.27,110.45,.08],['brazil',-22,-45,.1],['australia',-27,153,.1]].map(([id,lat,lon,height])=>({id,lat,lon,height,radius:1.0045}));
test('every hat waits for its own light branch to reach its tower',()=>{
  const plan=createHatFlightPlan(places);
  for(const tower of places){const v=plan.visits.get(tower.id);assert.ok(v);assert.ok(v.arrival>v.departure);assert.ok(v.arrival<=HAT_FLIGHT_END+.8);
    const main=plan.curve.getPointAt(hatFlightProgress(v.departure));assert.ok(main.distanceTo(v.curve.getPointAt(0))<.001);
    assert.ok(Math.abs(v.curve.getPointAt(1).length()-(tower.radius+tower.height*1.01))<1e-6);
  }
  assert.ok(plan.visits.get('tennessee').arrival<plan.visits.get('paris').arrival);
  assert.ok(plan.visits.get('paris').arrival<plan.visits.get('hangzhou').arrival);
});
test('chase poses remain continuous outside the globe and look ahead of the camera',()=>{
  const plan=createHatFlightPlan(places);let previous=null;
  for(let i=0;i<=720;i++){const pose=hatChasePose(plan,HAT_FLIGHT_START+HAT_FLIGHT_DURATION*i/720);
    assert.ok(pose.position.length()>1.05);assert.ok(pose.target.distanceTo(pose.position)>.005);assert.ok(Math.abs(pose.up.length()-1)<1e-6);
    if(previous)assert.ok(pose.position.distanceTo(previous)<.055,'no camera teleport across a segment');previous=pose.position;
  }
});
test('filtered or empty worlds still produce finite routes',()=>{
  for(const towers of [[],places.slice(0,1)]){const plan=createHatFlightPlan(towers);for(let i=0;i<=20;i++){const p=plan.curve.getPointAt(i/20);assert.ok(p.toArray().every(Number.isFinite));assert.ok(p.length()>1.04);}}
});
