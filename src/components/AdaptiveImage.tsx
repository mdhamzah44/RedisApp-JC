import { useEffect, useRef, useState } from "react";

import { useNetworkQuality } from "@/hooks/use-network-quality";
import { cn } from "@/lib/utils";

export type ImageVariant = { src: string; width: number };

type AdaptiveImageProps = {
  alt: string;
  width: number;
  height: number;
  className?: string;
  wrapperClassName?: string;
  /**
   * Above-the-fold / LCP image (e.g. the hero). Loads eagerly at full
   * priority and skips the blur-up dance so it never delays LCP.
   */
  priority?: boolean;
  /** Tiny (~150–250 byte) base64 placeholder, painted instantly while the real image loads. */
  lowQualitySrc?: string | undefined;
  /**
   * Ascending list of real, differently-sized assets we control (build-time
   * exports). When present, a slow/metered connection gets served the
   * smallest sensible variant up front instead of whatever the viewport
   * would normally pick, then the full-resolution variant is quietly
   * fetched in the background (once the browser is idle) so it's already
   * cached the moment it's actually needed.
   */
  variants?: ImageVariant[];
  /** Single-resolution fallback — used as-is when there's no `variants` list (e.g. a seller-uploaded photo we don't control). */
  src?: string;
  sizes?: string;
};

function idle(cb: () => void) {
  if (typeof window === "undefined") return;
  const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(cb, { timeout: 4000 });
  else setTimeout(cb, 1500);
}

export function AdaptiveImage({
  alt,
  width,
  height,
  className,
  wrapperClassName,
  priority = false,
  lowQualitySrc,
  variants,
  src,
  sizes = "100vw",
}: AdaptiveImageProps) {
  const { isSlow } = useNetworkQuality();
  // Priority (LCP) images render fully visible from the first frame — the
  // blur-up fade is a perceived-performance trick for below-the-fold images
  // and would otherwise push the measured Largest Contentful Paint back by
  // the length of the opacity transition.
  const [loaded, setLoaded] = useState(priority);
  const warmedRef = useRef(false);

  const smallest = variants?.[0];
  const largest = variants?.[variants.length - 1];
  const conservativeVariant =
    variants && variants.length > 2 ? variants[Math.floor(variants.length / 2)] : smallest;

  const useConservative = Boolean(isSlow && !priority && variants && variants.length > 1);
  const chosenSrc = useConservative ? conservativeVariant!.src : (largest?.src ?? src);
  const chosenSrcSet =
    !useConservative && variants
      ? variants.map((v) => `${v.src} ${v.width}w`).join(", ")
      : undefined;

  // On a slow connection we deliberately serve a smaller variant first, so
  // quietly warm the browser cache with the full-quality version once the
  // main thread is idle — the next view of this image (a revisit, or the
  // same photo shown larger on a product page) is then instant.
  useEffect(() => {
    if (!useConservative || !largest || warmedRef.current) return;
    warmedRef.current = true;
    idle(() => {
      const img = new Image();
      img.decoding = "async";
      (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "low";
      img.src = largest.src;
    });
  }, [useConservative, largest]);

  return (
    <span
      className={cn("relative block overflow-hidden", wrapperClassName)}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {lowQualitySrc && !loaded && (
        <img
          src={lowQualitySrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-lg"
        />
      )}
      {!lowQualitySrc && !loaded && (
        <span className="skeleton-shimmer absolute inset-0" aria-hidden="true" />
      )}
      <img
        src={chosenSrc}
        srcSet={chosenSrcSet}
        sizes={chosenSrcSet ? sizes : undefined}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : isSlow ? "low" : "auto"}
        onLoad={() => setLoaded(true)}
        className={cn(
          "relative h-full w-full object-cover transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </span>
  );
}
