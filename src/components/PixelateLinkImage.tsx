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
  style?: React.CSSProperties;
};

export default function PixelateLinkImage({
  href,
  src,
  alt,
  height,
  enabled = false,
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
  const dimsRef = useRef<{ W: number; H: number; dpr: number } | null>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);

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

      dimsRef.current = { W, H, dpr };
      draw();
    };

    const draw = () => {
      const dims = dimsRef.current;
      const base = baseRef.current;
      const canvas = canvasRef.current;
      if (!dims || !base || !canvas) return;

      const { W, H, dpr } = dims;
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(base, 0, 0);
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
  }, [src, height]);

  return (
    <Link href={href} aria-label={alt} style={{ display: 'inline-block', ...style }}>
      <canvas ref={canvasRef} />
    </Link>
  );
}