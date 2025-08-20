import * as THREE from 'three';

/**
 * @param chars
 * @param cellPx
 * @param fontCSS
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

  return { texture: tex, cols, rows, count, cellPx, canvas };
}


export const TIBETAN_GLYPHS =
  " ་།༎༑༔༶༷༸༹༿༠༡༢༣༤༥༦༧༨༩" +
  "ཀཁགངཅཆཇཉཏཐདནཔཕབམཙཚཛཝཞཟའཡརལཤསཧཨༀ";


export function makeTibetanAsciiAtlas(
  cellPx = 48,
  fontCSS = "700 42px 'Noto Sans Tibetan','Noto Serif Tibetan','Kailasa','Kokonor',sans-serif"
){
  const chars = TIBETAN_GLYPHS;
  const count = chars.length;
  const cols  = Math.ceil(Math.sqrt(count));
  const rows  = Math.ceil(count / cols);

  const canvas = document.createElement('canvas');
  canvas.width  = cols * cellPx;
  canvas.height = rows * cellPx;

  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = fontCSS;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const probe = 'ཨ';
  const m = ctx.measureText(probe);
  const ascent  = m.actualBoundingBoxAscent ?? cellPx * 0.7;
  const descent = m.actualBoundingBoxDescent ?? cellPx * 0.3;
  const baseY   = (cellPx - (ascent + descent)) * 0.5 + ascent;

  ctx.fillStyle = '#fff';
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cellPx + cellPx / 2;
    const y = row * cellPx + baseY;
    ctx.fillText(chars[i], x, y);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;

  return { texture, canvas, cols, rows, count, cellPx };
}



export function showAtlasDebug(canvas: HTMLCanvasElement, cols: number, rows: number, cellPx: number) {
  const dbg = canvas.cloneNode(true) as HTMLCanvasElement;
  dbg.id = 'atlas-debug';
  dbg.style.cssText = [
    'position:fixed',
    'right:8px',
    'bottom:8px',
    'width:220px',
    'height:auto',
    'border:1px solid #333',
    'background:#fff',
    'image-rendering:pixelated',
    'z-index:999999',
    'pointer-events:none'
  ].join(';');

  const g = dbg.getContext('2d')!;
  g.save();
  g.strokeStyle = 'rgba(0,255,0,0.35)';
  g.lineWidth = 1;
  for (let x = 0; x <= cols; x++) {
    g.beginPath(); g.moveTo(x * cellPx + 0.5, 0); g.lineTo(x * cellPx + 0.5, rows * cellPx); g.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    g.beginPath(); g.moveTo(0, y * cellPx + 0.5); g.lineTo(cols * cellPx, y * cellPx + 0.5); g.stroke();
  }
  g.restore();

  document.getElementById('atlas-debug')?.remove();
  document.body.appendChild(dbg);
}