'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Link from 'next/link';
import { createPipeline as createDesktopPipeline, type Pipeline } from '../lib/graphics/pipeline';
import { createPipeline as createMobilePipeline } from '../lib/graphics/mobilePipeline';
import { useShaderScene } from './ShaderSceneContext';
import { usePathname } from 'next/navigation';
import { Roboto_Mono } from 'next/font/google';
import PixelateLinkImage from './PixelateLinkImage';

const m = Roboto_Mono({ weight: ['300','400'], subsets: ['latin'] });
const HOME_IMG_HEIGHT_PX = 12; 

function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
    const compute = () => {
      const explicitDark = root.classList.contains('theme-dark') || body.classList.contains('theme-dark');
      const explicitLight = root.classList.contains('theme-light') || body.classList.contains('theme-light');
      if (explicitDark) return true;
      if (explicitLight) return false;
      return !!mql?.matches;
    };
    const update = () => setIsDark(compute());
    update();
    const mo = new MutationObserver(update);
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    mo.observe(body, { attributes: true, attributeFilter: ['class'] });
    const onChange = () => setIsDark(compute());
    mql?.addEventListener?.('change', onChange);
    return () => {
      mo.disconnect();
      mql?.removeEventListener?.('change', onChange);
    };
  }, []);
  return isDark;
}

