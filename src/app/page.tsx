'use client';

import ShaderSurface from '../components/ShaderSurface';

export default function Page() {
  return (
    <div style={{ height: '100vh', position: 'relative', overflow: 'clip' }}>
      <ShaderSurface />

      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10,
          fontFamily: '"Times New Roman", Times, serif',
          fontWeight: 400,
          color: 'transparent',
          WebkitTextStroke: '0.6px #000', 
          fontSize: 'clamp(28px, 4vw, 72px)',
          lineHeight: 1.1,
          letterSpacing: 0.5,
          textAlign: 'right',
          pointerEvents: 'none',
        }}
      >
        BHUTAN TREASURY COMPANY
      </div>
    </div>
  );
}