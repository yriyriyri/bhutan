'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Roboto_Mono } from 'next/font/google';

const m = Roboto_Mono({ weight: ['300','400'], subsets: ['latin'] });

type Props = {
  href?: string;
  className?: string;
  style?: React.CSSProperties;
  active?: boolean;
  targetText?: string;
  initials?: string;
  stepMs?: number;
  scrambleMs?: number;
  underlineOnHover?: boolean;
  ariaLabel?: string;
};

export default function BrandTypewriterLink({
  href = '/',
  className,
  style,
  active = false,
  targetText = 'Bhutan Treasury Company',
  initials = 'BTC',
  stepMs = 10,
  scrambleMs = 5,
  underlineOnHover = true,
  ariaLabel = 'Home',
}: Props) {
  const words = useMemo(() => targetText.split(' ').filter(Boolean), [targetText]);
  const maxCounts = useMemo(() => words.map(w => w.length), [words]);

  const schedule = useMemo(() => {
    const counts = words.map(() => 1);
    const need   = words.map(w => Math.max(0, w.length - 1));
    const totalExtra = need.reduce((a, b) => a + b, 0);
    const order: number[] = [];
    let i = 0;
    while (order.length < totalExtra) {
      if (counts[i] < maxCounts[i]) {
        counts[i]++;
        order.push(i);
      }
      i = (i + 1) % words.length;
    }
    return order;
  }, [words, maxCounts]);

  const totalExtra = schedule.length;

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const [hover, setHover] = useState(false);

  const [step, setStep] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const dirRef = useRef<1 | -1>(1);

  const density = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // force paints during scramble
  const [, setPhaseTick] = useState(0);

  const startTimesRef = useRef<number[][]>(words.map(w => new Array(w.length).fill(NaN)));

  useEffect(() => {
    startTimesRef.current = words.map(w => new Array(w.length).fill(NaN));
  }, [targetText, words.length]);

  useEffect(() => {
    if (!hover) {
      startTimesRef.current = words.map(w => new Array(w.length).fill(NaN));
    }
  }, [hover, words.length]);

  useEffect(() => {
    if (reducedMotion) {
      setStep(hover ? totalExtra : 0);
      return;
    }
    dirRef.current = hover ? 1 : -1;

    const tick = (t: number) => {
      setPhaseTick(p => (p + 1) & 0xffff);

      if (!lastTickRef.current) lastTickRef.current = t;
      const dt = t - lastTickRef.current;

      if (dt >= stepMs) {
        lastTickRef.current = t;
        setStep(s => Math.min(totalExtra, Math.max(0, s + dirRef.current)));
      }

      const done = (!hover && step <= 0) || (hover && step >= totalExtra);
      if (!done) rafRef.current = requestAnimationFrame(tick);
      else rafRef.current = null;
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [hover, reducedMotion, stepMs, totalExtra, step]);

  const counts = useMemo(() => {
    const c = words.map(() => 1);
    for (let i = 0; i < step; i++) {
      const w = schedule[i];
      if (c[w] < maxCounts[w]) c[w] += 1;
    }
    return c;
  }, [words, schedule, maxCounts, step]);

  useEffect(() => {
    if (!hover) return;
    const now = performance.now();
    const grid = startTimesRef.current;
    words.forEach((w, wi) => {
      const committed = Math.min(counts[wi], w.length);
      for (let j = 0; j < committed; j++) {
        if (!Number.isFinite(grid[wi]?.[j])) {
          if (!grid[wi]) grid[wi] = new Array(w.length).fill(NaN);
          grid[wi][j] = now;
        }
      }
    });
  }, [hover, counts, words]);

  const display = useMemo(() => {
    if (!hover && step <= 0) return initials;
    if (hover && step >= totalExtra) return words.join(' ');

    const totalDuration = density.length * Math.max(1, scrambleMs);
    const now = performance.now();

    const parts = words.map((w, wi) => {
      const committed = Math.min(counts[wi], w.length);
      if (committed <= 0) return '';

      let out = '';
      for (let j = 0; j < committed; j++) {
        const targetChar = w[j];
        const targetIndex = density.indexOf(targetChar);

        const st = startTimesRef.current[wi]?.[j];
        if (hover && Number.isFinite(st) && targetIndex >= 0) {
          const elapsed = Math.max(0, now - (st as number));
          const progress = Math.min(1, elapsed / totalDuration);
          const idx = Math.min(targetIndex, Math.floor(progress * targetIndex));
          out += progress < 1 ? density[idx] : targetChar;
          continue;
        }
        out += targetChar;
      }
      return out;
    });

    return parts.join(' ');
  }, [words, counts, initials, hover, step, totalExtra, scrambleMs, density]);

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`${m.className} ${className ?? ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: 'pointer',
        textDecoration: underlineOnHover && hover ? 'underline' : 'none',
        textUnderlineOffset: '2px',
        fontWeight: active ? 400 : 300,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {display}
    </Link>
  );
}