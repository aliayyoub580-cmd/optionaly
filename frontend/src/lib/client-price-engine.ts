// ─── CLIENT PRICE ENGINE STUB ───
// All candle generation and price calculation is 100% server-side in backend/src/helpers/priceEngine.js.
// This file is stubbed out to prevent duplicate timers, catch-up explosions, and client-side price generation.

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ClientTickData {
  symbol: string;
  price: number;
  candles: Record<number, Candle>;
  allPrices: Record<string, { price: number; payout: number; change: number }>;
}

export function initClientEngine() {
  // NO-OP: Client-side timers and candle generation are disabled to enforce single server-side engine.
}

export function stopClientEngine() {
  // NO-OP
}

export function setClientEngineCallback(_cb: (data: ClientTickData) => void) {
  // NO-OP
}

export function getInitialAssets() {
  return {};
}

export function getClientAssets() {
  return {};
}
