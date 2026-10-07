export type TransportMethod = 'MINIMUM_COST';

export interface TransportProblem {
  origins: string[];
  destinations: string[];
  costs: number[][];
  supply: number[];
  demand: number[];
}

export interface TransportAllocation {
  originId: string;
  destinationId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface TransportIteration {
  step: number;
  originId: string;
  destinationId: string;
  unitCost: number;
  quantity: number;
}

export interface TransportSolution {
  allocations: TransportAllocation[];
  totalCost: number;
  method: TransportMethod;
  iterations: TransportIteration[];
}
