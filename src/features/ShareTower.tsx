import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, Share2 } from 'lucide-react';
import { t } from '../i18n';

export default function ShareTower({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'copied' | 'manual'>('idle');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const url = location.href;
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true); };
  }, [open]);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setStatus('copied'); }
    catch { setStatus('manual'); }
  }
  async function share() {
    try { await navigator.share({ title, url }); setOpen(false); }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setStatus('manual'); }
  }
  return <div className="tower-share" ref={root}>
    <button ref={trigger} className="subtle-icon" title={t('分享这座塔')} aria-label={t('分享这座塔')} aria-expanded={open} aria-controls="tower-share-options" onClick={() => { setStatus('idle'); setOpen(value => !value); }}><Share2 size={16}/></button>
    {open && <div className="tower-share-options" id="tower-share-options" role="group" aria-label={t('分享这座塔')}>
      {typeof navigator.share === 'function' && <button onClick={share}><Share2 size={15}/>{t('应用分享')}</button>}
      <a href={`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`} target="_blank" rel="noreferrer">WhatsApp<ExternalLink size={13}/></a>
      <a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`} target="_blank" rel="noreferrer">Telegram<ExternalLink size={13}/></a>
      <button onClick={copy}>{status === 'copied' ? <Check size={15}/> : <Copy size={15}/>}<span aria-live="polite">{t(status === 'copied' ? '已复制铁塔分享链接' : '复制链接')}</span></button>
      {status === 'manual' && <label>{t('复制下方链接分享')}<input readOnly value={url} onFocus={event => event.target.select()}/></label>}
    </div>}
  </div>;
}
