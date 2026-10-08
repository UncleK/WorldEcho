const publicCollections = new Set(['core', 'reference', 'related', 'other']);
export function isPublicModel(model) {
  if (!model || !publicCollections.has(model.collection)) return false;
  return model.publicationEligibility === (model.collection === 'core' ? 'scope_reviewed' : `${model.collection}_only`);
}
