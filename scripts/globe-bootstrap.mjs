import fs from 'node:fs';

const css = fs.readFileSync(new URL('../src/features/globe-loading.css', import.meta.url), 'utf8');
export function globeBootstrap(language = 'zh') {
  const label = language === 'fr' ? 'Le monde prend forme' : language === 'en' ? 'The world is taking shape' : '世界正在展开';
  return `<style data-bootstrap>${css}.initial-globe{height:100dvh;position:relative}.initial-globe .world-load-status{bottom:18%;font-family:system-ui,sans-serif}</style><section class="globe-loading initial-globe" aria-label="World Echo"><span class="globe-loading-sphere" aria-hidden="true"><i></i><i></i><i></i><b></b><b></b></span><p class="world-load-status" role="status">${label}</p></section>`;
}
