import { describe, expect, it } from 'vitest';
import { chooseRecommendedRoute, parseDurationSeconds } from './route-utils.js';

describe('route utilities', () => {
  it('parses Google duration strings', () => {
    expect(parseDurationSeconds('123.4s')).toBe(123.4);
    expect(parseDurationSeconds(undefined)).toBe(0);
  });

  it('chooses the fastest route and preserves alternatives ordered by time', () => {
    const result = chooseRecommendedRoute([
      { distanceMeters: 1800, estimatedMinutes: 4.2, polyline: 'longer' },
      { distanceMeters: 1600, estimatedMinutes: 3.1, polyline: 'best' },
      { distanceMeters: 1200, estimatedMinutes: 3.8, polyline: 'middle' },
    ]);

    expect(result.primary.polyline).toBe('best');
    expect(result.alternatives.map((route) => route.polyline)).toEqual(['middle', 'longer']);
  });
});
