import {
  ACESFilmicToneMapping, DirectionalLight, HemisphereLight, OrthographicCamera,
  PMREMGenerator, Scene, WebGLRenderer, Mesh, Box3, Vector3, PCFSoftShadowMap, type Material,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { ModelKey, ModelView } from '../types';
import { createTowerModel } from './tower-model';

/** All towers use the same front camera, display height, transparent background and studio light. */
export function renderTowerPortrait(key: ModelKey, width = 960, height = 1320, view:ModelView='front'): HTMLCanvasElement {
  const natural=['ca-beloeil-cypress-tree','us-kings-island-ohio-eiffel-tower-topiary','us-gasquet-gasquet-market'].includes(key);
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.88;
  renderer.shadowMap.enabled=natural;
  renderer.shadowMap.type=PCFSoftShadowMap;
  const shaderErrors:string[]=[];
  renderer.debug.onShaderError=(gl,program,vertex,fragment)=>shaderErrors.push([gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertex),gl.getShaderInfoLog(fragment)].filter(Boolean).join('\n'));
  const scene = new Scene();
  scene.background = null;
  const room = new RoomEnvironment();
  const generator = new PMREMGenerator(renderer);
  const environment = generator.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = natural?0.23:0.35;
  room.dispose();
  generator.dispose();

  scene.add(new HemisphereLight('#e9f1fa', '#716354', natural?0.25:0.45));
  const keyLight = new DirectionalLight('#fff1df', natural?2:1.7);
  keyLight.position.set(-2.5, 3.5, 4);
  if(natural){
    keyLight.target.position.set(0,.5,0);scene.add(keyLight.target);
    keyLight.castShadow=true;keyLight.shadow.mapSize.set(2048,2048);
    Object.assign(keyLight.shadow.camera,{left:-.95,right:.95,top:.95,bottom:-.95,near:.1,far:10});
    keyLight.shadow.camera.updateProjectionMatrix();keyLight.shadow.bias=-.000035;keyLight.shadow.normalBias=.00035;
  }
  const fill = new DirectionalLight('#dce7f4', natural?0.28:0.4);
  fill.position.set(3, 1.5, 2);
  const edge = new DirectionalLight('#f7eddf', natural?1:0.85);
  edge.position.set(-1, 2, -3);
  scene.add(keyLight, fill, edge);
  const model = createTowerModel(key, 'detail');
  scene.add(model);

  const span = view==='axonometric'?1.3:1.17;
  const aspect = width / height;
  const camera = new OrthographicCamera(-span * aspect / 2, span * aspect / 2, span / 2, -span / 2, 0.01, 10);
  if(view==='axonometric')camera.position.set(2.1,1.8,2.8);
  else if(view==='side')camera.position.set(3,0.5,0);
  else camera.position.set(0, 0.5, 3);
  camera.lookAt(0, 0.5, 0);
  // Wide sculptures and completed bases also need all feet in frame. Keep
  // the standard camera whenever the projected bounds already fit.
  {
    camera.updateMatrixWorld(true);
    const box=new Box3().setFromObject(model);let extentX=0,extentY=0;
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      const point=new Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);
      extentX=Math.max(extentX,Math.abs(point.x));extentY=Math.max(extentY,Math.abs(point.y));
    }
    const fittedSpan=Math.max(span,2*extentX/aspect*1.05,2*extentY*1.05);
    camera.left=-fittedSpan*aspect/2;camera.right=fittedSpan*aspect/2;
    camera.top=fittedSpan/2;camera.bottom=-fittedSpan/2;camera.updateProjectionMatrix();
  }
  renderer.render(scene, camera);
  if(shaderErrors.length)throw new Error(`Portrait shader failed for ${key}: ${shaderErrors.join('\n')}`);

  const canvas = document.createElement('canvas');
  canvas.id = 'portrait-canvas';
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Portrait canvas could not be created');
  context.drawImage(renderer.domElement, 0, 0);

  const materials = new Set<Material>();
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  materials.forEach((material) => material.dispose());
  keyLight.shadow.dispose();
  environment.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return canvas;
}
