const publicCollections = new Set(['core', 'reference', 'related', 'other', 'provisional']);
export function isPublicModel(model) {
  if (!model || !publicCollections.has(model.collection)) return false;
  return model.publicationEligibility === (model.collection === 'core' ? 'scope_reviewed' : `${model.collection}_only`);
}

/** A reviewed appearance can be shown without changing the research classification. */
export function isPublicResearchModel(classification,model) {
  return isPublicModel(model) && (['original','replica','local_variant'].includes(classification)
    || model.collection==='other' || model.collection==='provisional' || (['inspired','unresolved'].includes(classification)&&model.collection==='related'));
}
