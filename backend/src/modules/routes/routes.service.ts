import { Injectable, NotFoundException } from '@nestjs/common';
import { RouteRepository } from '../../database/in-memory.repositories.js';
import { EmergencyRepository, AmbulanceRepository, HospitalRepository } from '../../database/in-memory.repositories.js';
import { InMemoryStore } from '../../database/in-memory-store.js';
import { DeterministicRouteProvider, GoogleRoutesProvider } from './route-provider.js';

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
  ) {}

  async createForEmergency(id: string, hasBlockage = false) {
    const emergency = this.emergencies.findById(id);
    if (!emergency) throw new NotFoundException('Emergency not found');
    if (!emergency.assignedAmbulanceId || !emergency.assignedHospitalId) throw new NotFoundException('Emergency has no assigned route');

    const ambulance = this.ambulances.findById(emergency.assignedAmbulanceId);
    const hospital = this.hospitals.findById(emergency.assignedHospitalId);
    if (!ambulance || !hospital) throw new NotFoundException('Assigned resources not found');

    const googleRoute = await this.googleRoutes.getRoutes(ambulance, hospital).catch(() => null);
    const fallbackPrimary = await this.provider.getRoute(ambulance, hospital);
    const primary = googleRoute?.primary ?? fallbackPrimary;
    const fallbackAlternative = hasBlockage ? await this.provider.getRoute(ambulance, hospital, { avoidBlockage: true }) : undefined;
    const alternatives = googleRoute?.alternatives ?? (fallbackAlternative ? [{ ...fallbackAlternative, label: 'Alternativa por bloqueo' }] : []);
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
