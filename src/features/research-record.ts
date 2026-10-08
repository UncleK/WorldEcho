import type { ResearchRow } from '../catalog/research';
import type { Language } from '../i18n/messages';
import { getEditorial } from '../i18n/editorial';
const countryNames = {
  en: new Intl.DisplayNames(['en'], { type: 'region' }),
  fr: new Intl.DisplayNames(['fr'], { type: 'region' }),
};

/** Both detail surfaces localize the same research record, never a catalog summary. */
export function localizeResearchRow(row: ResearchRow, language: Language): ResearchRow {
  if (language === 'zh-CN') return row;
  const copy = (getEditorial(language).towers as Record<string, {
    name?: string; label?: string; city?: string; venue?: string; summary?: string; currentUses?: string[];
  }>)[row.id];
  return {
    ...row,
    name: row.communityNameReviewed ? row.nameEn ?? row.name : copy?.name ?? row.nameEn ?? row.localName ?? row.name,
    label: copy?.label ?? row.label,
    city: copy?.city ?? row.city,
    venue: copy?.venue ?? row.venue,
    countryName: countryNames[language].of(row.countryCode) ?? row.countryCode,
    summary: (language === 'fr' ? row.communitySummary?.fr ?? row.communitySummary?.en : row.communitySummary?.en)
      ?? copy?.summary ?? row.summary,
    uses: copy?.currentUses ?? row.uses,
  };
}
