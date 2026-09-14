'use client';

import { useEffect, useRef, useState } from 'react';

export function useResponsiveTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [measurement, setMeasurement] = useState<{ trackWidth?: number; minimumDayWidth: number }>({ minimumDayWidth: 10 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const compact = window.matchMedia('(max-width: 700px)').matches;
      setMeasurement({ trackWidth: Math.max(0, container.clientWidth - (compact ? 190 : 220)), minimumDayWidth: compact ? 18 : 10 });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return { containerRef, ...measurement };
}
