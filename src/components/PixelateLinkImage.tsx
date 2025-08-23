'use client';

import Link from 'next/link';
import NextImage from 'next/image';
import { useEffect, useRef, useCallback, useState } from 'react';

type Props = {
  href: string;
  src: string;
  alt: string;
  height: number;
  enabled?: boolean;
  style?: React.CSSProperties;
  tintToTheme?: boolean;
};

function readInvertOn(): boolean {
  const root = document.documentElement;
  const body = document.body;
  const hasClass = root.classList.contains('ui-invert') || body.classList.contains('ui-invert');
  const varMatch =
    (getComputedStyle(root).getPropertyValue('--invert').trim() === '1') ||
    (getComputedStyle(body).getPropertyValue('--invert').trim() === '1');
  return hasClass || varMatch;
}

export default function PixelateLinkImage({
  href,
  src,
  alt,
  height,
  enabled = false,
  style,
  tintToTheme = false,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [invertOn, setInvertOn] = useState(false);

  useEffect(() => {
    setMounted(true);
    setInvertOn(readInvertOn());

    const onMut = () => setInvertOn(readInvertOn());
    const moRoot = new MutationObserver(onMut);
    const moBody = new MutationObserver(onMut);
    moRoot.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    moBody.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
    return () => {
      moRoot.disconnect();
      moBody.disconnect();
    };
  }, []);

  if (!mounted || (!tintToTheme && !enabled) || (tintToTheme && !invertOn)) {
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

  const draw = useCallback(() => {
    const dims = dimsRef.current;
    const base = baseRef.current;
    const canvas = canvasRef.current;
    if (!dims || !base || !canvas) return;

    const { W, H, dpr } = dims;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    (ctx as any).imageSmoothingQuality = 'high';

    const fg =
      getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() ||
      getComputedStyle(document.body).getPropertyValue('--fg').trim() ||
      '#d0d0d0';

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = fg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(base, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  useEffect(() => {
    let disposed = false;
    const cvs = canvasRef.current;
    if (!cvs) return;

    const img = new window.Image();
    img.decoding = 'async';
    img.src = src;

    const build = () => {
      if (disposed || !img.complete || !img.naturalWidth) return;

      const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
      const H = Math.max(1, Math.round(height));
      const aspect = img.naturalWidth / img.naturalHeight;
      const W = Math.max(1, Math.round(H * aspect));

      // CSS size
      cvs.style.height = `${H}px`;
      cvs.style.width = `${W}px`;
      // backing store
      cvs.width = W * dpr;
      cvs.height = H * dpr;

      const base = document.createElement('canvas');
      base.width = W; base.height = H;
      const bctx = base.getContext('2d')!;
      bctx.imageSmoothingEnabled = true;
      (bctx as any).imageSmoothingQuality = 'high';
      bctx.clearRect(0, 0, W, H);
      bctx.drawImage(img, 0, 0, W, H);
      baseRef.current = base;

      dimsRef.current = { W, H, dpr };
      requestAnimationFrame(draw);
    };

    const onLoad = () => build();
    img.addEventListener('load', onLoad);

    const onResize = () => build();
    window.addEventListener('resize', onResize);

    const moRoot = new MutationObserver(() => requestAnimationFrame(draw));
    const moBody = new MutationObserver(() => requestAnimationFrame(draw));
    moRoot.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    moBody.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });

    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
      img.removeEventListener('load', onLoad);
      moRoot.disconnect();
      moBody.disconnect();
    };
  }, [src, height, draw]);

  return (
    <Link href={href} aria-label={alt} style={{ display: 'inline-block', ...style }}>
      <canvas ref={canvasRef} />
    </Link>
  );
}