export type FrameSpec = { cssW: number; cssH: number; dpr: number; pxW: number; pxH: number };

export function measureFromElement(el: HTMLElement, renderScale = 1.0, dprMax = 1): FrameSpec {
  const rect = el.getBoundingClientRect();
  const cssW = Math.max(1, Math.round(rect.width));
  const cssH = Math.max(1, Math.round(rect.height));
  const dpr = Math.min(dprMax, Math.max(1, window.devicePixelRatio || 1));
  const pxW = Math.max(1, Math.round(cssW * dpr * renderScale));
  const pxH = Math.max(1, Math.round(cssH * dpr * renderScale));
  return { cssW, cssH, dpr, pxW, pxH };
}