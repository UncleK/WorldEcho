import evidence from '../../data/visual-height-estimates.v1.json' with { type: 'json' };
const byId=new Map(evidence.entries.map(entry=>[entry.id,entry]));
export function displayHeightEvidence(id){return byId.get(id)??null;}
export function exhibitionHeightMetres(tower){
  if(tower.heightM!==null&&tower.heightM!==undefined)return Number.isFinite(tower.heightM)&&tower.heightM>0?tower.heightM:null;
  const entry=displayHeightEvidence(tower.id);
  return entry?.displayM>0?entry.displayM:null;
}
export function displayHeightRange(id,language='zh-CN'){
  const entry=displayHeightEvidence(id);if(!entry?.rangeM)return null;
  const format=value=>new Intl.NumberFormat(language,{maximumFractionDigits:value<10?1:0}).format(value);
  const [lower,upper]=entry.rangeM;
  return lower===upper?`≈ ${format(lower)} m`:`≈ ${format(lower)}–${format(upper)} m`;
}
