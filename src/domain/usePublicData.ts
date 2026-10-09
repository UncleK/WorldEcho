import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { selectPublicSnapshot } from './public-snapshot.mjs';
interface VersionedData { generatedAt?: string; communityRevision?: number }
export function usePublicData<T extends VersionedData>(url:string) {
  const [data,setData]=useState<T|null>(null),[error,setError]=useState<string|null>(null);
  const loaded=useRef(false);
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();let pending=false;
    const load=async()=>{
      if(pending||controller.signal.aborted)return;pending=true;
      const request=new AbortController();const abort=()=>request.abort();controller.signal.addEventListener('abort',abort,{once:true});
      let timeout=setTimeout(abort,45000);const maximum=setTimeout(abort,120000);
      const progress=()=>{clearTimeout(timeout);timeout=setTimeout(abort,20000);};
      try{
        let response=await fetch(url,{signal:request.signal,cache:'no-cache'});
        for(let retry=0;[429,503].includes(response.status)&&retry<2;retry++){
          await response.body?.cancel();
          await new Promise<void>((resolve,reject)=>{
            const done=()=>{request.signal.removeEventListener('abort',cancel);resolve();};
            const timer=setTimeout(done,1000);
            const cancel=()=>{clearTimeout(timer);request.signal.removeEventListener('abort',cancel);reject(new Error('Cancelled'));};
            request.signal.addEventListener('abort',cancel,{once:true});
          });
          response=await fetch(url,{signal:request.signal,cache:'no-cache'});
        }
        if(!response.ok)throw Error(t('资料加载失败'));
        let next:T;
        if(response.body){
          const reader=response.body.getReader(),decoder=new TextDecoder(),parts:string[]=[];
          while(true){const chunk=await reader.read();if(chunk.done)break;progress();parts.push(decoder.decode(chunk.value,{stream:true}));}
          parts.push(decoder.decode());next=JSON.parse(parts.join('')) as T;
        }else next=await response.json() as T;
        if(controller.signal.aborted)return;loaded.current=true;setData(previous=>selectPublicSnapshot(previous,next) as T);setError(null);
      }
      catch{if(!controller.signal.aborted&&!loaded.current)setError(t('资料暂未加载成功，请打开静态目录。'));}
      finally{clearTimeout(timeout);clearTimeout(maximum);controller.signal.removeEventListener('abort',abort);pending=false;}
    };
    void load();const refresh=()=>{if(!document.hidden)void load();};const timer=setInterval(refresh,60000);
    document.addEventListener('visibilitychange',refresh);window.addEventListener('focus',refresh);window.addEventListener('online',refresh);
    return()=>{controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);};
  },[url,attempt]);
  return {data,error,retry:()=>{setError(null);setAttempt(value=>value+1);}};
}
