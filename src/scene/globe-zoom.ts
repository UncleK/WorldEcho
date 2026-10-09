export const MIN_GLOBE_ZOOM = .25;
export const MAX_GLOBE_ZOOM = 96;

/** Lens magnification does not move the camera through the globe surface. */
export function globeZoomAfterFactor(current:number,factor:number){
  if(!Number.isFinite(factor)||factor<=0)return current;
  return Math.max(MIN_GLOBE_ZOOM,Math.min(MAX_GLOBE_ZOOM,current/factor));
}
export function globeCloseView(cameraRadius:number,zoom:number){
  return Math.max(0,cameraRadius-1)/Math.max(1,zoom)<.8;
}
