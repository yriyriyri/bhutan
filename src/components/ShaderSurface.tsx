'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createPipeline, type Pipeline } from '../lib/graphics/pipeline';
import { measureFromElement } from '../lib/graphics/sizing';

export default function ShaderSurface() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipelineRef = useRef<Pipeline | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0); //transparent clear

    // measure from canvas element  stable when devtools inspect element is triggered
    const spec = measureFromElement(canvas, 1.0, 2);
    renderer.setPixelRatio(spec.dpr);
    renderer.setSize(spec.cssW, spec.cssH, false);

    const pipeline = createPipeline(renderer);
    pipelineRef.current = pipeline;
    pipeline.resize(spec);

    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      pipeline.update(t / 1000, dt);
      pipeline.render(null); // to screen
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // observe the canvas itself
    const ro = new ResizeObserver(() => {
      const specNow = measureFromElement(canvas, 1.0, 2);
      renderer.setPixelRatio(specNow.dpr);
      renderer.setSize(specNow.cssW, specNow.cssH, false);
      const db = new THREE.Vector2();
      renderer.getDrawingBufferSize(db);
      console.log('canvas css=', specNow.cssW, 'x', specNow.cssH, ' dpr=', specNow.dpr, ' db=', db.x, 'x', db.y);
      pipeline.resize(specNow);
    });
    ro.observe(canvas);
    roRef.current = ro;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        pipelineRef.current?.toggleAscii();
        console.log('[ascii] enabled =', pipelineRef.current?.isAsciiEnabled());
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
      ro.disconnect();
      pipeline.dispose();
      renderer.dispose();
      pipelineRef.current = null;
      roRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none', // let  dom receive input
      }}
    />
  );
}