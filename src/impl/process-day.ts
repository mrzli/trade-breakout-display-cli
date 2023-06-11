import {
  SeeSingleInputParams,
  ByDayEntry,
  DataRow,
  ProcessDayResult,
  TradeEventWithUncertainty,
} from '../types';
import { MINUTES_TO_TRADE } from './constants';

export function processDay(
  input: SeeSingleInputParams,
  entry: ByDayEntry
): ProcessDayResult | undefined {
  const { spread, limit, stop, margin } = input;
  const { day, data } = entry;

  const halfSpread = spread / 2;
  const limitPnl = limit;
  const stopPnl = -stop;

  const before = data.slice(0, 60);
  const min = Math.min(...before.map((row) => row.l)) - margin;
  const max = Math.max(...before.map((row) => row.h)) + margin;

  const after = data.slice(60);

  let triggered = 'none';
  let triggeredAt = 0;

  for (const [index, row] of after.entries()) {
    // console.log(min, max, row);
    const { o, h, l, c } = row;

    if (triggered === 'up') {
      // already in buy
      const { event, isUncertain } = checkWhileBuy(input, row, triggeredAt);
      if (event === 'stop') {
        return { day, pnl: stopPnl, isUncertain };
      } else if (event === 'limit') {
        return { day, pnl: limitPnl, isUncertain };
      }
    } else if (triggered === 'down') {
      // already in sell
      const { event, isUncertain } = checkWhileSell(input, row, triggeredAt);
      if (event === 'stop') {
        return { day, pnl: stopPnl, isUncertain };
      } else if (event === 'limit') {
        return { day, pnl: limitPnl, isUncertain };
      }
    } else {
      // not yet in trade
      if (index >= MINUTES_TO_TRADE) {
        return undefined;
      }

      if (o >= max) {
        // trigger buy at open
        triggered = 'up';
        triggeredAt = o + halfSpread;

        const { event, isUncertain } = checkWhileBuy(input, row, triggeredAt);
        if (event === 'stop') {
          return { day, pnl: stopPnl, isUncertain };
        } else if (event === 'limit') {
          return { day, pnl: limitPnl, isUncertain };
        }
      } else if (o <= min) {
        // trigger sell at open
        triggered = 'down';
        triggeredAt = o - halfSpread;

        const { event, isUncertain } = checkWhileSell(input, row, triggeredAt);
        if (event === 'stop') {
          return { day, pnl: stopPnl, isUncertain };
        } else if (event === 'limit') {
          return { day, pnl: limitPnl, isUncertain };
        }
      } else {
        const rise = o <= c;
        if (rise) {
          if (l <= min) {
            triggered = 'down';
            triggeredAt = min - halfSpread;

            const low = triggeredAt - limit - halfSpread;
            const high = triggeredAt + stop - halfSpread;

            const underLow = l <= low;
            const overHigh = h >= high;

            if (underLow) {
              return { day, pnl: limitPnl, isUncertain: overHigh };
            } else if (overHigh) {
              return { day, pnl: stopPnl, isUncertain: underLow };
            }
          } else if (h >= max) {
            triggered = 'up';
            triggeredAt = max + halfSpread;

            const low = triggeredAt + limit + halfSpread;
            const high = triggeredAt - stop + halfSpread;

            const underLow = l <= low;
            const overHigh = h >= high;

            if (overHigh) {
              return { day, pnl: limitPnl, isUncertain: underLow };
            }
          }
        } else {
          if (h >= max) {
            triggered = 'up';
            triggeredAt = max + halfSpread;

            const low = triggeredAt + limit + halfSpread;
            const high = triggeredAt - stop + halfSpread;

            const underLow = l <= low;
            const overHigh = h >= high;

            if (overHigh) {
              return { day, pnl: limitPnl, isUncertain: underLow };
            } else if (underLow) {
              return { day, pnl: stopPnl, isUncertain: overHigh };
            }
          } else if (l <= min) {
            triggered = 'down';
            triggeredAt = min - halfSpread;

            const low = triggeredAt - limit - halfSpread;
            const high = triggeredAt + stop - halfSpread;

            const underLow = l <= low;
            const overHigh = h >= high;

            if (underLow) {
              return { day, pnl: limitPnl, isUncertain: overHigh };
            }
          }
        }
      }
    }
  }

  const lastClose = after.at(-1)?.c;
  if (lastClose === undefined) {
    throw new Error('lastClose is undefined');
  }

  const pnl = getPnl(triggered, lastClose, triggeredAt, halfSpread);
  if (pnl === undefined) {
    return undefined;
  }

  return { day, pnl, isUncertain: false };
}

function getPnl(
  triggered: string,
  lastClose: number,
  triggeredAt: number,
  halfSpread: number
): number | undefined {
  switch (triggered) {
    case 'up': {
      return lastClose - triggeredAt - halfSpread;
    }
    case 'down': {
      return triggeredAt - lastClose - halfSpread;
    }
    default: {
      return undefined;
    }
  }
}

function checkWhileBuy(
  input: SeeSingleInputParams,
  row: DataRow,
  triggeredAt: number
): TradeEventWithUncertainty {
  const { spread, limit, stop } = input;
  const halfSpread = spread / 2;

  const { o, h, l, c } = row;
  const rise = o <= c;

  const low = triggeredAt - stop + halfSpread;
  const high = triggeredAt + limit + halfSpread;

  const underLow = l <= low;
  const overHigh = h >= high;

  if (rise) {
    // check low first
    if (underLow) {
      return { event: 'stop', isUncertain: overHigh };
    } else if (overHigh) {
      return { event: 'limit', isUncertain: underLow };
    }
  } else {
    // check high first
    if (overHigh) {
      return { event: 'limit', isUncertain: underLow };
    } else if (underLow) {
      return { event: 'stop', isUncertain: overHigh };
    }
  }

  return { event: 'none', isUncertain: false };
}

function checkWhileSell(
  input: SeeSingleInputParams,
  row: DataRow,
  triggeredAt: number
): TradeEventWithUncertainty {
  const { spread, limit, stop } = input;
  const halfSpread = spread / 2;

  const { o, h, l, c } = row;
  const rise = o <= c;

  const low = triggeredAt - limit - halfSpread;
  const high = triggeredAt + stop - halfSpread;

  const underLow = l <= low;
  const overHigh = h >= high;

  if (rise) {
    // check low first
    if (underLow) {
      return { event: 'limit', isUncertain: overHigh };
    } else if (overHigh) {
      return { event: 'stop', isUncertain: underLow };
    }
  } else {
    // check high first
    if (overHigh) {
      return { event: 'stop', isUncertain: underLow };
    } else if (underLow) {
      return { event: 'limit', isUncertain: overHigh };
    }
  }

  return { event: 'none', isUncertain: false };
}
