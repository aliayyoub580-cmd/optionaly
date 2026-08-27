import { lazy, Suspense } from 'react';

const TradingPlatform = lazy(() => import('@/components/TradingPlatform'));

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B0E11' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
            <svg width="24" height="24" fill="none" stroke="#0B0E11" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M3 3v16a2 2 0 0 0 2 2h16" />
              <path d="M18 17V9" />
              <path d="M13 17V5" />
              <path d="M8 17v-3" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: '#848E9C' }}>Loading platform...</p>
        </div>
      </div>
    }>
      <TradingPlatform />
    </Suspense>
  );
}
