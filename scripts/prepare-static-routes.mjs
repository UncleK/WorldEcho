import fs from 'node:fs';import path from 'node:path';
const out=path.resolve(import.meta.dirname,'../dist'),read=p=>fs.readFileSync(path.join(out,p),'utf8'),data=JSON.parse(read('research.v1.json'));
const write=(p,s)=>{const f=path.join(out,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s);};
for(const lang of ['zh','en','fr']){const tag=lang==='zh'?'zh-CN':lang;const adapt=s=>s.replace(/<html[^>]*>/,'<html lang="'+tag+'">').replace('</head>','<meta name="robots" content="noindex,follow"></head>');write(lang+'/index.html',adapt(read('index.html')));write(lang+'/catalog.html',adapt(read('catalog.html')));write(lang+'/catalog-static.html',read('catalog-static.html'));for(const row of data.entries)if(/^[a-z0-9_-]+$/i.test(row.id))write(lang+'/places/'+row.id+'.html',adapt(read('index.html')));}
// The developer snapshot emits no GeoCoordinates or copied production sitemap.
// Approximate display markers never become verified geographic SEO assertions.
write('robots.txt','User-agent: *\nDisallow: /\n');
console.log(JSON.stringify({staticLanguageRoutes:3,placeShells:data.entries.length*3,exactGeoStructuredDataEmitted:0,scope:'local developer preview'}));
