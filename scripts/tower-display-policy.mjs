import policy from '../data/tower-display-policy.v1.json' with { type: 'json' };

const entries = new Map(policy.entries.map(entry => [entry.towerId, entry]));
/** Display/access metadata stays separate from evidence-backed existence status. */
/** @returns {{access: 'private'|'public'|'unknown', historicalAppearance: boolean}} */
export function towerDisplayMetadata(towerId) {
  const entry = entries.get(towerId);
  return { access: entry?.access === 'private' ? 'private' : entry?.access === 'public' ? 'public' : 'unknown', historicalAppearance: entry?.historicalAppearance === true };
}
