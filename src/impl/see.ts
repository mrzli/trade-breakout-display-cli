import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import {
  ByDayDataMap,
  ByDayEntry,
  ByMonthResult,
  ByMonthResultsMap,
  DataRow,
  SeeSingleInputParams,
  SeeResult,
  SeeResultForDay,
  SeeInputParams,
} from '../types';
import {
  printFull,
  cumSum,
  currentMaxArray,
  drawdownList,
  round,
} from './util';
import { MARGIN, MINUTES_TO_TRADE, NET_EARNINGS_FRACTION } from './constants';
import { processDay } from './process-day';

const input1: SeeSingleInputParams = {
  index: 'DAX',
  spread: 0.9,
  margin: MARGIN,
  stake: 100,
  limit: 6,
  stop: 9,
  dstMonthChange: 3,
  dstDayChange: 26,
  nonDstHourTradingStart: 8,
  openMinute: 0,
};

const input2: SeeSingleInputParams = {
  index: 'DJI',
  spread: 1.5,
  margin: MARGIN,
  stake: 50,
  limit: 9,
  stop: 9,
  dstMonthChange: 3,
  dstDayChange: 12,
  nonDstHourTradingStart: 14,
  openMinute: 30,
};

const input3: SeeSingleInputParams = {
  index: 'DJI',
  spread: 1.5,
  margin: MARGIN,
  stake: 10,
  limit: 30,
  stop: 9,
  dstMonthChange: 3,
  dstDayChange: 12,
  nonDstHourTradingStart: 14,
  openMinute: 30,
};

export async function seeAll(allInput: SeeInputParams): Promise<void> {
  const { tickerDataDir } = allInput;

  const results = await Promise.all(
    [input1, input2, input3].map((input) => calculate(tickerDataDir, input))
  );
  printFull(results);
  const netPerDay = results[0].pnlNetPerDay + results[1].pnlNetPerDay;
  console.log(netPerDay);
  console.log(netPerDay * 20);
}

async function calculate(
  tickerDataDir: string,
  input: SeeSingleInputParams
): Promise<SeeResult> {
  const { index, stake, openMinute } = input;

  const data = await fs.readFile(
    join(tickerDataDir, `${index}.minute.csv`),
    'utf8'
  );
  const lines = data
    .split('\n')
    .slice(1)
    .map((line) => toRow(line))
    .filter((row) => {
      const openHour = getOpenHour(input, row.month, row.day);
      return (
        (row.hour === openHour - 1 && row.minute >= openMinute) ||
        row.hour === openHour ||
        (row.hour === openHour + 1 && row.minute < openMinute)
      );
    });

  const byDayMap = lines.reduce<ByDayDataMap>((acc, row) => {
    const key = `${row.month}-${row.day}`;
    const existingValue = acc[key] ?? [];
    return { ...acc, [key]: [...existingValue, row] };
  }, {});

  const byDays: readonly ByDayEntry[] = Object.entries(byDayMap)
    .map((entry) => ({
      day: entry[0],
      data: entry[1],
    }))
    .filter((entry) => entry.data.length >= 60 + MINUTES_TO_TRADE);

  // const priceData = byDays.map((entry) => toPrices(entry)).join('\n');
  // await fs.writeFile('./scripts/see.txt', priceData, 'utf8');

  const results: readonly SeeResultForDay[] = byDays
    .map((entry) =>  processDay(input, entry))
    .filter(r => r !== undefined)
    .map(r => {
      if (!r) {
        throw new Error('Unexpected undefined result');
      }
      const { day, pnl, isUncertain } = r;
      return { d: day, v: round(pnl), q: isUncertain ? '?' : '+' };
    });

  const numTotal = results.length;
  const sum = results.reduce((acc, value) => acc + value.v, 0);
  const numPositive = results.filter((value) => value.v > 0).length;
  const numNegative = results.filter((value) => value.v < 0).length;
  const percentWin = round(numPositive / numTotal);
  const percentLoss = round(numNegative / numTotal);
  const numTotalDays = byDays.length;
  const percentTradingDays = round(numTotal / numTotalDays);

  const pnl = sum * stake;
  const pnlPerTrade = pnl / numTotal;
  const pnlPerDay = pnlPerTrade * percentTradingDays;

  const resultsByMonthObj = results.reduce<ByMonthResultsMap>(
    (acc, { d, v }) => {
      const m = d.split('-')[0];
      return {
        ...acc,
        [m]: (acc[m] || 0) + v,
      };
    },
    {}
  );

  const resultsByMonth: readonly ByMonthResult[] = Object.entries(
    resultsByMonthObj
  ).map(([m, v]) => ({
    m,
    v,
  }));

  const pnlPointList = results.map((r) => r.v);
  const pnlPointCumSum = cumSum(pnlPointList);
  const pnlPointMaxCumSum = currentMaxArray(pnlPointCumSum);
  const pnlPointDrawdownList = drawdownList(pnlPointCumSum, pnlPointMaxCumSum);
  const maxDrawdown = Math.min(...pnlPointDrawdownList);

  return {
    results,
    byMonth: resultsByMonth,
    cum: pnlPointCumSum,
    drawdownList: pnlPointDrawdownList,
    maxDrawdown,
    pnl,
    pnlPerTrade,
    pnlPerDay,
    pnlNetPerDay: pnlPerDay * NET_EARNINGS_FRACTION,
    numTotal,
    numPositive,
    numNegative,
    percentWin,
    percentLoss,
    numTotalDays,
    percentTradingDays,
  };
}

function toRow(line: string): DataRow {
  const [_ts, date, open, high, low, close] = line.split(',');
  const [_year, month, day, hour, minute] = date.split(/[:T-]/);

  return {
    month: Number.parseInt(month, 10),
    day: Number.parseInt(day, 10),
    hour: Number.parseInt(hour, 10),
    minute: Number.parseInt(minute, 10),
    o: Number.parseFloat(open),
    h: Number.parseFloat(high),
    l: Number.parseFloat(low),
    c: Number.parseFloat(close),
  };
}

function getOpenHour(
  input: SeeSingleInputParams,
  month: number,
  day: number
): number {
  const { dstMonthChange, dstDayChange, nonDstHourTradingStart } = input;

  return month < dstMonthChange ||
    (month === dstMonthChange && day < dstDayChange)
    ? nonDstHourTradingStart
    : nonDstHourTradingStart - 1;
}

// function toPrices(entry: ByDayEntry): string {
//   const { day, data } = entry;
//   const before = data.slice(0, 60);
//   const min = Math.min(...before.map((row) => row.l));
//   const max = Math.max(...before.map((row) => row.h));

//   const after = data
//     .slice(60, 60 + MINUTES_TO_TRADE)
//     .map(({ o, h, l, c }) => [o, h, l, c, (c - o).toFixed(2)].join(','));

//   return [day, [min, max].join(','), ...after].join('\n');
// }
