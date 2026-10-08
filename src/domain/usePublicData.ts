import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { selectPublicSnapshot } from './public-snapshot.mjs';
interface VersionedData { generatedAt?: string; communityRevision?: number }
export function usePublicData<T extends VersionedData>(url:string) {
  const [data,setData]=useState<T|null>(null),[error,setError]=useState<string|null>(null);
  const loaded=useRef(false);
  useEffect(()=>{
    const controller=new AbortController();let pending=false;
    const load=async()=>{
      if(pending||controller.signal.aborted)return;pending=true;
      const request=new AbortController();const abort=()=>request.abort();controller.signal.addEventListener('abort',abort,{once:true});const timeout=setTimeout(abort,15000);
      try{const response=await fetch(url,{signal:request.signal,cache:'no-cache'});if(!response.ok)throw Error(t('资料加载失败'));const next=await response.json() as T;if(controller.signal.aborted)return;loaded.current=true;setData(previous=>selectPublicSnapshot(previous,next) as T);setError(null);}
      catch{if(!controller.signal.aborted&&!loaded.current)setError(t('资料暂未加载成功，请打开静态目录。'));}
      finally{clearTimeout(timeout);controller.signal.removeEventListener('abort',abort);pending=false;}
    };
    void load();const refresh=()=>{if(!document.hidden)void load();};const timer=setInterval(refresh,60000);
    document.addEventListener('visibilitychange',refresh);window.addEventListener('focus',refresh);
    return()=>{controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',refresh);};
  },[url]);
  return {data,error};
}
