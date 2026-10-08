import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { t } from './i18n';
import './theme.css';

export type Theme='dark'|'light';
const listeners=new Set<()=>void>();
let theme:Theme='dark';
try { if(localStorage.getItem('worldecho-theme')==='light')theme='light'; } catch { /* Theme still works when storage is unavailable. */ }
function apply(){document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;}
apply();
function setTheme(next:Theme){theme=next;apply();try{localStorage.setItem('worldecho-theme',next);}catch{}for(const listener of listeners)listener();}
addEventListener('storage',event=>{if(event.key==='worldecho-theme'){theme=event.newValue==='light'?'light':'dark';apply();for(const listener of listeners)listener();}});
export function useTheme(){return useSyncExternalStore(listener=>{listeners.add(listener);return()=>{listeners.delete(listener);};},()=>theme);}
export function ThemeSwitch(){const value=useTheme();return <button className="theme-switch" title={value==='dark'?t('浅色模式'):t('深色模式')} aria-label={value==='dark'?t('浅色模式'):t('深色模式')} aria-pressed={value==='light'} onClick={()=>setTheme(value==='dark'?'light':'dark')}>{value==='dark'?<Sun size={15}/>:<Moon size={15}/>}</button>;}
