export const MAX_COMPARISON_TOWERS = 4;

/** @param {string[]} queue @param {string} id */
export function toggleComparisonQueue(queue, id) {
  if (queue.includes(id)) return { ids: queue.filter(value => value !== id), replaced: null, added: false };
  const retained = queue.slice(-(MAX_COMPARISON_TOWERS - 1));
  return { ids: [...retained, id], replaced: queue.length >= MAX_COMPARISON_TOWERS ? queue[0] : null, added: true };
}
