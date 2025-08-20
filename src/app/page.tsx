'use client';

import ShaderSurface from '../components/ShaderSurface';

export default function Page() {
  return (
    <div style={{ height: '100vh', position: 'relative', overflow: 'clip' }}>
      <ShaderSurface />
      {/* <main style={{ position: 'relative', zIndex: 1, color: '#fff', padding: '2rem', fontFamily: 'system-ui' }}>
        <h1 style={{ fontWeight: 600, letterSpacing: 0.5 }}>Bhutan Treasury Company</h1>
        <p>foreground text uninvolved in pipeline placed on the dom</p>
      </main> */}
    </div>
  );
}