'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  onToggle?: () => void;
  className?: string;
  style?: React.CSSProperties;

  basePath?: string;
  folder?: string;
  frameCount?: number;
  startIndex?: number;
  pad?: number;
  fps?: number;
  sizePx?: number;
};

export default function InvertLogoButton({
  onToggle,
  className,
  style,
  basePath = 'coin_',
  folder = '/coin',
  frameCount = 30,
  startIndex = 1,
  pad = 4,
  fps = 30,
  sizePx = 18,
}: Props) {
  const [hover, setHover] = useState(false);
  const [ready, setReady] = useState(false);
  const [idx, setIdx] = useState(0);
  const playingRef = useRef<false | 1 | -1>(false); 
  const lastFrameTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const paths = useMemo(() => {
    const p = (n: number) => String(n).padStart(pad, '0');
    const list: string[] = [];
    for (let i = 0; i < frameCount; i++) {
      const num = startIndex + i;
      list.push(`${folder}/${basePath}${p(num)}.png`);
    }
    return list;
  }, [folder, basePath, frameCount, startIndex, pad]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      paths.map(
        src =>
          new Promise<void>((resolve) => {
            const im = new Image();
            im.onload = () => resolve();
            im.onerror = () => resolve();
            im.src = src;
          })
      )
    ).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, [paths]);

  useEffect(() => {
    const frameMs = 1000 / Math.max(1, fps);

    const loop = (t: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (!playingRef.current) return;

      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = t;
        return;
      }

      const elapsed = t - lastFrameTimeRef.current;
      if (elapsed < frameMs) return;

      lastFrameTimeRef.current = t - (elapsed - frameMs); 
      const dir = playingRef.current;
      setIdx(prev => {
        const next = prev + dir;
        if (next <= 0) {
          playingRef.current = false;
          return 0;
        }
        if (next >= paths.length - 1) {
          playingRef.current = false;
          return paths.length - 1;
        }
        return next;
      });
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [fps, paths.length]);

  const handleClick = () => {
    if (!ready || playingRef.current) return;

    const atStart = idx <= 0;
    const atEnd = idx >= paths.length - 1;
    playingRef.current = atStart ? 1 : atEnd ? -1 : (idx < paths.length / 2 ? 1 : -1);
    lastFrameTimeRef.current = 0;

    onToggle?.();
  };

  return (
    <button
      type="button"
      aria-label="Toggle invert"
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={className}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        margin: 0,
        width: sizePx,
        height: sizePx,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: ready ? 'pointer' : 'default',
        opacity: hover ? 1 : 0.6,
        transition: 'opacity 120ms linear, transform 200ms ease',
        transform: hover ? 'scale(1.05)' : 'none',
        ...style,
      }}
    >
      <img
        src={paths[idx]}
        alt=""
        draggable={false}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          imageRendering: 'auto',
          borderRadius: 2,
        }}
      />
    </button>
  );
}