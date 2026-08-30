const getInitialApiBase = () => {
  if (typeof window !== 'undefined') {
    // A Vercel deployment ships its backend as the same-origin `/api`
    // function.  Ignore a stale VITE_API_URL copied from the old Hostinger
    // deployment; otherwise the chart quietly polls another backend and the
    // request-driven Vercel market engine never receives a tick.
    if (window.location.hostname.endsWith('.vercel.app')) return '';
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:4000';
    }
    // On Vercel or custom domain, default to same-origin relative API
    return '';
  }
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return '';
};
const rawApiBase = getInitialApiBase();
const API_BASE = rawApiBase ? rawApiBase.replace(/\/+$/, '') : '';

export const API_URL = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');


/**
 * Enhanced fetch wrapper with automatic retry capabilities to handle transient network errors
 * (e.g. CORS preflight OPTIONS timeout / cold start 503s on Hostinger) transparently.
 */
async function fetchWithRetry(target: RequestInfo | URL, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(target, options);
      // If server returned 503 Service Unavailable, wait and retry
      if (response.status === 503 && i < retries - 1) {
        console.warn(`[API] 503 Service Unavailable, retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (err: any) {
      // If it is the last retry, throw the error
      if (i === retries - 1) throw err;
      console.warn(`[API] Connection failed, retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`, err);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return fetch(target, options); // Final fallback call
}

/**
 * Clean wrapper around fetch that automatically prepends the centralized
 * API_BASE URL for relative '/api/' requests and attaches admin JWT token if present.
 */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let target = input;
  if (typeof input === 'string') {
    if (input.startsWith('/api') || input.startsWith('api/')) {
      const path = input.startsWith('/') ? input : `/${input}`;
      target = `${API_BASE}${path}`;
    }
  }

  const options = init || {};
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || localStorage.getItem('token') || localStorage.getItem('trading_token'))
    : null;

  if (token) {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    options.headers = headers;
  }

  return fetchWithRetry(target, options);
}
