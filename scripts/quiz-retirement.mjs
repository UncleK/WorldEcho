import { validQuizSetId } from '../src/domain/quiz.ts';

export const DETAIL_PHOTO_ID = 'img_3a61c427abf5d9e7';
export const QUIZ_RETIREMENT_REASON = 'photograph_reclassified_as_detail';

/** Browser-safe format shared by loader, compiler and release validation. */
export function parseRetiredQuizSets(value) {
  if (!value || typeof value !== 'object' || value.version !== '1' || !Array.isArray(value.retiredSets)) {
    throw new Error('Invalid retired quiz-set manifest');
  }
  const seen = new Set();
  const retiredSets = value.retiredSets.map(record => {
    if (!record || !validQuizSetId(record.id) || seen.has(record.id)
      || !/^[a-f0-9]{64}$/.test(record.sha256 ?? '')
      || record.reason !== QUIZ_RETIREMENT_REASON
      || !/^\d{4}-\d{2}-\d{2}$/.test(record.retiredAt ?? '')
      || !Array.isArray(record.mediaIds) || !record.mediaIds.length
      || new Set(record.mediaIds).size !== record.mediaIds.length
      || record.mediaIds.some(id => id !== DETAIL_PHOTO_ID)) throw new Error('Invalid retired quiz-set record');
    seen.add(record.id);
    return { id: record.id, sha256: record.sha256, reason: record.reason, retiredAt: record.retiredAt, mediaIds: [...record.mediaIds] };
  });
  return { version: '1', retiredSets };
}

export function isRetiredQuizSet(manifest, setId) {
  return parseRetiredQuizSets(manifest).retiredSets.some(record => record.id === setId);
}

/** Input carries the hashes of exact original archive bytes; never reserialize sets. */
export function createQuizRetirements(archives, previous = { version: '1', retiredSets: [] }) {
  const retired = new Map(parseRetiredQuizSets(previous).retiredSets.map(record => [record.id, record]));
  const existingIds = new Set(archives.map(archive => archive.set.id));
  for (const record of retired.values()) if (!existingIds.has(record.id)) throw new Error(`Retired archive disappeared: ${record.id}`);
  for (const archive of archives) {
    const affected = archive.set.entries.some(entry => entry.photos.some(photo => photo.id === DETAIL_PHOTO_ID));
    const existing = retired.get(archive.set.id);
    if (existing && existing.sha256 !== archive.sha256) throw new Error(`Immutable retired set changed: ${archive.set.id}`);
    if (!affected) {
      if (existing) throw new Error(`Retired set lost its recorded affected photo: ${archive.set.id}`);
      continue;
    }
    if (!existing) retired.set(archive.set.id, { id: archive.set.id, sha256: archive.sha256,
      reason: QUIZ_RETIREMENT_REASON, retiredAt: '2026-10-07', mediaIds: [DETAIL_PHOTO_ID] });
  }
  return parseRetiredQuizSets({ version: '1', retiredSets: [...retired.values()].sort((a, b) => a.id.localeCompare(b.id)) });
}

/** Retired files are archive snapshots, while playable files follow current gates. */
export function validateQuizSetLifecycle(archives, manifest, currentSetId, qualifies) {
  const retirement = parseRetiredQuizSets(manifest);
  const retired = new Map(retirement.retiredSets.map(record => [record.id, record]));
  if (retired.has(currentSetId)) throw new Error('Current catalog points to a retired quiz set');
  if (!archives.some(archive => archive.set.id === currentSetId)) throw new Error('Current quiz set is missing');
  const available = new Set(archives.map(archive => archive.set.id));
  for (const record of retired.values()) if (!available.has(record.id)) throw new Error(`Retired archive is missing: ${record.id}`);
  for (const archive of archives) {
    const record = retired.get(archive.set.id);
    const affected = archive.set.entries.some(entry => entry.photos.some(photo => photo.id === DETAIL_PHOTO_ID));
    if (record) {
      if (record.sha256 !== archive.sha256) throw new Error(`Immutable retired set hash mismatch: ${archive.set.id}`);
      if (!affected) throw new Error(`Retired archive does not contain its stated photo: ${archive.set.id}`);
    } else {
      if (affected) throw new Error(`Detail photograph entered a playable set: ${archive.set.id}`);
      for (const entry of archive.set.entries) for (const photo of entry.photos) {
        if (!qualifies(entry.id, photo.id)) throw new Error(`Playable quiz photo no longer qualifies: ${archive.set.id}/${photo.id}`);
      }
    }
  }
  return { retiredQuizSets: retired.size, playableQuizSets: archives.length - retired.size };
}
