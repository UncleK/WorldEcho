import english from './en.json' with { type: 'json' };
import french from './fr.json' with { type: 'json' };
export type Language = 'zh-CN' | 'en' | 'fr';
export const SUPPORTED_LANGUAGES = ['zh-CN', 'en', 'fr'] as const;
let language:Language='zh-CN';
const messages:Record<'en'|'fr',Record<string,string>>={en:english,fr:french};
const listeners=new Set<()=>void>();
export const getLanguage=()=>language;
export const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export function setCurrentLanguage(next:Language){language=next;for(const listener of listeners)listener();}
export function t(key:string,...values:unknown[]):string{const copy=language==='zh-CN'?key:messages[language][key]??key;return copy.replace(/\{(\d+)\}/g,(_,index)=>String(values[Number(index)]??''));}
