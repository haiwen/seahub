import { useEffect, useState } from 'react';

// Observe element size changes and return { width, height }.
// Triggers updates when parent layout (like side panels) changes size.
export default function useResizeObserver(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Initialize with current size
    const rect = el.getBoundingClientRect();
    setSize({ width: Math.round(rect.width), height: Math.round(rect.height) });

    let frame = null;
    const update = (entry) => {
      // Use contentRect for precise size; fallback to getBoundingClientRect
      const cr = entry?.contentRect;
      const w = Math.round((cr?.width ?? el.getBoundingClientRect().width));
      const h = Math.round((cr?.height ?? el.getBoundingClientRect().height));
      // Avoid layout thrash with rAF and skip no-op updates
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setSize((prev) => (prev.width !== w || prev.height !== h ? { width: w, height: h } : prev));
      });
    };

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) update(entry);
      });
      ro.observe(el);
      return () => {
        if (frame) cancelAnimationFrame(frame);
        ro.disconnect();
      };
    } else {
      // Fallback: window resize listener
      const onResize = () => update();
      window.addEventListener('resize', onResize);
      return () => {
        if (frame) cancelAnimationFrame(frame);
        window.removeEventListener('resize', onResize);
      };
    }
  }, [ref]);

  return size;
}
