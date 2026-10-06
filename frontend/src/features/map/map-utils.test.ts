import { describe, expect, it } from 'vitest';
import { interpolatePoint, locationFromGeolocation, getViewportPoints, type GeoPoint } from './map-utils';

describe('map utilities', () => {
  it('interpolates the ambulance position along the selected route', () => {
    const from: GeoPoint = { latitude: -17.773, longitude: -63.17 };
    const to: GeoPoint = { latitude: -17.7617, longitude: -63.1656 };

    expect(interpolatePoint(from, to, 0.5)).toEqual({ latitude: -17.76735, longitude: -63.1678 });
  });

  it('converts browser geolocation into the coordinates used by the app', () => {
    expect(locationFromGeolocation({ coords: { latitude: -17.78, longitude: -63.17 } })).toEqual({ latitude: -17.78, longitude: -63.17 });
  });

  it('keeps the user, ambulance, incident, and hospital in the city viewport', () => {
    const points = getViewportPoints({ latitude: -17.79, longitude: -63.18 }, { latitude: -17.773, longitude: -63.17 }, { latitude: -17.7804, longitude: -63.1745 }, { latitude: -17.7617, longitude: -63.1656 });

    expect(points).toHaveLength(4);
    expect(points[0]).toEqual({ latitude: -17.79, longitude: -63.18 });
    expect(points[3]).toEqual({ latitude: -17.7617, longitude: -63.1656 });
  });
});
