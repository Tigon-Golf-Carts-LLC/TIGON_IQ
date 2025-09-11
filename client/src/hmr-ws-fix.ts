// HMR WebSocket fix for Replit environment
// This fixes the issue where Vite HMR WebSocket tries to connect to localhost:undefined
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const OriginalWS = window.WebSocket;
  // @ts-ignore - allow ctor override in dev
  window.WebSocket = function(url: string | URL, protocols?: string | string[]) {
    try {
      const s = String(url);
      if (s.includes('localhost:undefined')) {
        const fixed = s.replace('localhost:undefined', window.location.host);
        return new OriginalWS(fixed, protocols as any);
      }
    } catch (_) {}
    // fallback
    // @ts-ignore
    return new OriginalWS(url as any, protocols as any);
  } as any;
}