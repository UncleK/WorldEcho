import { CatmullRomCurve3, Quaternion, Vector3 } from 'three';
import { geoNormal } from './geo.ts';

export const HAT_FLIGHT_START = .42;
export const HAT_FLIGHT_DURATION = 7.2;
export const HAT_FLIGHT_END = HAT_FLIGHT_START + HAT_FLIGHT_DURATION;
export const HAT_SHOW_END = 10.8;
export interface HatFlightTower { id: string; lat: number; lon: number; height: number; radius: number }
export interface HatVisit { departure: number; arrival: number; curve: CatmullRomCurve3 }
export interface HatFlightPlan { curve: CatmullRomCurve3; visits: Map<string, HatVisit>; endNormal: Vector3 }
export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export const smoothFlight = (value: number) => { const p=clamp01(value); return p*p*(3-2*p); };
export const hatFlightProgress = (age: number) => clamp01((age-HAT_FLIGHT_START)/HAT_FLIGHT_DURATION);

/** One geographic path drives the light, chase camera, branches and hat arrival times. */
export function createHatFlightPlan(towers: HatFlightTower[],origin?:HatFlightTower): HatFlightPlan {
  const source=origin??towers.find(t=>t.id==='us-paris-texas')??towers[0]??{id:'origin',lat:0,lon:0,height:.09,radius:1.0045};
  const sectors=Math.max(3,Math.ceil(Math.sqrt(towers.length))),buckets=new Map<number,HatFlightTower[]>();
  for(const tower of towers){if(tower.id===source.id)continue;const bucket=Math.floor(((tower.lon-source.lon+360)%360)/360*sectors);const values=buckets.get(bucket)??[];values.push(tower);buckets.set(bucket,values);}
  const stops=[...buckets.entries()].sort(([a],[b])=>a-b).map(([,values])=>{
    const centre=values.reduce((sum,t)=>sum.add(geoNormal(t.lat,t.lon)),new Vector3()).normalize();
    return [...values].sort((a,b)=>(centre.angleTo(geoNormal(a.lat,a.lon))-a.height*.15)-(centre.angleTo(geoNormal(b.lat,b.lon))-b.height*.15)||a.id.localeCompare(b.id))[0];
  });
  const waypoints=[source,...stops];
  if(waypoints.length<2)waypoints.push({id:'end',lat:source.lat+8,lon:source.lon+25,height:.1,radius:1.0045});
  const samples:Vector3[]=[], normals=towers.map(t=>({normal:geoNormal(t.lat,t.lon),top:t.radius+t.height}));
  for(let segment=0;segment<waypoints.length-1;segment++){
    const a=waypoints[segment],b=waypoints[segment+1],na=geoNormal(a.lat,a.lon),nb=geoNormal(b.lat,b.lon),angle=na.angleTo(nb);
    const steps=Math.max(14,Math.ceil(angle*55));
    for(let j=segment?1:0;j<=steps;j++){
      const p=j/steps;
      const normal=na.clone().applyQuaternion(new Quaternion().slerp(new Quaternion().setFromUnitVectors(na,nb),p)).normalize();
      let radius=Math.max(1.09,(a.radius+a.height)*(1-p)+(b.radius+b.height)*p+.05+Math.sin(p*Math.PI)*.07);
      // Clear the roofline of nearby displayed towers, including a taller clustered neighbour.
      for(const entry of normals){const separation=normal.angleTo(entry.normal);if(separation<.16)radius=Math.max(radius,entry.top+.05-separation*.35);}
      samples.push(normal.multiplyScalar(radius));
    }
  }
  const curve=new CatmullRomCurve3(samples,false,'centripetal');curve.arcLengthDivisions=1024;curve.updateArcLengths();
  const routeSamples=Array.from({length:321},(_,i)=>curve.getPointAt(i/320)),visits=new Map<string,HatVisit>();
  for(const tower of towers){
    const normal=geoNormal(tower.lat,tower.lon);let nearest=0,distance=Infinity;
    for(let i=0;i<routeSamples.length;i++){const d=normal.angleTo(routeSamples[i].clone().normalize());if(d<distance){distance=d;nearest=i;}}
    const progress=nearest/320,departure=HAT_FLIGHT_START+progress*HAT_FLIGHT_DURATION;
    const start=routeSamples[nearest],startNormal=start.clone().normalize(),tip=normal.clone().multiplyScalar(tower.radius+tower.height*1.01);
    const points=[start.clone()];
    for(let i=1;i<12;i++){
      const p=i/12;
      const n=startNormal.clone().applyQuaternion(new Quaternion().slerp(new Quaternion().setFromUnitVectors(startNormal,normal),p)).normalize();
      points.push(n.multiplyScalar(start.length()*(1-p)+tip.length()*p+Math.sin(Math.PI*p)*(.04+Math.min(.20,distance*.10))));
    }
    points.push(tip);
    const duration=.16+Math.min(.60,distance*.30);
    visits.set(tower.id,{departure,arrival:departure+duration,curve:new CatmullRomCurve3(points,false,'centripetal')});
  }
  return {curve,visits,endNormal:geoNormal(waypoints.at(-1)!.lat,waypoints.at(-1)!.lon)};
}

export function hatChasePose(plan:HatFlightPlan,age:number){
  const p=hatFlightProgress(age),position=plan.curve.getPointAt(clamp01(p-.065)),target=plan.curve.getPointAt(clamp01(p+.005));
  const up=position.clone().normalize(),tangent=plan.curve.getTangentAt(clamp01(p-.065)),side=new Vector3().crossVectors(tangent,up).normalize();
  position.addScaledVector(up,.075).addScaledVector(side,-.055);
  target.addScaledVector(target.clone().normalize(),-.095);
  up.applyAxisAngle(tangent,Math.sin(p*Math.PI*3)*.035);
  return {position,target,up};
}
