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

export function decodeEncodedPolyline(encoded: string): GeoPoint[] {
  const points: GeoPoint[] = [];
  let index = 0; let latitude = 0; let longitude = 0;
  while (index < encoded.length) {
    let result = 0; let shift = 0; let byte: number;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    latitude += (result & 1) ? ~(result >> 1) : result >> 1;
    result = 0; shift = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    longitude += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push({ latitude: latitude / 1e5, longitude: longitude / 1e5 });
  }
  return points;
}
