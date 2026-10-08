import notes from '../../data/locales/round8-en-evidence-notes.json';
import increment from '../../data/locales/round9-en-evidence-notes.json';
import french from '../../data/locales/round9-fr-evidence-notes.json';
import jonworth from '../../data/locales/jonworth-20261007-evidence.json';
import { getLanguage } from './messages';

/** Translate editorial evidence notes without changing the underlying source record. */
export function evidenceText(value: string): string {
  const language=getLanguage();
  const dictionary=language==='fr'?french:notes;
  if(language==='en'||language==='fr'){const translated=(jonworth.translations[language] as Record<string,string>)[value];if(translated)return translated;}
  return language==='en' ? (increment.translations as Record<string,string>)[value]??(notes.translations as Record<string,string>)[value]??value : language==='fr'?(dictionary.translations as Record<string,string>)[value]??value:value;
}
