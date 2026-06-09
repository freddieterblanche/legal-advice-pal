import { useEffect, useRef, useState } from "react";

/**
 * Returns a ref to attach to a sentinel element and `isStuck` which becomes
 * true once that sentinel has scrolled out of the viewport (above the fold).
 * Use to trigger sticky headers / bars when the user scrolls past a region.
 */
export function useStickyTrigger<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        // Sentinel is below viewport top → not stuck.
        // Sentinel scrolled above viewport → stuck.
        setIsStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0, rootMargin: "0px 0px 0px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, isStuck };
}
