import { useEffect, useState } from 'react';
import { searchNASAImage } from '@/lib/nasa';
import { proxyImage } from '@/lib/imageProxy';

interface Props {
  src?: string;
  fallbackQuery: string;
  alt: string;
  className?: string;
}

// Loads `src` first; if it errors (or is missing), searches NASA's image
// library for `fallbackQuery` and uses the first result. All URLs routed
// through the image proxy for CORS + reliability.
export function SmartImage({ src, fallbackQuery, alt, className }: Props) {
  const [current, setCurrent] = useState<string | null>(src ? proxyImage(src, { w: 800 }) : null);
  const [triedFallback, setTriedFallback] = useState(false);

  useEffect(() => {
    setCurrent(src ? proxyImage(src, { w: 800 }) : null);
    setTriedFallback(false);
  }, [src]);

  const handleError = async () => {
    if (triedFallback) {
      setCurrent(null);
      return;
    }
    setTriedFallback(true);
    const nasa = await searchNASAImage(fallbackQuery);
    if (nasa) setCurrent(proxyImage(nasa, { w: 800 }));
    else setCurrent(null);
  };

  if (!current) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted/30 text-[10px] text-muted-foreground`}>
        No image available
      </div>
    );
  }
  return <img src={current} alt={alt} className={className} onError={handleError} loading="lazy" />;
}
