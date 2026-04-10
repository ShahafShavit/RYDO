export function routeMeta(route) {
  return [route.difficulty, route.terrain, route.estimatedDurationMinutes ? `${route.estimatedDurationMinutes}m` : null]
    .filter(Boolean)
    .join(' • ');
}
