import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { Coordinate } from '../../database/in-memory-store.js';
import { RouteRepository } from '../../database/in-memory.repositories.js';
import { EmergencyRepository, AmbulanceRepository, HospitalRepository } from '../../database/in-memory.repositories.js';
import { InMemoryStore } from '../../database/in-memory-store.js';
import { DeterministicRouteProvider, GoogleRoutesProvider, OpenStreetMapRoutesProvider } from './route-provider.js';

@Injectable()
export class RoutesService {
  constructor(
    private readonly emergencies: EmergencyRepository,
    private readonly ambulances: AmbulanceRepository,
    private readonly hospitals: HospitalRepository,
    private readonly routes: RouteRepository,
    private readonly store: InMemoryStore,
    private readonly provider: DeterministicRouteProvider,
    private readonly googleRoutes: GoogleRoutesProvider,
    private readonly openStreetMapRoutes: OpenStreetMapRoutesProvider,
  ) {}

  async streetRoute(origin: Coordinate, destination: Coordinate) {
    const google = await this.googleRoutes.getRoutes(origin, destination).catch(() => null);
    const result = google ?? await this.openStreetMapRoutes.getRoutes(origin, destination).catch(() => null);
    if (!result?.primary.polyline) throw new ServiceUnavailableException('No se pudo calcular una ruta por calles. Intenta nuevamente.');
    return { origin: { latitude: origin.latitude, longitude: origin.longitude }, destination: { latitude: destination.latitude, longitude: destination.longitude }, ...result };
  }

  async createForEmergency(id: string, hasBlockage = false) {
    const emergency = this.emergencies.findById(id);
    if (!emergency) throw new NotFoundException('Emergency not found');
    if (!emergency.assignedAmbulanceId || !emergency.assignedHospitalId) throw new NotFoundException('Emergency has no assigned route');

    const ambulance = this.ambulances.findById(emergency.assignedAmbulanceId);
    const hospital = this.hospitals.findById(emergency.assignedHospitalId);
    if (!ambulance || !hospital) throw new NotFoundException('Assigned resources not found');

    const googleRoute = await this.googleRoutes.getRoutes(ambulance, hospital).catch(() => null);
    const streetRoute = googleRoute ?? await this.openStreetMapRoutes.getRoutes(ambulance, hospital);
    const fallbackPrimary = await this.provider.getRoute(ambulance, hospital);
    const primary = streetRoute?.primary ?? fallbackPrimary;
    const fallbackAlternative = hasBlockage ? await this.provider.getRoute(ambulance, hospital, { avoidBlockage: true }) : undefined;
    const alternatives = streetRoute?.alternatives ?? (fallbackAlternative ? [{ ...fallbackAlternative, label: 'Alternativa por bloqueo' }] : []);
    const alternative = alternatives[0];
    const route = this.routes.save({
      id: this.store.newId(),
      emergencyId: id,
      origin: { latitude: ambulance.latitude, longitude: ambulance.longitude },
      destination: { latitude: hospital.latitude, longitude: hospital.longitude },
      distanceMeters: primary.distanceMeters,
      estimatedMinutes: primary.estimatedMinutes,
      hasBlockage,
      alternativeRoute: alternative ? { ...alternative, reason: hasBlockage ? 'Bloqueo detectado en la ruta principal' : 'Alternativa por calle' } : undefined,
      alternatives,
      status: 'PRIMARY',
    });

    return { ...route, primary, alternative: route.alternativeRoute, alternatives };
  }
}
