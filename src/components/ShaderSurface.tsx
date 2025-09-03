'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Link from 'next/link';
import { createPipeline as createDesktopPipeline, type Pipeline } from '../lib/graphics/pipeline';
import { createPipeline as createMobilePipeline } from '../lib/graphics/mobilePipeline';
import { useShaderScene } from './ShaderSceneContext';
import { usePathname } from 'next/navigation';
import { Roboto_Mono, Workbench } from 'next/font/google';
import PixelateLinkImage from './PixelateLinkImage';
import BrandTypewriterLink from './BrandTypewriterLink'
import InvertLogoButton from './InvertLogoButton';


const m = Roboto_Mono({ weight: ['300','400'], subsets: ['latin'] });
const wb = Workbench({ subsets: ['latin'], weight: '400' });
const HOME_IMG_HEIGHT_PX = 12; 

export default function ShaderSurface() {
  const { showDragon, showFlags, showParticles, showClouds, showBuddha, showStupa, isMobile, deviceReady } = useShaderScene();
  const pathname = usePathname();
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

  const [hoverTop, setHoverTop] = useState({
    btc: false,
    about: false,
    leadership: false,
    invert: false,
    contact: false,
    legal: false,
    terms: false,
    privacy: false,
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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
    pipeline.setLayerVisibility?.('buddha', showBuddha);
    pipeline.setLayerVisibility?.('prayer', showBuddha);
    pipeline.setLayerVisibility?.('stupa', showStupa);

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
    p.setLayerVisibility?.('buddha', showBuddha); 
    p.setLayerVisibility?.('prayer', showBuddha); 
    p.setLayerVisibility?.('stupa', showStupa);
  }, [showDragon, showFlags, showParticles, showClouds, showBuddha, showStupa]);

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
  
      {mounted && !isMobile && (
        <>
          <div className="ui-bottom-fade" />
  
          <div
            className={`${m.className} ui-text`}
            style={{
              position: 'fixed',
              right: 12,
              bottom: 5,
              fontSize: 10,
              lineHeight: 1,
              zIndex: 2,
              pointerEvents: 'auto', 
              userSelect: 'none',
              display: 'flex',
              fontWeight: 300,
              gap: 18,
            }}
          >
            <span style={{ marginRight: 48, opacity: 0.6, }}>
              © 2025 The Bhutan Treasury Company. All Rights Reserved.
            </span>

            <Link
              href="/contact"
              className="ui-link"
              onMouseEnter={() => setHoverTop(s => ({ ...s, contact: true }))}
              onMouseLeave={() => setHoverTop(s => ({ ...s, contact: false }))}
              style={{
                textDecoration: hoverTop.contact ? 'underline' : 'none',
                textUnderlineOffset: '2px',
                cursor: 'pointer',
                fontWeight: pathname === '/contact' ? 400 : 300,
                opacity: pathname === '/contact' || hoverTop.contact ? 1 : 0.6,
                transition: 'opacity 120ms linear',
              }}
            >
              contact
            </Link>

            <Link
              href="/legal"
              className="ui-link"
              onMouseEnter={() => setHoverTop(s => ({ ...s, legal: true }))}
              onMouseLeave={() => setHoverTop(s => ({ ...s, legal: false }))}
              style={{
                textDecoration: hoverTop.legal ? 'underline' : 'none',
                textUnderlineOffset: '2px',
                cursor: 'pointer',
                fontWeight: pathname === '/legal' ? 400 : 300,
                opacity: pathname === '/legal' || hoverTop.legal ? 1 : 0.6,
                transition: 'opacity 120ms linear',
              }}
            >
              legal
            </Link>

            <Link
              href="/terms"
              className="ui-link"
              onMouseEnter={() => setHoverTop(s => ({ ...s, terms: true }))}
              onMouseLeave={() => setHoverTop(s => ({ ...s, terms: false }))}
              style={{
                textDecoration: hoverTop.terms ? 'underline' : 'none',
                textUnderlineOffset: '2px',
                cursor: 'pointer',
                fontWeight: pathname === '/terms' ? 400 : 300,
                opacity: pathname === '/terms' || hoverTop.terms ? 1 : 0.6,
                transition: 'opacity 120ms linear',
              }}
            >
              terms of use
            </Link>

            <Link
              href="/privacy"
              className="ui-link"
              onMouseEnter={() => setHoverTop(s => ({ ...s, privacy: true }))}
              onMouseLeave={() => setHoverTop(s => ({ ...s, privacy: false }))}
              style={{
                textDecoration: hoverTop.privacy ? 'underline' : 'none',
                textUnderlineOffset: '2px',
                cursor: 'pointer',
                fontWeight: pathname === '/privacy' ? 400 : 300,
                opacity: pathname === '/privacy' || hoverTop.privacy ? 1 : 0.6,
                transition: 'opacity 120ms linear',
              }}
            >
              privacy notice
            </Link>
          </div>
  
          <div
            className={`${wb.className} ui-text`}
            style={{
              position: 'fixed',
              top: 10,
              right: 12, 
              left: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 30,
              fontSize: 15,
              lineHeight: 1,
              zIndex: 2,
              pointerEvents: 'auto',
              userSelect: 'none',
              letterSpacing: '0.25em',
            }}
          >
            <span
              onMouseEnter={() => setHoverTop(s => ({ ...s, btc: true }))}
              onMouseLeave={() => setHoverTop(s => ({ ...s, btc: false }))}
              style={{
                display: 'inline-flex',
                opacity: pathname === '/' || hoverTop.btc ? 1 : 0.6,
                transition: 'opacity 120ms linear',
              }}
            >
              <BrandTypewriterLink
                href="/"
                className="ui-link"
                active={pathname === '/'}
                stepMs={10}
                style={{ fontWeight: 400 }}
                underlineOnHover={false}
              />
            </span>

            <span aria-hidden="true" style={{ pointerEvents: 'none' }}>-</span>

            <Link
              href="/about"
              className="ui-link ui-link--no-underline"
              onMouseEnter={() => setHoverTop(s => ({ ...s, about: true }))}
              onMouseLeave={() => setHoverTop(s => ({ ...s, about: false }))}
              style={{
                cursor: 'pointer',
                opacity: pathname === '/about' || hoverTop.about ? 1 : 0.6,
                transition: 'opacity 120ms linear',
                fontWeight: 400,
              }}
            >
              about
            </Link>

            <Link
              href="/team"
              className="ui-link ui-link--no-underline"
              onMouseEnter={() => setHoverTop(s => ({ ...s, leadership: true }))}
              onMouseLeave={() => setHoverTop(s => ({ ...s, leadership: false }))}
              style={{
                cursor: 'pointer',
                opacity: pathname === '/team' || hoverTop.leadership ? 1 : 0.6,
                transition: 'opacity 120ms linear',
                fontWeight: 400,
              }}
            >
              team
            </Link>

            {/* <button
              className={`${wb.className} ui-link ui-link--no-underline`}
              onClick={toggleInvertUI}
              onMouseEnter={() => setHoverTop(s => ({ ...s, invert: true }))}
              onMouseLeave={() => setHoverTop(s => ({ ...s, invert: false }))}
              style={{
                background: 'transparent',
                marginLeft: 'auto',
                border: 'none',
                padding: 0,
                fontSize: 15,
                lineHeight: 1,
                cursor: 'pointer',
                opacity: hoverTop.invert ? 1 : 0.6,
                transition: 'opacity 120ms linear',
                fontWeight: 400,
                letterSpacing: '0.25em',
              }}
            >
              invert
            </button> */}
            <InvertLogoButton
              onToggle={toggleInvertUI}
              className={`${wb.className} ui-link ui-link--no-underline`}
              style={{ marginLeft: 'auto' }}
              folder="/coin"
              basePath="coin_"
              frameCount={20}
              pad={4}
              fps={40}
              sizePx={30}
            />
          </div>
        </>
      )}
    </>
  );
}