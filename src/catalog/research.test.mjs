import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResearchDataset, calculateStats, classifyMaterial, DEFAULT_QUERY, filterRows, heightInMeters, paginateRows, querySearch, readQuery } from './research.ts';

const sources = [{ id: 's1', title: 'Operating institution', url: 'https://example.org/tower', publisher: 'Operator', kind: 'primary' }];
const ids = new Set(['s1']);
const base = (id = 'tower-a') => ({ id, aliases: ['old-tower-alias'], names: { zh: '巴黎复制版本', local: 'Tour Eiffel' }, classification: 'replica', familyId: 'eiffel', landmarkType: 'tower',
  editorial: null, location: { countryCode: 'FR', city: 'Paris', venue: 'Exhibition', selected: null }, status: { value: 'unknown', sourceIds: [] },
  dimensions: { height: null, observations: [] }, appearance: { materials: [] }, history: { events: [] }, mediaIds: [], sourceIds: ['s1'], gaps: [], researchStatus: 'candidate', maps: { preferred: 'google', status: 'unavailable' } });
const dataset = rows => buildResearchDataset({ towers: rows, sources, media: [], published: [] }, '2026-10-06T00:00:00Z');

test('Research filters share height/status/access semantics and expose specific information gaps', () => {
  const records = dataset([base('small'), base('known'), base('unknown'), base('removed')]).entries;
  records[0].heightM = 4; records[1].heightM = 5; records[1].status = 'existing'; records[1].access = 'public';
  records[2].access = 'private'; records[3].status = 'removed'; records[3].heightM = 9;
  const query = { ...DEFAULT_QUERY, minHeight: 5, hidePast: true, hidePrivate: true };
  assert.deepEqual(filterRows(records, query).map(row => row.id), ['known']);
  assert.deepEqual(readQuery(querySearch(query)), query);
  assert.deepEqual(filterRows(records, { ...DEFAULT_QUERY, missing: 'height' }).map(row => row.id), ['unknown']);
  assert.deepEqual(filterRows(records, { ...DEFAULT_QUERY, status: 'removed' }).map(row => row.id), ['removed']);
  assert.equal(readQuery('?status=bad&missing=bad').status, '');
  assert.equal(readQuery('?status=bad&missing=bad').missing, '');
});

test('Approved demo photographs remain available in the archive when the map anchor is withdrawn',()=>{
  const tower=base('courtyard');tower.mediaIds=['photo'];
  const photo={id:'photo',pageUrl:'https://example.org/photo',author:'Photographer',capturedAt:'2024-09',license:{text:'Unknown',url:null},visuallyVerified:true,sourceIdentityStatus:'matched',verifiedTowerIds:['courtyard'],reuseStatus:'research_only',demoDisplayStatus:'demo_only_user_authorized',gameEligible:false,originPageUrl:'https://example.org/photo',asset:{localPath:'data/media/courtyard.jpg',sha256:'fixture',downloadStatus:'downloaded'}};
  const row=buildResearchDataset({towers:[tower],sources,media:[photo],published:[],photoAssets:[{id:'photo',url:'/assets/photos/fixture.webp',thumbnail:'/assets/photos/fixture-thumb.webp'}]}).entries[0];
  assert.equal(row.photoCount,1);assert.equal(row.photos[0].url,'/assets/photos/fixture.webp');assert.equal(row.globeAvailable,false);assert.equal(row.mapReady,false);
});

test('held and unresolved prototypes remain research records without public model access', () => {
  const approved=base('approved'),held=base('held'),unresolved=base('unresolved');
  approved.model={key:'approved',familyId:'eiffel',status:'prototype',publicationEligibility:'scope_reviewed',collection:'core'};
  held.model={...approved.model,key:'held',publicationEligibility:'held'};
  unresolved.model={...approved.model,key:'unresolved'};unresolved.classification='unresolved';
  const rows=dataset([approved,held,unresolved]).entries;
  assert.equal(rows.length,3);assert.equal(rows[0].modelKey,'approved');
  assert.equal(rows[1].modelKey,null);assert.equal(rows[2].modelKey,null);
  assert.equal(calculateStats(rows).modeled,1);
});

