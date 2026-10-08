import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldShowPlan,showWaveAngle,showActivation,worldShowPose} from './world-shows.ts';
import {createHatFlightPlan} from './hat-flight.ts';
import {geoNormal} from './geo.ts';
const makeTowers=n=>Array.from({length:n},(_,i)=>({id:`new-tower-${i}`,lat:Math.sin(i*2.399)*67,lon:(i*137.508)%360-180,height:.05+(i%11)*.02,radius:1.0045}));
test('new towers of arbitrary identity automatically join all three shows',()=>{
  for(const count of [1,17,83,237]){
    const towers=makeTowers(count),hat=createHatFlightPlan(towers);
    assert.equal(hat.visits.size,count);
    for(const kind of ['party','water']){const plan=createWorldShowPlan(towers,towers[0],kind);assert.equal(plan.arrivals.size,count);
      for(const tower of towers){const arrival=plan.arrivals.get(tower.id),angle=geoNormal(tower.lat,tower.lon).angleTo(plan.normal);
        assert.ok(Math.abs(showWaveAngle(plan,arrival)-angle)<1e-6);assert.equal(showActivation(arrival-.1,arrival),0);assert.equal(showActivation(arrival+1,arrival),1);
      }
    }
  }
});
test('filters remove participants and route generation is catalog-order independent',()=>{
  const towers=makeTowers(53),filtered=towers.filter((_,i)=>i%3===0),origin=towers[0];
  const a=createHatFlightPlan(filtered,origin),b=createHatFlightPlan([...filtered].reverse(),origin);
  assert.deepEqual([...a.visits.keys()].sort(),filtered.map(t=>t.id).sort());
  for(let i=0;i<=20;i++)assert.ok(a.curve.getPointAt(i/20).distanceTo(b.curve.getPointAt(i/20))<1e-6);
});
test('distinct camera shows stay finite for empty and populated worlds',()=>{
  for(const towers of [[],makeTowers(71)])for(const kind of ['party','water']){const plan=createWorldShowPlan(towers,towers[0],kind);let previous;
    for(let i=0;i<=700;i++){const pose=worldShowPose(plan,i/60,3);assert.ok(pose.position.length()>1.05);assert.ok(pose.target.toArray().every(Number.isFinite));if(previous)assert.ok(pose.position.distanceTo(previous)<.08);previous=pose.position;}
  }
});
