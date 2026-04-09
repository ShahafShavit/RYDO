export function routeMeta(route) {
  return [route.difficulty, route.terrain, route.duration].filter(Boolean).join(' • ');
}
