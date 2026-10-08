import type {EffectName} from '../playground/play-state';
export interface PlayRuntime {age:number;effect:EffectName|null;cancelled:boolean;seconds:number;started:Record<EffectName,number>}
export function effectSeconds(runtime:PlayRuntime,effect:EffectName,reduced=false){return reduced?99:Math.max(0,runtime.seconds-runtime.started[effect]);}
