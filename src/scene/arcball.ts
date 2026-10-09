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
