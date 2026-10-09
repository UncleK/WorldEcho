import {Quaternion,Vector3} from 'three';

export function arcballPoint(x:number,y:number,width:number,height:number){
  const radius=Math.max(1,Math.min(width,height)/2),px=(x-width/2)/radius,py=(height/2-y)/radius;
  const length=px*px+py*py;
  return new Vector3(px,py,length<=1?Math.sqrt(1-length):0).normalize();
}
export function arcballRotation(from:Vector3,to:Vector3,cameraRotation:Quaternion,zoom=1){
  const local=new Quaternion().setFromUnitVectors(from,to).invert();
  const angle=2*Math.acos(Math.min(1,Math.max(-1,local.w)));
  if(angle<1e-8)return new Quaternion();
  const axis=new Vector3(local.x,local.y,local.z).normalize().applyQuaternion(cameraRotation);
  return new Quaternion().setFromAxisAngle(axis,angle/Math.max(1,zoom));
}

const FOLLOW_TIME=.045,REST_TIME=.065,COAST_TIME=.085,EPSILON=1e-7;

/** Accumulate input independently of display frames, with a short bounded coast. */
export class ArcballMotion {
  private current=new Quaternion();
  private target=new Quaternion();
  private velocity=new Vector3();
  private inputVelocity=new Vector3();
  private rotation=new Quaternion();
  private inverse=new Quaternion();
  private axis=new Vector3();
  private lastInput=0;
  private travel=0;
  dragging=false;

  get pending(){return this.current.angleTo(this.target)>EPSILON||(!this.dragging&&this.velocity.lengthSq()>EPSILON*EPSILON);}
  stop(){this.current.identity();this.target.identity();this.velocity.set(0,0,0);this.travel=0;this.dragging=false;}
  begin(now:number){this.stop();this.dragging=true;this.lastInput=now;}
  push(rotation:Quaternion,now:number){
    this.target.premultiply(rotation).normalize();
    const angle=2*Math.acos(Math.min(1,Math.max(-1,rotation.w))),delta=Math.max(.004,Math.min(.1,(now-this.lastInput)/1000));
    this.travel+=angle;
    if(angle>EPSILON){
      this.inputVelocity.set(rotation.x,rotation.y,rotation.z).normalize().multiplyScalar(angle/delta);
      this.velocity.lerp(this.inputVelocity,1-Math.exp(-delta/.025));
    }else this.velocity.set(0,0,0);
    this.lastInput=now;
  }
  viewRotation(cameraRotation:Quaternion){
    return this.rotation.copy(this.target).multiply(this.inverse.copy(this.current).invert()).multiply(cameraRotation).normalize();
  }
  release(now:number,zoom:number,reducedMotion=false){
    this.dragging=false;
    if(reducedMotion||now-this.lastInput>80)this.velocity.set(0,0,0);
    else this.velocity.clampLength(0,Math.min(this.travel*.35,.12/Math.max(1,zoom))/COAST_TIME);
  }
  advance(delta:number,reducedMotion=false):Quaternion|null{
    if(reducedMotion)this.velocity.set(0,0,0);
    if(!this.pending)return null;
    const dt=Math.max(0,Math.min(.05,delta));
    if(!this.dragging&&!reducedMotion&&this.velocity.lengthSq()>EPSILON*EPSILON){
      const decay=Math.exp(-dt/COAST_TIME),speed=this.velocity.length();
      this.axis.copy(this.velocity).divideScalar(speed);
      this.target.premultiply(this.rotation.setFromAxisAngle(this.axis,speed*COAST_TIME*(1-decay))).normalize();
      this.velocity.multiplyScalar(decay);
      if(this.velocity.length()<.0001)this.velocity.set(0,0,0);
    }
    this.inverse.copy(this.current).invert();
    this.current.slerp(this.target,reducedMotion?1:1-Math.exp(-dt/(this.dragging?FOLLOW_TIME:REST_TIME)));
    if(this.current.angleTo(this.target)<EPSILON)this.current.copy(this.target);
    return this.rotation.copy(this.current).multiply(this.inverse).normalize();
  }
}
