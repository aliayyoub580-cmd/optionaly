import { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickSeries, CandlestickData, Time, SeriesMarker } from 'lightweight-charts';
import { useTradingStore } from '@/store/trading-store';
import { Clock } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface TradeOverlayPos {
  id: string;
  direction: 'up' | 'down';
  amount: number;
  entryPrice: number;
  expirySeconds: number;
  openedAt: number;
  y: number;
  startX: number;
  endX: number;
}

// ─── SINGLE TRADE LINE OVERLAY ───
function TradeLineOverlay({ pos, isUp, color, bgColor }: {
  pos: TradeOverlayPos;
  isUp: boolean;
  color: string;
  bgColor: string;
}) {
  const [remaining, setRemaining] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const endTime = pos.openedAt + pos.expirySeconds * 1000;
      const left = Math.max(0, Math.ceil((endTime - now) / 1000));
      const el = Math.floor((now - pos.openedAt) / 1000);
      setRemaining(left);
      setElapsed(el);
    };
    update();
    const iv = setInterval(update, 200);
    return () => clearInterval(iv);
  }, [pos.openedAt, pos.expirySeconds]);

  const elapsedStr = elapsed >= 60 ? `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}` : `00:${elapsed.toString().padStart(2, '0')}`;
  const remainingStr = remaining >= 60 ? `${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}` : `00:${remaining.toString().padStart(2, '0')}`;

  const lineY = pos.y;
  const entryDotX = Math.max(60, pos.startX);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {/* Horizontal dashed reference line across full chart */}
      <div className="absolute" style={{
        top: lineY,
        left: 0,
        right: 0,
        height: 1,
        borderTop: `1px dashed ${color}55`,
      }} />

      {/* Solid horizontal trade line from entry point to right */}
      <div className="absolute" style={{
        top: lineY,
        left: entryDotX,
        width: Math.max(0, pos.endX - entryDotX),
        height: 2,
        background: color,
        boxShadow: `0 0 8px ${color}`,
        opacity: 0.95,
      }} />

      {/* Entry point dot */}
      <div className="absolute" style={{
        left: entryDotX - 5,
        top: lineY - 5,
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: '#fff',
        border: `2px solid ${color}`,
        boxShadow: `0 0 8px ${color}`,
      }} />

      {/* Vertical dashed line at entry point */}
      <div className="absolute" style={{
        left: entryDotX,
        top: Math.max(0, lineY - 30),
        width: 1,
        height: 60,
        borderLeft: `1px dashed ${color}66`,
      }} />

      {/* Left label badge */}
      <div className="absolute pointer-events-auto" style={{
        left: Math.max(4, entryDotX - 145),
        top: Math.max(4, lineY - 28),
      }}>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap"
          style={{
            background: bgColor,
            color: '#fff',
            boxShadow: `0 2px 10px ${color}66`,
          }}>
          <span>{isUp ? '▲' : '▼'} {isUp ? 'UP' : 'DOWN'}</span>
          <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 3, padding: '0 4px', fontSize: 10 }}>${pos.amount}</span>
          <span style={{ opacity: 0.85 }}>{elapsedStr}</span>
        </div>
      </div>

      {/* Right countdown badge */}
      <div className="absolute pointer-events-auto" style={{
        right: 4,
        top: Math.max(4, lineY - 12),
      }}>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold whitespace-nowrap"
          style={{
            background: '#1E2329',
            color: remaining <= 5 ? '#F6465D' : '#EAECEF',
            border: `1px solid ${remaining <= 5 ? '#F6465D' : color}`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
          }}>
          <Clock size={10} style={{ color: remaining <= 5 ? '#F6465D' : '#3B82F6' }} />
          {remainingStr}
        </div>
      </div>
    </div>
  );
}

