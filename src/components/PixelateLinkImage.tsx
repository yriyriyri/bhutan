'use client';

import Link from 'next/link';
import NextImage from 'next/image';
import { useEffect, useRef } from 'react';

type Props = {
  href: string;
  src: string;
  alt: string;
  height: number;
  enabled?: boolean;
  maxRadius?: number;
  steps?: number;
  blockSizes?: number[];
  alphaCenter?: number;
  style?: React.CSSProperties;
};

export default function PixelateLinkImage({
  href,
  src,
  alt,
  height,
  enabled = false,
  maxRadius = 120,
  steps = 4,
  blockSizes = [1.6, 1.9, 2.3, 2.8],
  alphaCenter = 0.6,
  style,
}: Props) {
  if (!enabled) {
    return (
      <Link href={href} aria-label={alt} style={{ display: 'inline-block', ...style }}>
        <NextImage
          src={src}
          alt={alt}
          width={0}
          height={0}
          sizes="100vw"
          unoptimized
          priority
          style={{ height: `${height}px`, width: 'auto', display: 'block' }}
        />
      </Link>
    );
  }

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const lowResMapRef = useRef<Map<number, HTMLCanvasElement> | null>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);
  const dimsRef = useRef<{ W: number; H: number; dpr: number } | null>(null);
  const mouseRef = useRef<{ x: number; y: number; inside: boolean }>({ x: 0, y: 0, inside: false });

  useEffect(() => {
    let disposed = false;
    const cvs = canvasRef.current;
    if (!cvs) return;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.src = src;

    const build = () => {
      if (disposed || !img.complete || !img.naturalWidth) return;

      const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
      const H = Math.max(1, Math.round(height));
      const aspect = img.naturalWidth / img.naturalHeight;
      const W = Math.max(1, Math.round(H * aspect));

      cvs.style.height = `${H}px`;
      cvs.style.width = `${W}px`;
      cvs.width = W * dpr;
      cvs.height = H * dpr;

      const base = document.createElement('canvas');
      base.width = W; base.height = H;
      const bctx = base.getContext('2d')!;
      bctx.imageSmoothingEnabled = true;
      bctx.clearRect(0, 0, W, H);
      bctx.drawImage(img, 0, 0, W, H);
      baseRef.current = base;

      const sizes = [...new Set(blockSizes)].sort((a, b) => a - b);
      const lowResMap = new Map<number, HTMLCanvasElement>();
      for (const b of sizes) {
        const w = Math.max(1, Math.round(W / b));
        const h = Math.max(1, Math.round(H / b));
        const lo = document.createElement('canvas');
        lo.width = w; lo.height = h;
        const lctx = lo.getContext('2d')!;
        lctx.imageSmoothingEnabled = true;
        lctx.drawImage(base, 0, 0, W, H, 0, 0, w, h);
        lowResMap.set(b, lo);
      }
      lowResMapRef.current = lowResMap;

      const scratch = document.createElement('canvas');
      scratch.width = W; scratch.height = H;
      scratchRef.current = scratch;

      dimsRef.current = { W, H, dpr };
      draw();
    };

    const onLoad = () => build();
    img.addEventListener('load', onLoad);

    const onResize = () => build();
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
      img.removeEventListener('load', onLoad);
    };
  }, [src, height, steps, maxRadius, blockSizes.join(',')]);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    const onMove = (e: MouseEvent) => {
      const r = cvs.getBoundingClientRect();
      mouseRef.current.x = e.clientX - r.left;
      mouseRef.current.y = e.clientY - r.top;
      mouseRef.current.inside = true;
      draw();
    };
    const onEnter = () => { mouseRef.current.inside = true; draw(); };
    const onLeave = () => { mouseRef.current.inside = false; draw(); };

    cvs.addEventListener('mousemove', onMove);
    cvs.addEventListener('mouseenter', onEnter);
    cvs.addEventListener('mouseleave', onLeave);
    return () => {
      cvs.removeEventListener('mousemove', onMove);
      cvs.removeEventListener('mouseenter', onEnter);
      cvs.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  const draw = () => {
    const dims = dimsRef.current;
    const base = baseRef.current;
    const lowResMap = lowResMapRef.current;
    const scratch = scratchRef.current;
    const cvs = canvasRef.current;
    if (!dims || !base || !lowResMap || !scratch || !cvs) return;

    const { W, H, dpr } = dims;
    const ctx = cvs.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(base, 0, 0);
  };

  return (
    <Link href={href} aria-label={alt} style={{ display: 'inline-block', ...style }}>
      <canvas ref={canvasRef} />
    </Link>
  );
}