test('height conversion requires a selected, positive source-backed value and ignores observation maxima', () => {
  assert.equal(heightInMeters({ value: 60, unit: 'ft', sourceIds: ['s1'] }, ids), 18.288);
  for (const height of [{ value: 300, unit: 'm', sourceIds: [] }, { value: Infinity, unit: 'm', sourceIds: ['s1'] }, { value: -5, unit: 'm', sourceIds: ['s1'] }, { value: 0, unit: 'ft', sourceIds: ['s1'] }]) assert.equal(heightInMeters(height, ids), null);
  const tower = base(); tower.dimensions.height = { value: 20, unit: 'ft', scope: 'unknown', precision: 'claimed', sourceIds: ['s1'] };
  tower.dimensions.observations = [{ value: 1000, unit: 'm', scope: 'unknown', sourceIds: ['s1'] }];
  const row = dataset([tower]).entries[0]; assert.equal(row.heightM, 6.096); assert.equal(row.heightApproximate, true); assert.equal(row.heightConverted, true);
  tower.dimensions.height = { value: 6.096, unit: 'm', scope: 'unknown', precision: 'claimed', sourceIds: ['s1'], researchOriginal: { value: 20, unit: 'ft' } };
  assert.equal(dataset([tower]).entries[0].heightConverted, true);
});
test('built and opened remain separate; unknown materials do not become steel', () => {
  const tower = base(); tower.history.events = [{ kind: 'opened', date: '2004-08-16', sourceIds: ['s1'] }];
  tower.appearance.materials = [{ value: 'unknown', sourceIds: ['s1'] }];
  let row = dataset([tower]).entries[0]; assert.equal(row.builtYear, null); assert.equal(row.openedYear, 2004); assert.equal(row.coverage, 0); assert.deepEqual(row.materialGroups, []);
  tower.history.events.push({ kind: 'built', date: '1999', sourceIds: ['s1'] });
  row = dataset([tower]).entries[0]; assert.equal(row.builtYear, 1999); assert.equal(row.openedYear, 2004); assert.equal(row.coverage, 1);
});
test('multi-label materials count each record once within a category, with overlapping categories', () => {
  assert.deepEqual(classifyMaterial('reused scrap iron'), ['iron', 'reused']);
  const tower = base(); tower.appearance.materials = [{ value: 'steel factory offcuts', sourceIds: ['s1'] }, { value: 'welded steel', sourceIds: ['s1'] }];
  const rows = dataset([tower, base('unknown')]).entries, stats = calculateStats(rows);
  assert.equal(stats.materialKnown, 1); assert.deepEqual(stats.materials.map(item => [item.group, item.count]), [['steel', 1], ['reused', 1]]);
});
test('a licensed image of the wrong subject or another entity never enters gallery counts', () => {
  const tower = base(); tower.mediaIds = ['good', 'wrong', 'other'];
  const photo = id => ({ id, pageUrl: `https://example.org/${id}`, author: 'Photographer', capturedAt: '2024-01-01', license: { text: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' }, reuseStatus: 'ready', visuallyVerified: true, sourceIdentityStatus: 'consistent', verifiedTowerIds: ['tower-a'], asset: { localPath: 'data/media/a.jpg', sha256: 'abc', downloadStatus: 'downloaded' } });
  const wrong = photo('wrong'); wrong.sourceIdentityStatus = 'wrong_subject';
  const other = photo('other'); other.verifiedTowerIds = ['tower-b'];
  const data = buildResearchDataset({ towers: [tower], sources, media: [photo('good'), wrong, other], published: [{ id: 'tower-a', photos: [{ id: 'good', url: '/data/media/a.jpg', thumbnail: '/assets/photos/good-thumb.webp' }] }] });
  assert.equal(data.entries[0].photoCount, 1); assert.equal(data.entries[0].photos[0].url, null); assert.equal(data.entries[0].displayPhotoCount, 1);
});
test('search covers alias and country; combined filters and both height sorts keep unknowns last', () => {
  const a = base('tower-a'), b = base('tower-b'), c = base('tower-c');
  a.dimensions.height = { value: 20, unit: 'm', scope: 'total', sourceIds: ['s1'] };
  b.names = { zh: '天都城', local: null }; b.location.countryCode = 'CN'; b.dimensions.height = { value: 108, unit: 'm', scope: 'total', sourceIds: ['s1'] };
  const rows = dataset([a, b, c]).entries;
  assert.deepEqual(filterRows(rows, { ...DEFAULT_QUERY, q: '中国', region: 'asia' }).map(row => row.id), ['tower-b']);
  assert.equal(filterRows(rows, { ...DEFAULT_QUERY, q: 'old-tower-alias', country: 'FR' }).length, 2);
  assert.deepEqual(filterRows(rows, { ...DEFAULT_QUERY, sort: 'height-desc' }).map(row => row.id), ['tower-b', 'tower-a', 'tower-c']);
  assert.deepEqual(filterRows(rows, { ...DEFAULT_QUERY, sort: 'height-asc' }).map(row => row.id), ['tower-a', 'tower-b', 'tower-c']);
});
test('URL state restores Unicode, filters, sorting, pagination and detail; invalid values normalize', () => {
  const query = { ...DEFAULT_QUERY, q: '巴黎 France', country: 'FR', material: 'steel', model: 'yes', sort: 'height-asc', page: 3, pageSize: 50, entry: 'tower-a' };
  assert.deepEqual(readQuery(querySearch(query)), query);
  const bad = readQuery('?page=-4&pageSize=13&sort=invalid&region=invalid&model=invalid');
  assert.equal(bad.page, 1); assert.equal(bad.pageSize, 25); assert.equal(bad.sort, 'coverage'); assert.equal(bad.region, ''); assert.equal(bad.model, '');
  assert.deepEqual(paginateRows([], 999, 25), { entries: [], page: 1, pageCount: 1, total: 0 });
  assert.equal(paginateRows(Array.from({ length: 26 }, (_, index) => index), 99, 25).page, 2);
});

test('Original English and French source names remain searchable on the Chinese archive', () => {
  const row = dataset([base('ec-quito-candidate')]).entries[0];
  row.name = '基多铁塔候选'; row.localName = null; row.nameEn = 'Eiffel Center, Quito'; row.nameFr = 'Centre Eiffel — Quito';
  assert.equal(filterRows([row], { ...DEFAULT_QUERY, q: 'Eiffel Center' }).length, 1);
  assert.equal(filterRows([row], { ...DEFAULT_QUERY, q: 'Centre Eiffel' }).length, 1);
});
test('replica height extrema exclude inspired entries and unselected observations', () => {
  const small = base('small'), large = base('large'), inspired = base('inspired'), lead = base('lead');
  small.dimensions.height = { value: 13, unit: 'm', scope: 'unknown', sourceIds: ['s1'] };
  large.dimensions.height = { value: 108, unit: 'm', scope: 'total', sourceIds: ['s1'] };
  inspired.classification = 'inspired'; inspired.dimensions.height = { value: 500, unit: 'm', scope: 'total', sourceIds: ['s1'] };
  lead.dimensions.observations = [{ value: 700, unit: 'm', sourceIds: ['s1'] }];
  const rows = dataset([small, large, inspired, lead]).entries;
  rows.find(row => row.id === 'inspired').mapReady = true;
  rows.find(row => row.id === 'inspired').modelKey = 'paris';
  const stats = calculateStats(rows);
  assert.equal(stats.research, 4); assert.equal(stats.heightKnown, 2); assert.equal(stats.heightPending, 1); assert.equal(stats.highestReplica.id, 'large'); assert.equal(stats.smallestReplica.id, 'small');
  assert.equal(stats.mapped, 0); assert.equal(stats.modeled, 0);
});

test('Explicit source-only height references remain readable without becoming chart extrema', () => {
  const reference=base('reference'),measured=base('measured');
  reference.dimensions.height={value:999,unit:'m',scope:'unknown',sourceIds:['s1']};
  reference.dimensions.heightDisplayRole='source_reference';reference.dimensions.comparisonEligible=false;
  measured.dimensions.height={value:108,unit:'m',scope:'total',sourceIds:['s1']};
  const rows=dataset([reference,measured]).entries,stats=calculateStats(rows);
  assert.equal(rows.find(row=>row.id==='reference').heightM,999);
  assert.equal(stats.heightKnown,2);assert.equal(stats.highestReplica.id,'measured');assert.equal(stats.smallestReplica.id,'measured');
});
