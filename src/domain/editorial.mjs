export function mergeEnglishEditorial(base, increment = {}) {
  const towers = { ...base.towers }, routes = { ...base.routes };
  for (const [id, entry] of Object.entries(increment.towers ?? {})) towers[id] = { ...towers[id], ...entry };
  for (const [id, entry] of Object.entries(increment.routes ?? {})) routes[id] = { ...routes[id], ...entry };
  return { ...base, towers, routes };
}
