'use client';

import Link from 'next/link';
import NextImage from 'next/image';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useShaderScene } from './ShaderSceneContext';

type Props = {
  href: string;
  src: string;
  alt: string;
  height: number;
  enabled?: boolean;
  style?: React.CSSProperties;
  tintToTheme?: boolean;
};

function isThemeDark(): boolean {
  return typeof document !== 'undefined' && document.body.classList.contains('theme-dark');
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
  const { isMobile } = useShaderScene();

  // Ensure SSR and first client render match
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [themeDark, setThemeDark] = useState(false);
  useEffect(() => {
    const update = () => setThemeDark(isThemeDark());
    update();
    const mo = new MutationObserver(update);
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  const useCanvas = enabled || (tintToTheme && themeDark);

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

    const fg = getComputedStyle(document.body).getPropertyValue('--fg').trim() || '#d0d0d0';

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = fg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(base, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  useEffect(() => {
    if (!useCanvas) return;
    draw();
  }, [useCanvas, themeDark, draw]);

  useEffect(() => {
    if (!useCanvas) return;

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

      cvs.style.height = `${H}px`;
      cvs.style.width = `${W}px`;
      cvs.width = W * dpr;
      cvs.height = H * dpr;

      const base = document.createElement('canvas');
      base.width = W;
      base.height = H;
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

    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
      img.removeEventListener('load', onLoad);
    };
  }, [useCanvas, src, height, draw]);

  const content = useCanvas ? (
    <canvas ref={canvasRef} />
  ) : (
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
  );

  const disableNav = mounted ? (!isMobile && href === '/menu') : false;

  return (
    <Link
      href={href}
      aria-label={alt}
      prefetch={false}
      onClick={(e) => {
        if (disableNav) e.preventDefault();
      }}
      onKeyDown={(e) => {
        if (disableNav && (e.key === 'Enter' || e.key === ' ')) e.preventDefault();
      }}
      aria-disabled={disableNav ? 'true' : undefined}
      tabIndex={disableNav ? -1 : undefined}
      style={{
        display: 'inline-block',
        cursor: disableNav ? 'default' : 'pointer',
        ...(style || {}),
      }}
    >
      {content}
    </Link>
  );
}