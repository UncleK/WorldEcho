import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const models=read('data/model-batch100.json').models,catalog=read('public/catalog.v1.json'),research=read('public/research.v1.json'),manifest=read('public/assets/portraits/manifest.json');
const keys=new Set(models.map(m=>m.key));if(keys.size!==models.length)throw Error('Duplicate model keys');
for(const row of catalog.modelCases??[])if(!keys.has(row.modelKey))throw Error('Unregistered model '+row.modelKey);
for(const row of research.entries)if(row.modelKey&&!keys.has(row.modelKey))throw Error('Unknown research model '+row.modelKey);
for(const e of manifest.entries)for(const view of Object.values(e.views??{})){if(!view.url.startsWith('/assets/portraits/'))throw Error('Unexpected portrait URL');const bytes=fs.readFileSync(path.join(root,'public',view.url));if(crypto.createHash('sha256').update(bytes).digest('hex')!==view.sha256)throw Error('Changed portrait '+view.url);}
let photos=0;const visit=v=>{if(Array.isArray(v))return v.forEach(visit);if(v&&typeof v==='object')return Object.values(v).forEach(visit);if(typeof v==='string'){if(v.startsWith('/assets/photos/'))throw Error('Local third-party photo reference in public snapshot');if(v.startsWith('https://worldecho.beaverstudio.net/assets/photos/'))photos++;}};visit(catalog);visit(research);
if(fs.existsSync(path.join(root,'public/assets/photos')))throw Error('Third-party photo folder must not be bundled');
console.log(JSON.stringify({status:'passed',scope:'public snapshot integrity, not production approval',registeredModels:models.length,researchRecords:research.entries.length,exactCatalogLocations:catalog.towers.length,approximateDisplayLocations:catalog.approximateTowers?.length??0,portraits:manifest.entries.length,externalPhotoReferences:photos}));
