/** Keep one compiled page on one immutable research/model snapshot. */
export function selectPublicSnapshot(previous, next) {
  if (!previous) return next;
  if (previous.generatedAt && next.generatedAt && previous.generatedAt !== next.generatedAt) return previous;
  return (previous.communityRevision ?? 0) === (next.communityRevision ?? 0) ? previous : next;
}
