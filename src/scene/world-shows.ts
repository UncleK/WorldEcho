import { Quaternion, Vector3 } from 'three';
import { geoNormal, geoEast, geoNorth } from './geo.ts';
import { smoothFlight, type HatFlightTower } from './hat-flight.ts';
export type WorldShowKind='party'|'water';
export const WORLD_SHOW_DURATION={party:9.6,water:10.6};
export interface WorldShowPlan {
  origin:HatFlightTower; normal:Vector3; endNormal:Vector3; extent:number;
  arrivals:Map<string,number>; kind:WorldShowKind;
}
export function sphereBlend(a:Vector3,b:Vector3,p:number){
  return a.clone().applyQuaternion(new Quaternion().slerp(new Quaternion().setFromUnitVectors(a,b),Math.max(0,Math.min(1,p)))).normalize();
}
export function createWorldShowPlan(towers:HatFlightTower[],origin:HatFlightTower|undefined,kind:WorldShowKind):WorldShowPlan{
  const start=origin??towers[0]??{id:'empty',lat:0,lon:0,height:.1,radius:1.0045},normal=geoNormal(start.lat,start.lon);
  const angles=towers.map(tower=>({tower,angle:normal.angleTo(geoNormal(tower.lat,tower.lon))}));
  const extent=Math.max(.12,...angles.map(entry=>entry.angle));
  const travel=kind==='party'?4.7:6.3;
  const arrivals=new Map(angles.map(({tower,angle})=>[tower.id,.35+angle/extent*travel]));
  // Frame the populated region rather than a preset continent or fixed tower count.
  let weightSum=0,latitude=0;const mean=new Vector3();
  for(const tower of towers){const weight=Math.sqrt(Math.max(.01,tower.height));weightSum+=weight;latitude+=tower.lat*weight;mean.addScaledVector(geoNormal(0,tower.lon),weight);}
  const endNormal=weightSum&&mean.lengthSq()>.01?geoNormal(latitude/weightSum,Math.atan2(mean.x,mean.z)*180/Math.PI):normal.clone();
  return {origin:start,normal,endNormal,extent,arrivals,kind};
}
export function showWaveAngle(plan:WorldShowPlan,age:number){return Math.max(0,Math.min(plan.extent,(age-.35)/(plan.kind==='party'?4.7:6.3)*plan.extent));}
export function showActivation(age:number,arrival:number,reduced=false){return reduced?1:smoothFlight((age-arrival)/.65);}
export function worldShowPose(plan:WorldShowPlan,age:number,overviewRadius:number){
  const water=plan.kind==='water',duration=WORLD_SHOW_DURATION[plan.kind],p=smoothFlight((age-.8)/(duration-.8));
  const east=geoEast(plan.origin.lon),north=geoNorth(plan.origin.lat,plan.origin.lon);
  const direction=sphereBlend(plan.normal,plan.endNormal,p);
  const turn=water?.28*Math.sin(p*Math.PI):.55*Math.sin(p*Math.PI*1.5);
  const radius=(water?1.28:1.5)+(overviewRadius-(water?1.28:1.5))*smoothFlight(p*1.35);
  const position=direction.multiplyScalar(radius).addScaledVector(east,turn).addScaledVector(north,(water?.10:.22)*Math.sin(Math.PI*p));
  const target=plan.normal.clone().multiplyScalar((water?.82:.65)*(1-smoothFlight(p*1.5)));
  const up=sphereBlend(north,new Vector3(0,1,0),smoothFlight(p*1.5));
  return {position,target,up,end:age>=duration};
}
