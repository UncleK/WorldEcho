import { useSyncExternalStore } from 'react';
import { getLanguage, t, setCurrentLanguage, subscribe, type Language } from './messages.ts';
import { LOCALES, detectLanguage, languageCode, localizedPath } from './locale.mjs';
import { placeIdFromPath } from '../domain/place-entry.mjs';
export { t, getLanguage, SUPPORTED_LANGUAGES, type Language } from './messages.ts';
function detect(): Language { return detectLanguage(location.pathname,location.search) as Language; }
setCurrentLanguage(detect());
export function setLanguage(next: Language) {
  setCurrentLanguage(next);
  const url = new URL(location.href); url.searchParams.set('lang', next);
  const code=languageCode(next);
  if(!import.meta.env.DEV){
    url.pathname=localizedPath(url.pathname,next);
  }
  history.replaceState({}, '', url);
  document.documentElement.lang = next;
  const catalog=url.pathname.includes('catalog');
  const placeId=placeIdFromPath(url.pathname);
  const canonical=`https://worldecho.beaverstudio.net/${code}/${placeId?`places/${placeId}.html`:catalog?'catalog.html':''}`;
  document.querySelector<HTMLLinkElement>('link[rel=canonical]')?.setAttribute('href',canonical);
  document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content',canonical);
  document.title=catalog?(next==='en'?'Landmark archive · World Echo':next==='fr'?'Atlas des monuments · World Echo':'地标资料集 · World Echo'):(next==='en'?'World Echo · Eiffel towers around the world':next==='fr'?'World Echo · Les tours Eiffel dans le monde':'World Echo · 世界回响');
}
addEventListener('popstate', () => { setCurrentLanguage(detect()); document.documentElement.lang = getLanguage(); });
document.documentElement.lang = getLanguage();
export function useLanguage() { return useSyncExternalStore(subscribe, getLanguage); }
export function withLang(href: string) { const url = new URL(href, location.origin); if (url.origin === location.origin) url.searchParams.set('lang', getLanguage()); return url.origin === location.origin ? url.pathname + url.search + url.hash : href; }
export function LanguageSwitch() { const lang = useLanguage(); return <select className="language-switch language-switch-select" title={t('语言')} aria-label={t('语言')} value={lang} onChange={event=>setLanguage(event.target.value as Language)}>{LOCALES.map(item=><option key={item.id} value={item.id}>{item.id==='zh-CN'?'中文':item.code.toUpperCase()}</option>)}</select>; }
// Preserve the current language during normal same-tab navigation between the two entry points.
document.addEventListener('click', (event) => { const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null; if (!link || link.hasAttribute('download')) return; const url = new URL(link.href); if (url.origin === location.origin && (url.pathname === '/' || /^\/(catalog|catalog-static|agents)\.html$/.test(url.pathname))) link.href = withLang(link.href); });
