import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ReactLenis, useLenis } from 'lenis/react';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/** Live `prefers-reduced-motion` flag. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(REDUCED_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(REDUCED_QUERY);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Jump to the top (no animation) whenever the route path changes. */
function ScrollToTopOnNavigate() {
  const lenis = useLenis();
  const { pathname } = useLocation();
  useEffect(() => {
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
  }, [pathname, lenis]);
  return null;
}

/**
 * Lenis smooth scrolling for the whole app (SPEC "Global project rules"):
 * ReactLenis root, lerp 0.1 + smoothWheel, lerp 1 under reduced motion.
 * The TV route (/display/*) is mounted outside this wrapper, so it never gets Lenis.
 * Inner scrollers opt out with `data-lenis-prevent` (built into Dialog, RowMenu, Select, Textarea, Table).
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  return (
    // Re-create Lenis when the motion preference flips so the new lerp applies.
    <ReactLenis key={reduced ? 'reduced' : 'smooth'} root options={{ lerp: reduced ? 1 : 0.1, smoothWheel: true }}>
      <ScrollToTopOnNavigate />
      {children}
    </ReactLenis>
  );
}
