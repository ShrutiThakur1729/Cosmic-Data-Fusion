// Route third-party image URLs through a public CORS-friendly image proxy.
// This makes NASA GSFC / EPIC / Wikimedia textures load reliably inside the
// WebGL canvas (which is strict about CORS-tainted images) and also survives
// origin outages by giving the browser a stable, cache-friendly URL.
//
// weserv.nl is a well-known free image caching proxy that returns permissive
// CORS headers. Falls back to the raw URL if the input is already same-origin
// or a data URI.

export function proxyImage(url: string, opts: { w?: number; h?: number } = {}): string {
  if (!url) return url;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  try {
    const u = new URL(url, window.location.origin);
    if (u.origin === window.location.origin) return url;
  } catch {
    return url;
  }
  const stripped = url.replace(/^https?:\/\//, '');
  const params = new URLSearchParams({ url: stripped, output: 'jpg' });
  if (opts.w) params.set('w', String(opts.w));
  if (opts.h) params.set('h', String(opts.h));
  return `https://images.weserv.nl/?${params.toString()}`;
}

// Convenience: build a proxied NASA/GSFC URL with a light cache-buster off.
export function proxyTexture(url: string): string {
  return proxyImage(url);
}
