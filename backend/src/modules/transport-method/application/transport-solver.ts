import type {
  TransportAllocation,
  TransportIteration,
  TransportProblem,
  TransportSolution,
} from '../domain/transport.types.js';

export function solveByMinimumCost(problem: TransportProblem): TransportSolution {
  validateProblem(problem);

  const remainingSupply = [...problem.supply];
  const remainingDemand = [...problem.demand];
  const allocations: TransportAllocation[] = [];
  const iterations: TransportIteration[] = [];

  while (remainingSupply.some((value) => value > 0)) {
    const candidate = findLowestAvailableCell(problem, remainingSupply, remainingDemand);

    if (!candidate) {
      throw new Error('Unable to complete a balanced transportation problem');
    }

    const quantity = Math.min(remainingSupply[candidate.originIndex], remainingDemand[candidate.destinationIndex]);
    const allocation: TransportAllocation = {
      originId: problem.origins[candidate.originIndex],
      destinationId: problem.destinations[candidate.destinationIndex],
      quantity,
      unitCost: candidate.unitCost,
      totalCost: quantity * candidate.unitCost,
    };

    allocations.push(allocation);
    iterations.push({
      step: iterations.length + 1,
      originId: allocation.originId,
      destinationId: allocation.destinationId,
      unitCost: allocation.unitCost,
      quantity: allocation.quantity,
    });

    remainingSupply[candidate.originIndex] -= quantity;
    remainingDemand[candidate.destinationIndex] -= quantity;
  }

  return {
    allocations,
    totalCost: allocations.reduce((sum, allocation) => sum + allocation.totalCost, 0),
    method: 'MINIMUM_COST',
    iterations,
  };
}

function validateProblem(problem: TransportProblem): void {
  if (problem.origins.length === 0) {
    throw new Error('The problem must contain at least one origins');
  }
  if (problem.destinations.length === 0) {
    throw new Error('The problem must contain at least one destinations');
  }
  if (problem.supply.length !== problem.origins.length || problem.demand.length !== problem.destinations.length) {
    throw new Error('Supply and demand dimensions must match origins and destinations');
  }
  if (problem.costs.length !== problem.origins.length || problem.costs.some((row) => row.length !== problem.destinations.length)) {
    throw new Error('Cost matrix dimensions must match origins and destinations');
  }
  if (problem.supply.some((value) => !Number.isFinite(value) || value < 0) || problem.demand.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('Supply and demand values must be non-negative finite numbers');
  }
  if (problem.costs.some((row) => row.some((value) => !Number.isFinite(value) || value < 0))) {
    throw new Error('Costs cannot contain negative or non-finite values');
  }

  const totalSupply = problem.supply.reduce((sum, value) => sum + value, 0);
  const totalDemand = problem.demand.reduce((sum, value) => sum + value, 0);
  if (totalSupply !== totalDemand) {
    throw new Error('Transportation problem must be balanced');
  }
}

function findLowestAvailableCell(
  problem: TransportProblem,
  remainingSupply: number[],
  remainingDemand: number[],
): { originIndex: number; destinationIndex: number; unitCost: number } | undefined {
  let best: { originIndex: number; destinationIndex: number; unitCost: number } | undefined;

  for (let originIndex = 0; originIndex < problem.origins.length; originIndex += 1) {
    if (remainingSupply[originIndex] === 0) continue;

    for (let destinationIndex = 0; destinationIndex < problem.destinations.length; destinationIndex += 1) {
      if (remainingDemand[destinationIndex] === 0) continue;

      const unitCost = problem.costs[originIndex][destinationIndex];
      if (!best || unitCost < best.unitCost) {
        best = { originIndex, destinationIndex, unitCost };
      }
    }
  }

  return best;
}