export default function ShaderSurface() {
  const { showDragon, showFlags, showParticles, showClouds, isMobile, deviceReady } = useShaderScene();
  const pathname = usePathname();
  const isDark = useIsDark();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipelineRef = useRef<Pipeline | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const lastPathRef = useRef<string | null>(null);
  const modeRef = useRef<'mobile' | 'desktop' | null>(null);
  const rafResizeRef = useRef<number | null>(null);

  const toggleInvertUI = () => {
    const pipeline = pipelineRef.current as any;
    if (!pipeline) return;
    pipeline.startBurn?.({ duration: 0.9, maxOpacity: 1, fadeIn: 0.9 });
    pipeline.toggleInvert?.();
    const inv = pipeline.isInvertEnabled?.() ?? false;
    document.body.classList.toggle('theme-dark', inv);
    document.body.classList.toggle('theme-light', !inv);
    const meta = document.querySelector('meta#meta-theme-color') as HTMLMetaElement | null;
    if (meta) meta.content = inv ? '#000000' : '#ffffff';
  };

  const [hoverTop, setHoverTop] = useState({ about: false, leadership: false, invert: false });

  useEffect(() => {
    if (!deviceReady) return;
    const mode: 'mobile' | 'desktop' = isMobile ? 'mobile' : 'desktop';
    if (modeRef.current === mode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
    if (pipelineRef.current) { pipelineRef.current.dispose(); pipelineRef.current = null; }

    let renderer = rendererRef.current;
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.autoClear = false;
      renderer.setClearColor(0x000000, 0);
      rendererRef.current = renderer;
    }

    const computeVisibleSpec = () => {
      const vv = window.visualViewport;
      const cssW = Math.round(vv?.width ?? window.innerWidth);
      const cssH = Math.round(vv?.height ?? window.innerHeight);
      const dpr  = Math.min(2, window.devicePixelRatio || 1);
      return {
        cssW, cssH, dpr,
        pxW: Math.max(1, Math.round(cssW * dpr)),
        pxH: Math.max(1, Math.round(cssH * dpr)),
        cssAspect: cssW / Math.max(1, cssH),
        pxAspect: (cssW * dpr) / Math.max(1, cssH * dpr),
      };
    };

    const applySpec = (spec: any) => {
      renderer!.setPixelRatio(spec.dpr);
      renderer!.setSize(spec.cssW, spec.cssH, false);
      pipelineRef.current?.resize(spec);
    };

    const initialSpec = computeVisibleSpec();
    applySpec(initialSpec);

    const factory = isMobile ? createMobilePipeline : createDesktopPipeline;
    const pipeline = factory(renderer);
    pipelineRef.current = pipeline;
    modeRef.current = mode;

    pipeline.resize(initialSpec);

    const dark =
      document.body.classList.contains('theme-dark') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    pipeline.setInvertEnabled?.(!!dark);

    pipeline.setLayerVisibility?.('dragon-layer', showDragon);
    pipeline.setLayerVisibility?.('flag', showFlags);
    pipeline.setLayerVisibility?.('background-flag', showFlags);
    pipeline.setLayerVisibility?.('particles', showParticles);
    pipeline.setLayerVisibility?.('clouds', showClouds);
    pipeline.setLayerVisibility?.('foreground-clouds', showClouds);

    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      pipeline.update(t / 1000, dt);
      pipeline.render(null);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const scheduleResize = () => {
      if (rafResizeRef.current != null) return;
      rafResizeRef.current = requestAnimationFrame(() => {
        rafResizeRef.current = null;
        applySpec(computeVisibleSpec());
      });
    };
    window.visualViewport?.addEventListener('resize', scheduleResize);
    window.visualViewport?.addEventListener('scroll', scheduleResize);

    const ro = new ResizeObserver(scheduleResize);
    ro.observe(canvas);
    roRef.current = ro;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (typing) return;
      const k = e.key.toLowerCase();
      if (k === 'p') {
        e.preventDefault();
        pipelineRef.current?.toggleAscii();
      } else if (k === 'i') {
        e.preventDefault();
        toggleInvertUI();
      }
    };
    window.addEventListener('keydown', onKey);

    lastPathRef.current = pathname;

    return () => {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.visualViewport?.removeEventListener('resize', scheduleResize);
      window.visualViewport?.removeEventListener('scroll', scheduleResize);
      pipeline.dispose();
      pipelineRef.current = null;
    };
  }, [deviceReady, isMobile]);

  useEffect(() => {
    const p = pipelineRef.current;
    if (!p) return;
    p.setLayerVisibility?.('dragon-layer', showDragon);
    p.setLayerVisibility?.('flag', showFlags);
    p.setLayerVisibility?.('background-flag', showFlags);
    p.setLayerVisibility?.('particles', showParticles);
    p.setLayerVisibility?.('clouds', showClouds);
    p.setLayerVisibility?.('foreground-clouds', showClouds);
  }, [showDragon, showFlags, showParticles, showClouds]);

  useEffect(() => {
    const p = pipelineRef.current;
    if (!p) return;
    if (lastPathRef.current !== null && lastPathRef.current !== pathname) {
      p.startBurn?.({ duration: 0.9, maxOpacity: 1, fadeIn: 0.9 });
    }
    lastPathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const p = pipelineRef.current;
    if (!p || !deviceReady || !isMobile) return;
    let done = false;
    const unlock = () => {
      if (done) return;
      done = true;
      (p as any)?.unlockMedia?.();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('touchend',  unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchend',  unlock);
    };
  }, [deviceReady, isMobile]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100svw',
          height: '100svh',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {!isMobile && pathname !== '/' && (
        <div
          style={{
            position: 'fixed',
            top: 15,
            left: 12,
            display: 'flex',
            gap: 40,
            zIndex: 2,
            pointerEvents: 'auto',
          }}
        >
          <PixelateLinkImage
            href="/"
            src="/bhutan.png"
            alt="Home: Bhutan"
            height={HOME_IMG_HEIGHT_PX}
            style={{ display: 'inline-block', cursor: 'pointer' }}
            tintToTheme
          />
          <PixelateLinkImage
            href="/"
            src="/treasury.png"
            alt="Home: Treasury"
            height={HOME_IMG_HEIGHT_PX}
            style={{ display: 'inline-block', cursor: 'pointer' }}
            tintToTheme
          />
          <PixelateLinkImage
            href="/"
            src="/company.png"
            alt="Home: Company"
            height={HOME_IMG_HEIGHT_PX}
            style={{ display: 'inline-block', cursor: 'pointer' }}
            tintToTheme
          />
        </div>
      )}

      {!isMobile && (
        <>
          <div
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              height: 20,
              background: isDark
                ? 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0))'
                : 'linear-gradient(to top, rgba(255,255,255,0.9), rgba(255,255,255,0))',
              zIndex: 1,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />

          <div
            className={`${m.className} ui-text`}
            style={{
              position: 'fixed',
              left: 12,
              bottom: 5,
              fontSize: 10,
              lineHeight: 1,
              zIndex: 2,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            © 2025 The Bhutan Treasury Company. All Rights Reserved.
          </div>

          <div
            className={`${m.className} ui-text`}
            style={{
              position: 'fixed',
              right: 12,
              bottom: 5,
              fontSize: 10,
              lineHeight: 1,
              zIndex: 2,
              pointerEvents: 'none',
              userSelect: 'none',
              display: 'flex',
              gap: 18,
            }}
          >
            <span>contact</span>
            <span>legal</span>
            <span>terms of use</span>
            <span>privacy notice</span>
          </div>

          <div
            className={`${m.className} ui-text`}
            style={{
              position: 'fixed',
              top: 10,
              right: 12,
              display: 'flex',
              gap: 25,
              fontSize: 15,
              lineHeight: 1,
              zIndex: 2,
              pointerEvents: 'auto',
              userSelect: 'none',
            }}
          >
            <Link
              href="/about"
              className="ui-link"
              onMouseEnter={() => setHoverTop(s => ({ ...s, about: true }))}
              onMouseLeave={() => setHoverTop(s => ({ ...s, about: false }))}
              style={{
                textDecoration: hoverTop.about ? 'underline' : 'none',
                textUnderlineOffset: '2px',
                cursor: 'pointer',
                fontWeight: pathname === '/about' ? 400 : 300,
              }}
            >
              about
            </Link>

            <Link
              href="/team"
              className="ui-link"
              onMouseEnter={() => setHoverTop(s => ({ ...s, leadership: true }))}
              onMouseLeave={() => setHoverTop(s => ({ ...s, leadership: false }))}
              style={{
                textDecoration: hoverTop.leadership ? 'underline' : 'none',
                textUnderlineOffset: '2px',
                cursor: 'pointer',
                fontWeight: pathname === '/team' ? 400 : 300,
              }}
            >
              team
            </Link>

            <button
              className={`${m.className} ui-link`}
              onClick={toggleInvertUI}
              onMouseEnter={() => setHoverTop(s => ({ ...s, invert: true }))}
              onMouseLeave={() => setHoverTop(s => ({ ...s, invert: false }))}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                margin: 0,
                fontSize: 15,
                lineHeight: 1,
                cursor: 'pointer',
                textDecoration: hoverTop.invert ? 'underline' : 'none',
                textUnderlineOffset: '2px',
                fontWeight: 300,
              }}
            >
              invert
            </button>
          </div>
        </>
      )}
    </>
  );
}