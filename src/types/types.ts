export interface SeeInputParams {
  readonly tickerDataDir: string;
}

export interface SeeSingleInputParams {
  readonly index: string;
  readonly spread: number;
  readonly margin: number;
  readonly stake: number;
  readonly limit: number;
  readonly stop: number;
  readonly dstMonthChange: number;
  readonly dstDayChange: number;
  readonly nonDstHourTradingStart: number;
  readonly openMinute: number;
}

export interface SeeResult {
  readonly results: readonly SeeResultForDay[];
  readonly byMonth: readonly ByMonthResult[];
  readonly cum: readonly number[];
  readonly drawdownList: readonly number[];
  readonly maxDrawdown: number;
  readonly pnl: number;
  readonly pnlPerTrade: number;
  readonly pnlPerDay: number;
  readonly pnlNetPerDay: number;
  readonly numTotal: number;
  readonly numPositive: number;
  readonly numNegative: number;
  readonly percentWin: number;
  readonly percentLoss: number;
  readonly numTotalDays: number;
  readonly percentTradingDays: number;
}

export interface DataRow {
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly o: number;
  readonly h: number;
  readonly l: number;
  readonly c: number;
}

export type ByDayDataMap = {
  readonly [key: string]: readonly DataRow[];
};

export interface ByDayEntry {
  readonly day: string;
  readonly data: readonly DataRow[];
}

export interface SeeResultForDay {
  readonly d: string;
  readonly v: number;
  readonly q: '?' | '+';
}

export type ByMonthResultsMap = {
  readonly [key: string]: number;
};

export interface ByMonthResult {
  readonly m: string;
  readonly v: number;
}

export interface ProcessDayResult {
  readonly day: string;
  readonly pnl: number;
  readonly isUncertain: boolean;
}

export type TradeEvent = 'stop' | 'limit' | 'none';

export interface TradeEventWithUncertainty {
  readonly event: TradeEvent;
  readonly isUncertain: boolean;
}
