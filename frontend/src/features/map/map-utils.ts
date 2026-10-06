export interface GeoPoint { latitude: number; longitude: number; }

export function interpolatePoint(from: GeoPoint, to: GeoPoint, progress: number): GeoPoint {
  const clamped = Math.min(Math.max(progress, 0), 1);
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * clamped,
    longitude: from.longitude + (to.longitude - from.longitude) * clamped,
  };
}

export function locationFromGeolocation(position: { coords: Pick<GeolocationCoordinates, 'latitude' | 'longitude'> }): GeoPoint {
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

export function getViewportPoints(user: GeoPoint, ambulance: GeoPoint, incident: GeoPoint, hospital: GeoPoint): GeoPoint[] {
  return [user, ambulance, incident, hospital];
}
