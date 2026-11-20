export interface Cell { row: number; col: number }
export interface VogelStep extends Cell {
  quantity: number;
  penalty: number;
  axis: 'row' | 'column';
  index: number;
  alternatives: number[];
  rowPenalties: (number | null)[];
  columnPenalties: (number | null)[];
}

export function solveTransportTrace(costs: number[][], supply: number[], demand: number[]) {
  const rows = supply.length;
  const cols = demand.length;
  const cells = supply.flatMap((_, row) => demand.map((__, col) => ({ row, col })));
  const key = ({ row, col }: Cell) => row * cols + col;
  const cost = ({ row, col }: Cell) => costs[row][col];
  const allocation = supply.map(() => demand.map(() => 0));
  const total = () => cells.reduce((sum, cell) => sum + allocation[cell.row][cell.col] * cost(cell), 0);
  const left = [...supply];
  const needed = [...demand];
  const vogel: VogelStep[] = [];

  while (left.some((value) => value > 0)) {
    function rank(axis: 'row' | 'column', index: number) {
      const choices = cells.filter((cell) => left[cell.row] > 0 && needed[cell.col] > 0 &&
        (axis === 'row' ? cell.row === index : cell.col === index));
      choices.sort((a, b) => cost(a) - cost(b) || key(a) - key(b));
      if (!choices.length) return null;
      const alternatives = choices.slice(0, 2).map(cost);
      return { cell: choices[0], axis, index, alternatives,
        penalty: alternatives.length === 2 ? alternatives[1] - alternatives[0] : alternatives[0] };
    }
    const rowRanks = left.map((_, index) => rank('row', index));
    const columnRanks = needed.map((_, index) => rank('column', index));
    const ranked = [...rowRanks, ...columnRanks].filter((entry) => entry !== null);
    ranked.sort((a, b) => b.penalty - a.penalty || cost(a.cell) - cost(b.cell) || key(a.cell) - key(b.cell));
    const { cell: { row, col }, ...choice } = ranked[0];
    const quantity = Math.min(left[row], needed[col]);
    allocation[row][col] = quantity;
    left[row] -= quantity;
    needed[col] -= quantity;
    vogel.push({ row, col, quantity, ...choice, rowPenalties: rowRanks.map((entry) => entry?.penalty ?? null),
      columnPenalties: columnRanks.map((entry) => entry?.penalty ?? null) });
  }

  const initial = allocation.map((row) => [...row]);
  const initialCost = total();
  const basis = new Set(cells.filter(({ row, col }) => allocation[row][col] > 0).map(key));
  function path(from: number, to: number, seen = new Set<number>()): Cell[] | undefined {
    if (from === to) return [];
    seen.add(from);
    for (const cell of cells) {
      if (!basis.has(key(cell))) continue;
      const column = rows + cell.col;
      const next = from === cell.row ? column : from === column ? cell.row : -1;
      if (next < 0 || seen.has(next)) continue;
      const rest = path(next, to, seen);
      if (rest) return [cell, ...rest];
    }
  }
  // Connect degenerate bases with zero allocations while keeping the basis cycle-free.
  for (const cell of cells) {
    if (!path(cell.row, rows + cell.col)) basis.add(key(cell));
  }

  const improvements: { cycle: Cell[]; delta: number; quantity: number; cost: number }[] = [];
  while (true) {
    let improved = false;
    // Bland's rule resolves zero-quantity pivots without cycling.
    for (const cell of cells) {
      if (basis.has(key(cell))) continue;
      const cycle = [cell, ...path(cell.row, rows + cell.col)!];
      const delta = cycle.reduce((sum, point, i) => sum + (i % 2 ? -cost(point) : cost(point)), 0);
      if (delta >= 0) continue;
      const minus = cycle.filter((_, i) => i % 2);
      minus.sort((a, b) => allocation[a.row][a.col] - allocation[b.row][b.col] || key(a) - key(b));
      const leaving = minus[0];
      const quantity = allocation[leaving.row][leaving.col];
      cycle.forEach(({ row, col }, i) => { allocation[row][col] += i % 2 ? -quantity : quantity; });
      basis.delete(key(leaving));
      basis.add(key(cell));
      improvements.push({ cycle, delta, quantity, cost: total() });
      improved = true;
      break;
    }
    if (!improved) break;
  }
  return { initial, initialCost, final: allocation, finalCost: total(), vogel, improvements };
}
