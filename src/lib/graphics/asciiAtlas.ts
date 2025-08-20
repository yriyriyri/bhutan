import * as THREE from 'three';

/**
 * Create a glyph atlas texture by drawing characters on a canvas.
 * @param chars   string of glyphs ordered light→dark (e.g., " .,:;i1tfLCG08@")
 * @param cellPx  cell size in px (square cells)
 * @param fontCSS canvas font string (monospace recommended)
 */
export function makeAsciiAtlas(
  chars = " .,:;i1tfLCG08@",
  cellPx = 48,
  fontCSS = "700 40px 'Courier New', monospace"
){
  const count = chars.length;
  const cols  = Math.ceil(Math.sqrt(count));
  const rows  = Math.ceil(count / cols);

  const canvas = document.createElement('canvas');
  canvas.width  = cols * cellPx;
  canvas.height = rows * cellPx;

  const ctx = canvas.getContext('2d')!;
  // black background, white glyphs
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = fontCSS;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';

  for (let i = 0; i < count; i++) {
    const c = chars[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cellPx + cellPx / 2;
    const y = row * cellPx + cellPx / 2;
    ctx.fillText(c, x, y);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;

  return { texture: tex, cols, rows, count, cellPx };
}