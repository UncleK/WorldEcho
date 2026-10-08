import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

// Reproducible README artwork from the real WorldEcho globe and its own renders.
// Public checkout: pnpm showcase:generate (run from the repository root).
const root=process.cwd(),out=path.join(import.meta.dirname,'assets');
fs.mkdirSync(out,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/assets/portraits/manifest.json'),'utf8'));
const entries=new Map(manifest.entries.map(row=>[row.modelKey,row]));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const svg=(w,h,body)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><style>text{font-family:Segoe UI,Arial,sans-serif}</style>${body}</svg>`);
const safe=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;');
// Intrinsic widths match README percentages (32/32/12/12/12), so all five linked
// images have the same displayed height and form three navigation groups on one line.
function writeNavigation(){
 const files=[];
 for(const[file,title,sub]of[['nav-explore.svg','EXPLORE THE GLOBE','worldecho.beaverstudio.net'],['nav-archive.svg','BROWSE THE ARCHIVE','Records, models & sources']]){
  fs.writeFileSync(path.join(out,file),svg(320,84,`<rect x="1" y="1" width="309" height="82" rx="13" fill="#12313C" stroke="#53766F"/><circle cx="24" cy="41" r="4" fill="#D7B478"/><text x="40" y="34" fill="#F3EBD7" font-size="15" font-weight="600" letter-spacing=".5">${safe(title)}</text><text x="40" y="57" fill="#A6C0B6" font-size="12">${safe(sub)}</text>`));
  files.push(file);
 }
 const languages=[['en','English','EN'],['zh','中文','ZH'],['fr','Français','FR']];
 for(let i=0;i<languages.length;i++){
  const[key,label,code]=languages[i],file=`nav-language-${key}.svg`;
  const outline=i===0?'M14 1H120V83H14Q1 83 1 70V14Q1 1 14 1Z':i===2?'M0 1H106Q119 1 119 14V70Q119 83 106 83H0Z':'M0 1H120V83H0Z';
  fs.writeFileSync(path.join(out,file),svg(120,84,`<path d="${outline}" fill="#12313C" stroke="#53766F"/><text x="60" y="36" text-anchor="middle" fill="#F3EBD7" font-size="17" font-weight="600">${safe(label)}</text><text x="60" y="60" text-anchor="middle" fill="#D7B478" font-size="11" letter-spacing="2">${code}</text>`));
  files.push(file);
 }
 return files;
}
if(process.argv.includes('--navigation-only')){console.log(JSON.stringify({outputs:writeNavigation()}));process.exit(0);}
const assets=[];
async function tower(key,height){
  const entry=entries.get(key);if(!entry)throw Error(`Missing model render: ${key}`);
  const source=entry.views?.axonometric??entry.views.front;
  const file=path.join(root,'public',source.url);const bytes=fs.readFileSync(file);
  if(sha(bytes)!==source.sha256)throw Error(`Changed model render: ${key}`);
  const image=await sharp(bytes).trim().resize({height,fit:'inside'}).png().toBuffer();
  const meta=await sharp(image).metadata();
  assets.push({modelKey:key,source:source.url,sha256:source.sha256});
  return {input:image,width:meta.width,height:meta.height};
}
// The owner selected this actual application screenshot and allowed still-image cropping.
// Crop excess star-field margins, the lower globe and toolbar; retain the upper curve and main tower labels.
// The separate original MP4 is never cropped, shortened or re-encoded by this script.
const globeBytes=fs.readFileSync(path.join(out,'globe-source.png'));
const globeMeta=await sharp(globeBytes).metadata();
const catalogBytes=fs.readFileSync(path.join(root,'public/catalog.v1.json'));
const researchBytes=fs.readFileSync(path.join(root,'public/research.v1.json'));
const catalog=JSON.parse(catalogBytes),research=JSON.parse(researchBytes);
const materialGroupKeys=[...new Set(research.entries.flatMap(row=>row.materialGroups??[]).filter(Boolean))].sort();
const statistics={researchRecords:research.entries.length,models:new Set(catalog.modelCases.map(row=>row.modelKey).filter(Boolean)).size,countriesAndRegions:new Set(research.entries.map(row=>row.countryCode).filter(Boolean)).size,materialGroups:materialGroupKeys.length};
const statisticSources={research:{file:'public/research.v1.json',sha256:sha(researchBytes)},catalog:{file:'public/catalog.v1.json',sha256:sha(catalogBytes)},materialGroups:{scope:'Distinct materialGroups labels present in public research entries; multiple labels may apply to one record.',keys:materialGroupKeys}};
const number=value=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(value);
const globeCrop={left:470,top:40,width:1800,height:1090};
const globe=await sharp(globeBytes).extract(globeCrop).resize({width:1810}).modulate({brightness:.78}).png().toBuffer();
// Restore just the Paris label and the original tower as a quiet secondary focal point.
// Coordinates refer to the already-cropped/resized screenshot, not to geographical data.
const parisHighlightMask=svg(1810,1096,`
 <defs><filter id="softParis" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter></defs>
 <g fill="#fff" opacity=".94" filter="url(#softParis)">
  <ellipse cx="125" cy="103" rx="64" ry="42"/>
  <ellipse cx="127" cy="171" rx="34" ry="33"/>
  <ellipse cx="253" cy="275" rx="188" ry="40" transform="rotate(43 253 275)"/>
 </g>`);
const parisHighlight=await sharp(globeBytes).extract(globeCrop).resize({width:1810}).modulate({brightness:.95}).ensureAlpha().composite([{input:parisHighlightMask,blend:'dest-in'}]).png().toBuffer();
const heroHeight=1120;
const hero=svg(2400,heroHeight,`<rect width="2400" height="${heroHeight}" fill="#010307"/>`);
// Keep the recorded globe legible while putting the editorial text in the first visual layer.
const globeShade=svg(2400,heroHeight,`
 <defs>
  <linearGradient id="leftShade" x1="500" y1="0" x2="1790" y2="0" gradientUnits="userSpaceOnUse">
   <stop offset="0" stop-color="#010307" stop-opacity=".8"/>
   <stop offset=".2" stop-color="#010307" stop-opacity=".68"/>
   <stop offset=".58" stop-color="#010307" stop-opacity=".24"/>
   <stop offset="1" stop-color="#010307" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="bottomShade" x1="0" y1="710" x2="0" y2="1120" gradientUnits="userSpaceOnUse">
   <stop offset="0" stop-color="#010307" stop-opacity="0"/>
   <stop offset="1" stop-color="#010307" stop-opacity=".25"/>
  </linearGradient>
 </defs>
 <rect x="562" y="24" width="1810" height="1096" fill="url(#leftShade)"/>
 <rect x="562" y="24" width="1810" height="1096" fill="url(#bottomShade)"/>`);
const heroType=svg(2400,heroHeight,`
 <defs><radialGradient id="titleShade" cx="40%" cy="64%" r="65%"><stop offset="0" stop-color="#010307" stop-opacity=".3"/><stop offset=".7" stop-color="#010307" stop-opacity=".13"/><stop offset="1" stop-color="#010307" stop-opacity="0"/></radialGradient></defs>
 <rect x="58" y="66" width="45" height="4" rx="2" fill="#D7AD71"/>
 <text x="123" y="78" fill="#B2C5C8" font-size="20" letter-spacing="3.4">BEAVER STUDIO</text>
 <text x="60" y="163" fill="#BECBC6" font-size="32" letter-spacing="-.5">A small planet.</text>
 <text x="60" y="210" fill="#BECBC6" font-size="32" letter-spacing="-.5">A world of echoes.</text>
 <path d="M62 284H511" stroke="#39515A" stroke-width="1" opacity=".65"/>
 <g fill="#F4EDDC" font-size="87" font-weight="600" letter-spacing="-3">
  <text x="58" y="412">${number(statistics.researchRecords)}</text>
  <text x="310" y="412">${number(statistics.models)}</text>
  <text x="58" y="607">${number(statistics.countriesAndRegions)}</text>
  <text x="310" y="607">${number(statistics.materialGroups)}</text>
 </g>
 <g fill="#A6BFC1" font-size="14.5" letter-spacing="1.6">
  <text x="62" y="452">RESEARCH RECORDS</text>
  <text x="314" y="452">3D MODELS</text>
  <text x="62" y="647">COUNTRIES &amp; REGIONS</text>
  <text x="314" y="647">MATERIAL GROUPS</text>
 </g>
 <ellipse cx="694" cy="912" rx="595" ry="235" fill="url(#titleShade)"/>
 <text x="49" y="971" fill="#F4EDDC" font-size="211" font-weight="650" letter-spacing="-10">WorldEcho</text>
 <text x="62" y="1049" fill="#D7B77F" font-size="25" letter-spacing=".2">worldecho.beaverstudio.net</text>`);
await sharp(hero).composite([{input:globe,left:562,top:24},{input:globeShade,left:0,top:0},{input:parisHighlight,left:562,top:24},{input:heroType,left:0,top:0}]).png({compressionLevel:9}).toFile(path.join(out,'worldecho-cover.png'));
// Fast cover iteration leaves README, video, model wall and navigation files untouched.
if(process.argv.includes('--cover-only')){
 const file=path.join(out,'worldecho-cover.png');
 const coverEntry={file:'worldecho-cover.png',width:2400,height:heroHeight,sha256:sha(fs.readFileSync(file)),bytes:fs.statSync(file).size};
 const manifestPath=path.join(out,'showcase-manifest.json');
 const previous=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 previous.generatedAt=new Date().toISOString();previous.statistics=statistics;previous.statisticSources=statisticSources;
 previous.globeScreenshot.crop=globeCrop;previous.globeScreenshot.presentation={brightness:.78,leftDarkGradient:true,bottomDarkGradient:true,parisLocalHighlight:{sourceBrightness:.95,softMask:true,scope:'Paris label and original tower only'}};
 previous.outputs=previous.outputs.map(row=>row.file===coverEntry.file?coverEntry:row);
 fs.writeFileSync(manifestPath,JSON.stringify(previous,null,2)+'\n');
 console.log(JSON.stringify({...coverEntry,statistics}));
 process.exit(0);
}

const selected=[
 ['paris','PARIS','The original silhouette'],['texas','PARIS, TEXAS','A cowboy-hat crown'],
 ['id-rawa-pening-bamboo','RAWA PENING','Bamboo, reimagined'],['dk-taastrup-taastrup-eiffel-tower','TAASTRUP','Yellow, broad and bold'],
 ['us-gasquet-gasquet-market','GASQUET','Rounded stonework'],['ca-beloeil-cypress-tree','BELOEIL','A living silhouette'],
 ['se-vanersborg-lilla-paris','LILLA PARIS','A cut-out silhouette'],['las-vegas','LAS VEGAS','A stage for the night'],
];
const w=2400,h=1740,grid=[];
let bg=`<rect width="${w}" height="${h}" fill="#F3F1E9"/><text x="72" y="102" fill="#173842" font-size="51" font-weight="600" letter-spacing="-1">The same idea. Eight very different personalities.</text><text x="75" y="157" fill="#667870" font-size="22">Actual WorldEcho models · normalized display size, not a height comparison</text>`;
for(let i=0;i<selected.length;i++){
 const [key,title,subtitle]=selected[i],x=56+(i%4)*578,y=203+Math.floor(i/4)*721;
 bg+=`<rect x="${x}" y="${y}" width="556" height="690" rx="19" fill="${i%2?'#E9EDE4':'#E2E8E2'}"/><text x="${x+26}" y="${y+41}" fill="#8C9C90" font-size="17" letter-spacing="2">${String(i+1).padStart(2,'0')}</text><ellipse cx="${x+278}" cy="${y+574}" rx="133" ry="13" fill="#CDD6CC"/><text x="${x+27}" y="${y+626}" fill="#244148" font-size="24" letter-spacing="2" font-weight="600">${safe(title)}</text><text x="${x+27}" y="${y+661}" fill="#63786E" font-size="21">${safe(subtitle)}</text>`;
 const img=await tower(key,490);grid.push({input:img.input,left:Math.round(x+278-img.width/2),top:y+571-img.height});
}
bg+=`<text x="75" y="1703" fill="#677B70" font-size="19">Models are interpretations based on references. Inferred additions are identified in each record.</text>`;
await sharp(svg(w,h,bg)).composite(grid).png({compressionLevel:9}).toFile(path.join(out,'model-personalities.png'));

const navigationOutputs=writeNavigation();
const outputs=['worldecho-cover.png','model-personalities.png',...navigationOutputs];
fs.writeFileSync(path.join(out,'showcase-manifest.json'),JSON.stringify({generatedAt:new Date().toISOString(),kind:'code-composed-project-artwork',statistics,statisticSources,sourcePortraitManifestSha256:sha(fs.readFileSync(path.join(root,'public/assets/portraits/manifest.json'))),thirdPartyPhotographsIncluded:false,scope:'Generated cover, model wall and navigation graphics only. The separate user-supplied recording retains all original UI content.',globeScreenshot:{file:'globe-source.png',sha256:sha(globeBytes),width:globeMeta.width,height:globeMeta.height,crop:globeCrop,presentation:{brightness:.78,leftDarkGradient:true,bottomDarkGradient:true,parisLocalHighlight:{sourceBrightness:.95,softMask:true,scope:'Paris label and original tower only'}},provenance:'Owner-selected screenshot of the actual WorldEcho application; still-image cropping explicitly allowed'},modelRenders:[...new Map(assets.map(row=>[row.modelKey,row])).values()],outputs:outputs.map(file=>({file,bytes:fs.statSync(path.join(out,file)).size,sha256:sha(fs.readFileSync(path.join(out,file)))}))},null,2)+'\n');
console.log(JSON.stringify({outputs,thirdPartyPhotographsIncluded:false}));
