import React from 'react';

interface PaymentMethodLogoProps {
  method: string;
  size?: number;
  className?: string;
}

export default function PaymentMethodLogo({ method, size = 32, className = '' }: PaymentMethodLogoProps) {
  const m = (method || '').toLowerCase();

  // EasyPaisa (PKR)
  if (m.includes('easy') || m === 'wpay_ep' || m === 'wpay-ep') {
    return (
      <div
        className={`relative flex items-center justify-center rounded-lg overflow-hidden flex-shrink-0 bg-white shadow-sm border border-slate-700/50 ${className}`}
        style={{ width: size, height: size }}
        title="EasyPaisa"
      >
        <img
          src="/easypaisa%20icon.jpg"
          alt="EasyPaisa"
          className="w-full h-full object-contain p-0.5"
          onError={(e) => {
            // Fallback to SVG if image not found
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // JazzCash (PKR)
  if (m.includes('jazz') || m === 'wpay_jz' || m === 'wpay-jz') {
    return (
      <div
        className={`relative flex items-center justify-center rounded-lg overflow-hidden flex-shrink-0 bg-white shadow-sm border border-slate-700/50 ${className}`}
        style={{ width: size, height: size }}
        title="JazzCash"
      >
        <img
          src="/jazzcash.jpg"
          alt="JazzCash"
          className="w-full h-full object-contain p-0.5"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Bank Transfer (PKR / Direct Bank)
  if (m.includes('bank') || m === 'wpay_bank' || m === 'wpay-bank') {
    return (
      <div
        className={`relative flex items-center justify-center rounded-lg overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size, background: 'linear-gradient(135deg, #1E40AF 0%, #1D4ED8 100%)' }}
        title="Bank Transfer"
      >
        <svg viewBox="0 0 24 24" width={size * 0.65} height={size * 0.65} fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4" />
        </svg>
      </div>
    );
  }

  // USDT (BEP20 / BSC Network)
  if (m.includes('bep20') || m.includes('bsc') || m === 'usdtbsc') {
    return (
      <div
        className={`relative flex items-center justify-center rounded-lg overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size, background: '#26A17B' }}
        title="USDT (BEP20)"
      >
        <svg viewBox="0 0 32 32" width={size * 0.7} height={size * 0.7} fill="none">
          {/* Tether ₮ Logo */}
          <path
            d="M17.9 17.1c-.2 0-1 .1-1.9.1s-1.7 0-1.9-.1c-4.4-.2-7.7-1.1-7.7-2.1 0-1.1 3.3-1.9 7.7-2.1v3.3c.2 0 1 .1 1.9.1s1.7 0 1.9-.1v-3.3c4.4.2 7.7 1.1 7.7 2.1 0 1-3.3 1.9-7.7 2.1zm0-5.2v-3.1h6.7V5.5H7.4v3.3h6.7v3.1C8.7 12.1 4.5 13.5 4.5 15.1c0 1.6 4.2 3 9.6 3.2v8.2h3.8v-8.2c5.4-.2 9.6-1.6 9.6-3.2 0-1.6-4.2-3-9.6-3.2z"
            fill="white"
          />
        </svg>
        {/* BNB Smart Chain mini badge */}
        <div
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#1E2329]"
          style={{ background: '#F3BA2F' }}
          title="BNB Chain (BEP20)"
        >
          <svg viewBox="0 0 24 24" width="8" height="8" fill="#0B0E11">
            <path d="M12 2l3.5 3.5L12 9 8.5 5.5 12 2zm-7 7l3.5-3.5L12 9 8.5 12.5 5 9zm14 0l-3.5-3.5L12 9l3.5 3.5L19 9zM12 16l-3.5-3.5L12 9l3.5 3.5L12 16zm-7 0l3.5-3.5L12 16l-3.5 3.5L5 16zm14 0l-3.5-3.5L12 16l3.5 3.5L19 16zM12 22l-3.5-3.5L12 15l3.5 3.5L12 22z" />
          </svg>
        </div>
      </div>
    );
  }

  // USDT (TRC20 / TRON Network)
  if (m.includes('trc20') || m.includes('tron') || m === 'usdttrc20') {
    return (
      <div
        className={`relative flex items-center justify-center rounded-lg overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size, background: '#26A17B' }}
        title="USDT (TRC20)"
      >
        <svg viewBox="0 0 32 32" width={size * 0.7} height={size * 0.7} fill="none">
          <path
            d="M17.9 17.1c-.2 0-1 .1-1.9.1s-1.7 0-1.9-.1c-4.4-.2-7.7-1.1-7.7-2.1 0-1.1 3.3-1.9 7.7-2.1v3.3c.2 0 1 .1 1.9.1s1.7 0 1.9-.1v-3.3c4.4.2 7.7 1.1 7.7 2.1 0 1-3.3 1.9-7.7 2.1zm0-5.2v-3.1h6.7V5.5H7.4v3.3h6.7v3.1C8.7 12.1 4.5 13.5 4.5 15.1c0 1.6 4.2 3 9.6 3.2v8.2h3.8v-8.2c5.4-.2 9.6-1.6 9.6-3.2 0-1.6-4.2-3-9.6-3.2z"
            fill="white"
          />
        </svg>
        {/* TRON Red mini badge */}
        <div
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#1E2329]"
          style={{ background: '#EF0027' }}
          title="TRON (TRC20)"
        >
          <svg viewBox="0 0 24 24" width="7" height="7" fill="white">
            <path d="M2.5 3.5l19 3.5-9 14.5L2.5 3.5zm3.8 2.3l4.6 7.4 8.2-7.2L6.3 5.8z" />
          </svg>
        </div>
      </div>
    );
  }

  // USDT (ERC20 / Ethereum)
  if (m.includes('erc20') || m.includes('eth') || m === 'usdterc20') {
    return (
      <div
        className={`relative flex items-center justify-center rounded-lg overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size, background: '#26A17B' }}
        title="USDT (ERC20)"
      >
        <svg viewBox="0 0 32 32" width={size * 0.7} height={size * 0.7} fill="none">
          <path
            d="M17.9 17.1c-.2 0-1 .1-1.9.1s-1.7 0-1.9-.1c-4.4-.2-7.7-1.1-7.7-2.1 0-1.1 3.3-1.9 7.7-2.1v3.3c.2 0 1 .1 1.9.1s1.7 0 1.9-.1v-3.3c4.4.2 7.7 1.1 7.7 2.1 0 1-3.3 1.9-7.7 2.1zm0-5.2v-3.1h6.7V5.5H7.4v3.3h6.7v3.1C8.7 12.1 4.5 13.5 4.5 15.1c0 1.6 4.2 3 9.6 3.2v8.2h3.8v-8.2c5.4-.2 9.6-1.6 9.6-3.2 0-1.6-4.2-3-9.6-3.2z"
            fill="white"
          />
        </svg>
        {/* Ethereum mini badge */}
        <div
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#1E2329]"
          style={{ background: '#627EEA' }}
          title="Ethereum (ERC20)"
        >
          <svg viewBox="0 0 24 24" width="7" height="7" fill="white">
            <path d="M12 2L4 12.5L12 17L20 12.5L12 2ZM12 18.5L4 14L12 22L20 14L12 18.5Z" />
          </svg>
        </div>
      </div>
    );
  }

  // QR Code (PKR / WPay QR)
  if (m.includes('qr')) {
    return (
      <div
        className={`relative flex items-center justify-center rounded-lg overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size, background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)' }}
        title="QR Code"
      >
        <svg viewBox="0 0 24 24" width={size * 0.65} height={size * 0.65} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      </div>
    );
  }

  // UPI
  if (m.includes('upi')) {
    return (
      <div
        className={`relative flex items-center justify-center rounded-lg overflow-hidden flex-shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size, background: '#0F7C3C' }}
        title="UPI"
      >
        <svg viewBox="0 0 24 24" width={size * 0.7} height={size * 0.7} fill="none">
          <path d="M4 18L10 6L14 14L10 18H4Z" fill="#F47920" />
          <path d="M14 6L20 18H14L11 12L14 6Z" fill="#00A859" />
        </svg>
      </div>
    );
  }

  // Default Crypto / Other
  return (
    <div
      className={`relative flex items-center justify-center rounded-lg overflow-hidden flex-shrink-0 shadow-sm ${className}`}
      style={{ width: size, height: size, background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
      title="Crypto"
    >
      <svg viewBox="0 0 24 24" width={size * 0.65} height={size * 0.65} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M14.5 9h-4v6h4M10.5 12h3" />
      </svg>
    </div>
  );
}
