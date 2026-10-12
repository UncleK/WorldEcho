/** Keep a normal lens when pulling away; magnify only after the lens reaches 1x. */
export function globeZoomPose(current:number,next:number,distance:number,surfaceRadius:number){
  const oldPullback=1/Math.min(1,current),newPullback=1/Math.min(1,next);
  return {zoom:Math.max(1,next),distance:surfaceRadius+Math.max(.03,distance-surfaceRadius)*newPullback/oldPullback};
}

/** Angular travel follows the visible ground span, especially at close range. */
export function globeDragSpeed(radius:number,lensZoom:number,overviewRadius:number,surfaceRadius:number,mobile:boolean){
  const span=Math.max(.025,Math.min(1,(radius-surfaceRadius)/Math.max(.1,overviewRadius-surfaceRadius)));
  return (mobile?.48:.85)*span/Math.max(1,lensZoom);
}
