import type { ReactNode } from 'react';
import { ArrowDownUp, ChevronDown, Compass, Database, Gamepad2, Search } from 'lucide-react';
import { LanguageSwitch, t, useLanguage } from '../i18n';
import { ThemeSwitch } from '../theme';
import { BRAND } from '../domain/brand.mjs';
import './site-header.css';

export default function SiteHeader({ active, onExplore, onCompare, onChallenge, challengeDisabled, comparisonCount, children }: {
  active: 'globe' | 'comparison' | 'catalog'; onExplore?: () => void; onCompare?: () => void;
  onChallenge?: () => void; challengeDisabled?: boolean; comparisonCount?: number; children?: ReactNode;
}) {
  useLanguage();
  const items = [
    { id: 'globe', label: '探索', href: '/', action: onExplore, Icon: Compass },
    { id: 'comparison', label: '比较', href: '/?view=comparison', action: onCompare, Icon: ArrowDownUp },
    { id: 'challenge', label: '挑战', href: '/?challenge=1', action: onChallenge, Icon: Gamepad2 },
    { id: 'catalog', label: '资料集', href: '/catalog.html', Icon: Database },
  ];
  return <header className="site-header">
    <a className="site-brand" href="/" aria-label={t('{0} 首页', BRAND.name)}><img src={BRAND.logo} alt=""/><span>{BRAND.wordmark}</span></a>
    <nav className="site-nav" aria-label={t('主导航')}>{items.map(({ id, label, href, action, Icon }) => {
      const content = <><Icon size={15}/><span>{t(label)}</span>{id === 'comparison' && <small aria-hidden={comparisonCount === undefined} style={{ visibility: comparisonCount === undefined ? 'hidden' : undefined }}>{comparisonCount ?? '0'}</small>}</>;
      const props = { className: active === id ? 'active' : '', title: t(label), 'aria-label': t(label), 'aria-current': active === id ? 'page' as const : undefined };
      return action ? <button key={id} {...props} disabled={id === 'challenge' && challengeDisabled} onClick={action}>{content}</button> : <a key={id} {...props} href={href}>{content}</a>;
    })}</nav>
    <div className="site-search">{children ?? <a className="site-catalog-search" href="#catalog-search"><Search size={17}/><span>{t('搜索城市或铁塔')}</span></a>}</div>
    <div className="site-preferences"><ThemeSwitch/><div className="site-language"><LanguageSwitch/><ChevronDown size={13} aria-hidden="true"/></div></div>
  </header>;
}
