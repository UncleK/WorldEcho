const inScope = new Set(['original', 'replica', 'local_variant']);
const usableIdentity = new Set(['confirmed', 'verified', 'matched', 'consistent', 'consistent_with_source', 'consistent_with_metadata',
  'caption_and_paris_context_consistent', 'caption_and_paris_structure_consistent', 'caption_and_visual_context_consistent', 'caption_and_tianducheng_context_consistent']);
const anchorChecks = new Set(['object_matched', 'cross_checked', 'footprint_anchor_derived', 'named_tower_node']);

export function validCoordinate(coordinate) {
  return !!coordinate && Number.isFinite(coordinate.lat) && Number.isFinite(coordinate.lon)
    && Math.abs(coordinate.lat) <= 90 && Math.abs(coordinate.lon) <= 180;
}

export function isMapAnchor(coordinate) {
  return validCoordinate(coordinate) && coordinate.crs === 'WGS84'
    && ['tower_point', 'tower_footprint'].includes(coordinate.kind)
    && anchorChecks.has(coordinate.verification)
    && Array.isArray(coordinate.sourceIds) && coordinate.sourceIds.length > 0;
}

export function makeMapLinks(coordinate, name, countryCode, { research = false } = {}) {
  const preferred = countryCode === 'CN' ? 'amap' : 'google';
  if (!validCoordinate(coordinate) || coordinate.crs !== 'WGS84') {
    return { preferred, google: null, amap: null, status: 'unavailable', reason: 'missing_or_unconfirmed_wgs84_coordinate' };
  }
  const trusted = isMapAnchor(coordinate);
  if (!trusted && !research) {
    return { preferred, google: null, amap: null, status: 'research_only', reason: 'coordinate_not_verified_as_tower_anchor' };
  }
  const google = new URL('https://www.google.com/maps/search/');
  google.searchParams.set('api', '1');
  google.searchParams.set('query', `${coordinate.lat},${coordinate.lon}`);
  const amap = new URL('https://uri.amap.com/marker');
  amap.searchParams.set('position', `${coordinate.lon},${coordinate.lat}`);
  amap.searchParams.set('name', name);
  amap.searchParams.set('src', 'towerworld');
  amap.searchParams.set('coordinate', 'wgs84');
  amap.searchParams.set('callnative', '0');
  return { preferred, google: google.href, amap: countryCode === 'CN' || countryCode === 'MO' ? amap.href : null,
    status: trusted ? 'available' : 'research_only', reason: coordinate.derived ? 'derived_approximate_map_anchor' : null,
    verification: 'official_uri_parameters_not_browser_acceptance' };
}

export function identityAccepted(media, towerId) {
  return media?.visuallyVerified === true && usableIdentity.has(media.sourceIdentityStatus)
    && (!towerId || (media.verifiedTowerIds ?? []).includes(towerId));
}

export function galleryEligible(media, towerId) {
  return identityAccepted(media, towerId) && ['reuse_confirmed', 'ready'].includes(media.reuseStatus)
    && !!media.license?.text && !!media.license?.url && !!media.asset?.localPath && !!media.asset?.sha256
    && media.asset.downloadStatus === 'downloaded';
}

/** Explicitly marked first-batch demo images keep their unresolved rights status. */
export function demoGalleryEligible(media, towerId) {
  return identityAccepted(media, towerId) && media.demoDisplayStatus === 'demo_only_user_authorized'
    && media.gameEligible === false && !!media.license?.text && /^https?:\/\//.test(media.originPageUrl ?? '')
    && !!media.asset?.localPath && !!media.asset?.sha256 && media.asset.downloadStatus === 'downloaded';
}

export function createCatalog({ towers, sources, media }) {
  const towerRows = Array.isArray(towers) ? towers : towers.entries;
  const sourceRows = Array.isArray(sources) ? sources : sources.entries;
  const mediaRows = Array.isArray(media) ? media : media.entries;
  const byId = new Map(towerRows.map((tower) => [tower.id, tower]));
  const canonicalId = id => {
    let tower=byId.get(id);const seen=new Set();
    while(tower?.aliasOf){
      if(seen.has(tower.id))throw new Error(`Cyclic confirmed alias ${id}`);
      seen.add(tower.id);const next=byId.get(tower.aliasOf);
      if(!next)throw new Error(`Missing confirmed alias target ${tower.aliasOf}`);
      tower=next;
    }
    return tower?.id??null;
  };
  for(const tower of towerRows)canonicalId(tower.id);
  const byAlias = new Map();
  for (const tower of towerRows) for (const alias of tower.aliases ?? []) {
    const owner=canonicalId(tower.id);
    if(byId.has(alias)&&canonicalId(alias)!==owner)throw new Error(`Alias shadows another canonical entity ${alias}`);
    if (byAlias.has(alias) && byAlias.get(alias) !== owner) throw new Error(`Ambiguous confirmed alias ${alias}`);
    byAlias.set(alias, owner);
  }
  const sourceById = new Map(sourceRows.map((source) => [source.id, source]));
  const mediaById = new Map(mediaRows.map((item) => [item.id, item]));
  function getTower(id) { return byId.get(byAlias.get(id)??canonicalId(id)) ?? null; }
  function getMediaForTower(id, { includeResearch = false, includeDemo = false } = {}) {
    const tower = getTower(id);
    return (tower?.mediaIds ?? []).map((key) => mediaById.get(key)).filter(Boolean)
      .filter((item) => includeResearch || galleryEligible(item, tower.id) || (includeDemo && demoGalleryEligible(item, tower.id)));
  }
  const listTowers = ({ includeExcluded = false, researchedOnly = false, mapReady = false, evidenceCandidatesOnly = false, familyId, landmarkType } = {}) => towerRows.filter((tower) =>
    (includeExcluded || (!tower.aliasOf&&inScope.has(tower.classification))) && (!researchedOnly || tower.researchStatus === 'researched')
    && (!mapReady || tower.readiness.mapLinkEnabled) && (!evidenceCandidatesOnly || tower.readiness.evidenceCandidate)
    && (!familyId || tower.familyId === familyId) && (!landmarkType || tower.landmarkType === landmarkType));
  return {
    getTower,
    getLandmark: getTower,
    getSource: (id) => sourceById.get(id) ?? null,
    getMedia: (id) => mediaById.get(id) ?? null,
    getMediaForTower,
    getMediaForLandmark: getMediaForTower,
    getMapLinks: (id, options) => {
      const tower = getTower(id);
      return tower ? makeMapLinks(tower.location.selected, tower.names.zh, tower.location.countryCode, options) : null;
    },
    listTowers,
    listLandmarks: listTowers,
  };
}