// ─── TRADING CHART ───
export default function TradingChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const historicalLoadedRef = useRef<boolean>(false);
  const dbCandlesRef = useRef<CandlestickData<Time>[]>([]);
  const lastCandleTimeRef = useRef<number>(0);
  const lastServerCandleAtRef = useRef<number>(0);
  const visualCandleRef = useRef<{ time: number; open: number; high: number; low: number; close: number } | null>(null);

  const [overlayPositions, setOverlayPositions] = useState<TradeOverlayPos[]>([]);

  const { assets, selectedAsset, chartTimeframe, activeTrades } = useTradingStore();
  const hasSelectedAsset = Boolean(assets[selectedAsset]);

  // 1. Initialize Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { color: '#0B0E11' }, textColor: '#848E9C', fontSize: 12 },
      grid: { vertLines: { color: '#1E2329' }, horzLines: { color: '#1E2329' } },
      crosshair: { mode: 0, vertLine: { color: '#474D57', width: 1, style: 2 }, horzLine: { color: '#474D57', width: 1, style: 2 } },
      rightPriceScale: { borderColor: '#2B3139', scaleMargins: { top: 0.1, bottom: 0.1 }, autoScale: true },
      timeScale: { borderColor: '#2B3139', timeVisible: true, secondsVisible: true, rightOffset: 5, barSpacing: 6, minBarSpacing: 2, fixLeftEdge: true },
      handleScale: { axisPressedMouseMove: true },
      handleScroll: { vertTouchDrag: false },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#0ECB81', downColor: '#F6465D',
      borderUpColor: '#0ECB81', borderDownColor: '#F6465D',
      wickUpColor: '#0ECB81', wickDownColor: '#F6465D',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
      }
    });
    ro.observe(chartContainerRef.current);

    return () => {
      chart.remove();
      ro.disconnect();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // 2. Compute pixel coordinates for active trades & lightweight-charts markers
  const updateTradeMarkersAndOverlays = useCallback(() => {
    if (!seriesRef.current || !chartRef.current || !chartContainerRef.current) {
      setOverlayPositions([]);
      return;
    }

    const currentAssetTrades = activeTrades.filter(t => t.assetSymbol === selectedAsset);
    if (currentAssetTrades.length === 0) {
      setOverlayPositions([]);
      try {
        seriesRef.current.setMarkers([]);
      } catch (e) {}
      return;
    }

    const timeScale = chartRef.current.timeScale();
    const containerWidth = chartContainerRef.current.clientWidth;

    const positions: TradeOverlayPos[] = [];
    const markers: SeriesMarker<Time>[] = [];

    for (const trade of currentAssetTrades) {
      const y = seriesRef.current.priceToCoordinate(trade.entryPrice);
      const openedAtSec = Math.floor(trade.openedAt / 1000);
      const x = timeScale.timeToCoordinate(openedAtSec as Time);

      const isUp = trade.direction === 'up';

      // Lightweight-charts native series marker on candle
      if (openedAtSec > 0) {
        markers.push({
          time: openedAtSec as Time,
          position: isUp ? 'belowBar' : 'aboveBar',
          color: isUp ? '#0ECB81' : '#F6465D',
          shape: isUp ? 'arrowUp' : 'arrowDown',
          text: `${isUp ? 'UP' : 'DOWN'} $${trade.amount}`,
        });
      }

      // If price coordinate is valid and visible on chart
      if (y !== null && typeof y === 'number' && !isNaN(y)) {
        const startX = (x !== null && typeof x === 'number' && !isNaN(x)) ? x : Math.max(60, containerWidth - 300);
        positions.push({
          id: trade.id,
          direction: trade.direction,
          amount: trade.amount,
          entryPrice: trade.entryPrice,
          expirySeconds: trade.expirySeconds,
          openedAt: trade.openedAt,
          y,
          startX,
          endX: containerWidth - 50,
        });
      }
    }

    setOverlayPositions(positions);

    try {
      // Sort markers by ascending time as required by Lightweight Charts
      markers.sort((a, b) => (a.time as number) - (b.time as number));
      if (typeof (seriesRef.current as any).setMarkers === 'function') {
        (seriesRef.current as any).setMarkers(markers);
      }
    } catch (e) {
      console.warn('[TradingChart] Error setting markers:', e);
    }
  }, [activeTrades, selectedAsset]);

  // Recalculate overlay positions when visible logical range changes (pan / zoom)
  useEffect(() => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const handler = () => {
      updateTradeMarkersAndOverlays();
    };
    timeScale.subscribeVisibleLogicalRangeChange(handler);
    return () => {
      try {
        timeScale.unsubscribeVisibleLogicalRangeChange(handler);
      } catch (e) {}
    };
  }, [updateTradeMarkersAndOverlays]);

  // Recalculate overlays whenever activeTrades or selectedAsset changes
  useEffect(() => {
    updateTradeMarkersAndOverlays();
  }, [updateTradeMarkersAndOverlays]);

  // 3. Fetch continuous database candles on asset/timeframe switch
  useEffect(() => {
    let cancelled = false;
    historicalLoadedRef.current = false;
    lastCandleTimeRef.current = 0;

    const asset = assets[selectedAsset];
    if (!seriesRef.current) return;

    const tf = chartTimeframe;
    const currentCandle = asset?.currentCandles?.[tf];

    const digits = asset?.digits || (selectedAsset.includes('JPY') ? 3 : selectedAsset.includes('BTC') ? 2 : 5);
    const minPip = Math.pow(10, -digits);

    try {
      seriesRef.current.applyOptions({
        priceFormat: {
          type: 'price',
          precision: digits,
          minMove: minPip,
        },
      });
    } catch (e) {}

    (async () => {
      let dbCandles: any[] = [];
      try {
        const res = await apiFetch(`/api/prices/candles?symbol=${encodeURIComponent(selectedAsset)}&timeframe=${tf}&limit=500`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          dbCandles = data;
        }
      } catch (e) {}

      if (cancelled) return;

      const combined = [...dbCandles];
      if (currentCandle && dbCandles.length > 0 && currentCandle.time >= dbCandles[dbCandles.length - 1].time) {
        combined.push(currentCandle);
      }

      const map = new Map<number, { time: number; open: number; high: number; low: number; close: number }>();
      for (const c of combined) {
        if (!c || typeof c.time !== 'number' || isNaN(c.time)) continue;
        const bucketTime = Math.floor(c.time / tf) * tf;
        const open = Number(c.open);
        const close = Number(c.close);
        const rawHigh = Number(c.high);
        const rawLow = Number(c.low);
        let high = Math.max(rawHigh > 0 ? rawHigh : close, open, close);
        let low = Math.min(rawLow > 0 ? rawLow : close, open, close);

        if (!map.has(bucketTime)) {
          map.set(bucketTime, { time: bucketTime, open, high, low, close });
        } else {
          const existing = map.get(bucketTime)!;
          existing.high = Math.max(existing.high, high, open, close);
          existing.low = Math.min(existing.low, low, open, close);
          existing.close = close;
        }
      }

      const rawSorted = Array.from(map.values()).sort((a, b) => a.time - b.time);
      if (rawSorted.length === 0) return;

      // Filter out any disconnected historical chunks (e.g. time gap > 20 intervals from latest candle)
      let contiguous = rawSorted;
      if (rawSorted.length > 1) {
        const latestTime = rawSorted[rawSorted.length - 1].time;
        const maxAge = tf * 500; // Keep up to 500 contiguous intervals
        contiguous = rawSorted.filter(c => (latestTime - c.time) <= maxAge);
      }

      const validData: CandlestickData<Time>[] = contiguous.map((curr) => {
        let h = Math.max(curr.high, curr.open, curr.close);
        let l = Math.min(curr.low, curr.open, curr.close);
        if (h <= Math.max(curr.open, curr.close)) h = Math.max(curr.open, curr.close) + minPip * 2;
        if (l >= Math.min(curr.open, curr.close)) l = Math.min(curr.open, curr.close) - minPip * 2;

        return {
          time: curr.time as Time,
          open: curr.open,
          high: h,
          low: l,
          close: curr.close,
        };
      });

      dbCandlesRef.current = validData;

      if (validData.length > 0 && seriesRef.current) {
        try {
          seriesRef.current.setData(validData);
          historicalLoadedRef.current = true;
          lastCandleTimeRef.current = validData[validData.length - 1].time as number;

          requestAnimationFrame(() => {
            if (chartRef.current) {
              try {
                chartRef.current.timeScale().scrollToRealTime();
                updateTradeMarkersAndOverlays();
              } catch (e) {}
            }
          });
        } catch (err) {
          console.error('[TradingChart] Error setting initial candle data:', err);
        }
      }
    })();

    return () => { cancelled = true; };
  // `assets` is loaded asynchronously after the chart mounts. Re-run once
  // when that selected asset becomes available; without this, a cold Vercel
  // request can leave the chart initialized from an empty market snapshot.
  }, [selectedAsset, chartTimeframe, hasSelectedAsset, updateTradeMarkersAndOverlays]);

  // 4. Live update current candle in-place smoothly
  useEffect(() => {
    if (!historicalLoadedRef.current || !seriesRef.current) {
      return; // Block live updates until historical setData() finishes cleanly
    }

    const asset = assets[selectedAsset];
    if (!asset) return;

    const tf = chartTimeframe;
    const currentCandle = asset.currentCandles?.[tf];
    if (!currentCandle || typeof currentCandle.time !== 'number' || isNaN(currentCandle.time)) return;

    const digits = asset.digits || 5;
    const minPip = Math.pow(10, -digits);

    // Normalize live tick timestamp to timeframe boundary
    const bucketTime = Math.floor(currentCandle.time / tf) * tf;

    // Strict monotonic timestamp validation: ignore outdated ticks to prevent chart regression/flicker
    if (lastCandleTimeRef.current > 0 && bucketTime < lastCandleTimeRef.current) {
      return;
    }

    const open = Number(currentCandle.open);
    const close = Number(currentCandle.close);
    if (isNaN(open) || isNaN(close)) return;

    let high = Math.max(Number(currentCandle.high), open, close);
    let low = Math.min(Number(currentCandle.low), open, close);
    if (isNaN(high)) high = Math.max(open, close);
    if (isNaN(low)) low = Math.min(open, close);

    if (high <= Math.max(open, close)) high = Math.max(open, close) + minPip * 2;
    if (low >= Math.min(open, close)) low = Math.min(open, close) - minPip * 2;

    const updateObj = { time: bucketTime as Time, open, high, low, close };

    try {
      seriesRef.current.update(updateObj);
      lastCandleTimeRef.current = bucketTime;
      lastServerCandleAtRef.current = Date.now();
      visualCandleRef.current = { time: bucketTime, open, high, low, close };
      updateTradeMarkersAndOverlays();
    } catch (err) {
      console.warn('[TradingChart] Live update skipped safely:', err);
    }
  }, [assets, selectedAsset, chartTimeframe, updateTradeMarkersAndOverlays]);

  // Vercel functions can cold-start or be temporarily routed to different
  // instances. Keep the displayed *current* candle alive during a short gap
  // between authoritative server ticks. This only paints the chart; incoming
  // server prices immediately replace it and trade settlement remains server
  // authoritative.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!historicalLoadedRef.current || !seriesRef.current) return;
      if (Date.now() - lastServerCandleAtRef.current < 1200) return;

      const asset = useTradingStore.getState().assets[selectedAsset];
      if (!asset) return;

      const tf = chartTimeframe;
      const serverCandle = asset.currentCandles?.[tf];
      const digits = asset.digits || 5;
      const minMove = Math.pow(10, -digits);
      const nowBucket = Math.floor(Date.now() / 1000 / tf) * tf;
      const prior = visualCandleRef.current || serverCandle;
      if (!prior) return;

      const time = Math.max(lastCandleTimeRef.current, nowBucket, Number(prior.time) || 0);
      const priorClose = Number(prior.close);
      const basePrice = Number.isFinite(priorClose) && priorClose > 0
        ? priorClose
        : Number(asset.currentPrice);
      if (!Number.isFinite(basePrice) || basePrice <= 0) return;
      const priorOpen = Number(prior.open);
      const open = time > Number(prior.time)
        ? basePrice
        : (Number.isFinite(priorOpen) && priorOpen > 0 ? priorOpen : basePrice);
      const amplitude = Math.max(Math.abs(open) * 0.000002, minMove);
      const delta = (Math.random() - 0.5) * amplitude * 4;
      const close = Math.max(minMove, Math.round((basePrice + delta) / minMove) * minMove);
      const priorHigh = Number(prior.high);
      const priorLow = Number(prior.low);
      const high = Math.max(Number.isFinite(priorHigh) && priorHigh > 0 ? priorHigh : open, open, close);
      const low = Math.min(Number.isFinite(priorLow) && priorLow > 0 ? priorLow : open, open, close);
      const visual = { time, open, high, low, close };

      try {
        seriesRef.current.update({ ...visual, time: time as Time });
        lastCandleTimeRef.current = time;
        visualCandleRef.current = visual;
        updateTradeMarkersAndOverlays();
      } catch (e) {}
    }, 250);

    return () => window.clearInterval(timer);
  }, [selectedAsset, chartTimeframe, updateTradeMarkersAndOverlays]);

  return (
    <div className="relative w-full h-full select-none" style={{ background: '#0B0E11' }}>
      <div ref={chartContainerRef} className="w-full h-full" />

      {/* Render Active Trade Overlay Lines */}
      {overlayPositions.map((pos) => {
        const isUp = pos.direction === 'up';
        const color = isUp ? '#0ECB81' : '#F6465D';
        const bgColor = isUp ? 'linear-gradient(135deg, #0ECB81, #0AAB6B)' : 'linear-gradient(135deg, #F6465D, #D93A4F)';
        return (
          <TradeLineOverlay
            key={pos.id}
            pos={pos}
            isUp={isUp}
            color={color}
            bgColor={bgColor}
          />
        );
      })}
    </div>
  );
}
