import { inspect } from 'node:util';

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function cumSum(arr: readonly number[]): readonly number[] {
  const result = [];
  let sum = 0;
  for (const value of arr) {
    sum += value;
    result.push(sum);
  }
  return result;
}

export function currentMaxArray(arr: readonly number[]): readonly number[] {
  const result = [];
  let max = 0;
  for (const value of arr) {
    if (value > max) {
      max = value;
    }
    result.push(max);
  }
  return result;
}

export function drawdownList(
  cum: readonly number[],
  maxCum: readonly number[]
): readonly number[] {
  const result = [];
  for (const [i, cumItem] of cum.entries()) {
    result.push(cumItem - maxCum[i]);
  }
  return result;
}

export function printFull(value: unknown): void {
  console.log(
    inspect(value, { showHidden: false, depth: undefined, colors: true })
  );
}
