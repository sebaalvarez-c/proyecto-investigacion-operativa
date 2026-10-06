export interface RouteOption {
  distanceMeters: number;
  estimatedMinutes: number;
  polyline?: string;
  label?: string;
}

export function parseDurationSeconds(duration?: string): number {
  const seconds = Number.parseFloat(duration?.replace(/s$/, '') ?? '0');
  return Number.isFinite(seconds) ? seconds : 0;
}

export function chooseRecommendedRoute(routes: RouteOption[]): { primary: RouteOption; alternatives: RouteOption[] } {
  const ordered = [...routes].sort((left, right) => left.estimatedMinutes - right.estimatedMinutes || left.distanceMeters - right.distanceMeters);
  const [primary, ...alternatives] = ordered;
  if (!primary) throw new Error('No route options available');
  return { primary, alternatives };
}
