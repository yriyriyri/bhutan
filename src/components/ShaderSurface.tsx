'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createPipeline as createDesktopPipeline, type Pipeline } from '../lib/graphics/pipeline';
import { createPipeline as createMobilePipeline } from '../lib/graphics/mobilePipeline';
import { measureFromElement } from '../lib/graphics/sizing';
import { useShaderScene } from './ShaderSceneContext';
import { usePathname } from 'next/navigation';

export default function ShaderSurface() {
  const { showDragon, showFlags, showParticles, showClouds, isMobile } = useShaderScene();
  const pathname = usePathname();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipelineRef = useRef<Pipeline | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
  
    let renderer = rendererRef.current;
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({
        canvas, alpha: true, antialias: false, premultipliedAlpha: false,
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
  
    const onVVChange = () => applySpec(computeVisibleSpec());
    window.visualViewport?.addEventListener('resize', onVVChange);
  
    const ro = new ResizeObserver(() => {
      onVVChange();
    });
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
        console.log('[ascii] enabled =', pipelineRef.current?.isAsciiEnabled());
      } else if (k === 'i') {
        e.preventDefault();
        (pipelineRef.current as any)?.toggleInvert?.();
        const inv = (pipelineRef.current as any)?.isInvertEnabled?.() ?? false;
        document.body.classList.toggle('theme-dark', inv);
        document.body.classList.toggle('theme-light', !inv);
        const meta = document.querySelector('meta#meta-theme-color') as HTMLMetaElement | null;
        if (meta) meta.content = inv ? '#000000' : '#ffffff';
        console.log('[invert] enabled =', inv);
      }
    };
    window.addEventListener('keydown', onKey);
  
    lastPathRef.current = pathname;
  
    return () => {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.visualViewport?.removeEventListener('resize', onVVChange);
      window.visualViewport?.removeEventListener('scroll', onVVChange);
      pipeline.dispose();
      pipelineRef.current = null;
    };
  }, [isMobile]);

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

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100dvw', height: '100dvh', zIndex: 0, pointerEvents: 'none' }}
    />
  );
}