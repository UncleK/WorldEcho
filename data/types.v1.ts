export type SourceId = string;
export type MediaId = string;
export type Classification = 'original' | 'replica' | 'local_variant' | 'inspired' | 'unresolved';
export type CoordinateSystem = 'WGS84' | 'GCJ02' | 'BD09' | 'unknown';
export interface Coordinate {
  lat: number;
  lon: number;
  crs: CoordinateSystem;
  kind: 'tower_point' | 'tower_footprint' | 'camera' | 'venue' | 'unknown' | 'tower_poi' | 'venue_point' | 'entrance_point' | 'provider_display_coordinate' | 'photography_or_ambiguous_point';
  verification: 'source_only' | 'object_matched' | 'cross_checked' | 'footprint_anchor_derived' | 'named_tower_node' | 'metadata_identity_spatial_match' | 'rejected_not_tower' | 'uri_redirect_observed' | 'not_selected';
  sourceIds: SourceId[];
  derived?: boolean;
  method?: string;
  notes?: string[] | string;
}
export interface Height {
  value: number;
  unit: 'm' | 'ft';
  scope: 'structure' | 'total' | 'unknown';
  precision: 'exact' | 'approximate' | 'claimed';
  sourceIds: SourceId[];
}
export interface Tower {
  id: string;
  aliasOf?: string | null;
  aliases: string[];
  names: { zh: string; local: string | null };
  classification: Classification;
  familyId: string;
  landmarkType: 'tower' | 'bell-tower' | 'monument' | 'building';
  editorial: { summary: string; label?:string|null; currentUses: string[]; useStatus: string; evidenceDate: string | null; lastCheckedAt: string;
    sourceIds: SourceId[]; visitorNotice: {text:string;startDate?:string;endDate?:string;sourceUrl:string} | null } | null;
  location: { countryCode: string; city: string | null; venue: string | null; selected: Coordinate | null; observations: Coordinate[]; gaps: string[] };
  status: { value: 'existing' | 'removed' | 'temporary' | 'unknown'; evidenceDate: string | null; sourceIds: SourceId[]; notes: string[] };
  dimensions: { height: Height | null; observations: Height[]; heightDisplayRole?:string|null;comparisonEligible?:boolean|null; statedScale: { text: string; replicaToOriginal?: string | number | null; referenceHeightM?: number | null; sourceIds: SourceId[]; notes?: string[] } | null };
  history: { events: Array<{ kind: string; date: string; precision: 'year' | 'month' | 'day'; sourceIds: SourceId[]; notes?: string[] }> };
  appearance: { materials: Array<{ value: string; sourceIds: SourceId[] }>; colors: Array<{ value: string; sourceIds: SourceId[] }>; features: Array<{ text: string; sourceIds: SourceId[]; verification?: 'text' | 'image' }> };
  story: { text: string; sourceIds: SourceId[] } | null;
  sourceIds: SourceId[];
  mediaIds: MediaId[];
  researchStatus: 'candidate' | 'researched';
  modelStatus: 'not_started' | 'prototype';
  model: { key: string; status: 'prototype'; familyId: string; normalizationScope?:string; publicationEligibility?:'held'|'scope_reviewed'|'reference_only'|'related_only'|'other_only'; collection?:'core'|'reference'|'related'|'other'|'pending'; reviewReason?:string; modelContext?:'tower-body'|'inferred-completion' } | null;
  readiness: { mapLinkEnabled: boolean; heightComparisonEligible: boolean; galleryMediaAvailable: boolean; visualReferenceAvailable: boolean; evidenceCandidate: boolean; missing: string[] };
  maps: { preferred: 'amap' | 'google'; google: string | null; amap: string | null; status: 'available' | 'research_only' | 'unavailable'; reason: string | null };
  gaps: string[];
}
