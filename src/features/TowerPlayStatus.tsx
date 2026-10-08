import { useLanguage } from '../i18n';
import { towerPlayCopy, type TowerPlayState } from '../domain/tower-play';
import './tower-play.css';

export default function TowerPlayStatus({ state }: { state: TowerPlayState }) {
  const copy = towerPlayCopy(useLanguage());
  if (!state.effects.length) return null;
  return <div className="tower-play-status" role="status" aria-label={copy.title}>
    <span className="tower-play-status-dot" aria-hidden="true" />
    <span>{state.effects.map(effect => copy[effect].name).join(' · ')}</span>
  </div>;
}
