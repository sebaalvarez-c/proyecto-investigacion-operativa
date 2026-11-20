import { expect, it } from 'vitest';
import { solveTransportTrace } from './transport-trace.js';

it('balances supply and returns an optimal allocation even with a degenerate basis', () => {
  const result = solveTransportTrace([[4, 1, 7], [2, 5, 6], [0, 0, 0]], [1, 1, 1], [1, 1, 1]);
  expect(result.final).toEqual([[0, 1, 0], [1, 0, 0], [0, 0, 1]]);
  expect(result.finalCost).toBe(3);
  expect(result.vogel.reduce((total, step) => total + step.quantity, 0)).toBe(3);
});

it('shows the improvement from 13 to 11 after a degenerate pivot', () => {
  const result = solveTransportTrace([[4, 12, 7], [4, 2, 7], [12, 2, 5]], [1, 1, 1], [1, 1, 1]);
  expect(result.initialCost).toBe(13);
  expect(result.improvements.map((step) => [step.delta, step.quantity, step.cost]))
    .toEqual([[-10, 0, 13], [-2, 1, 11]]);
  expect(result.final).toEqual([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
});
