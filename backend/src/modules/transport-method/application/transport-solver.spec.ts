import { describe, expect, it } from 'vitest';
import type { TransportProblem } from '../domain/transport.types.js';
import { solveByMinimumCost } from './transport-solver.js';

const sampleProblem: TransportProblem = {
  origins: ['AMB-SC-01', 'AMB-SC-02', 'AMB-SC-03'],
  destinations: ['HOSPITAL-01', 'HOSPITAL-02', 'HOSPITAL-03'],
  costs: [
    [12, 18, 25],
    [20, 10, 16],
    [15, 22, 8],
  ],
  supply: [1, 1, 1],
  demand: [1, 1, 1],
};

describe('solveByMinimumCost', () => {
  it('assigns the sample matrix to the lowest total cost', () => {
    const solution = solveByMinimumCost(sampleProblem);

    expect(solution.method).toBe('MINIMUM_COST');
    expect(solution.totalCost).toBe(30);
    expect(solution.allocations).toEqual([
      { originId: 'AMB-SC-03', destinationId: 'HOSPITAL-03', quantity: 1, unitCost: 8, totalCost: 8 },
      { originId: 'AMB-SC-02', destinationId: 'HOSPITAL-02', quantity: 1, unitCost: 10, totalCost: 10 },
      { originId: 'AMB-SC-01', destinationId: 'HOSPITAL-01', quantity: 1, unitCost: 12, totalCost: 12 },
    ]);
    expect(solution.iterations).toHaveLength(3);
  });

  it('breaks equal costs by origin and destination order', () => {
    const solution = solveByMinimumCost({
      origins: ['A', 'B'],
      destinations: ['X', 'Y'],
      costs: [[5, 5], [5, 5]],
      supply: [1, 1],
      demand: [1, 1],
    });

    expect(solution.allocations).toEqual([
      { originId: 'A', destinationId: 'X', quantity: 1, unitCost: 5, totalCost: 5 },
      { originId: 'B', destinationId: 'Y', quantity: 1, unitCost: 5, totalCost: 5 },
    ]);
  });

  it('rejects empty origins or destinations', () => {
    expect(() => solveByMinimumCost({ ...sampleProblem, origins: [] })).toThrow('origins');
    expect(() => solveByMinimumCost({ ...sampleProblem, destinations: [] })).toThrow('destinations');
  });

  it('rejects negative costs and mismatched matrix dimensions', () => {
    expect(() => solveByMinimumCost({ ...sampleProblem, costs: [[-1, 2, 3], [4, 5, 6], [7, 8, 9]] })).toThrow('negative');
    expect(() => solveByMinimumCost({ ...sampleProblem, costs: [[1, 2]] })).toThrow('dimensions');
  });

  it('rejects unbalanced supply and demand', () => {
    expect(() => solveByMinimumCost({ ...sampleProblem, demand: [1, 1, 2] })).toThrow('balanced');
  });
});
