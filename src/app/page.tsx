'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useShaderScene } from '../components/ShaderSceneContext';

export default function HomePage() {
  const { setShowDragon } = useShaderScene();

  useEffect(() => {
    setShowDragon(true);
  }, [setShowDragon]);

  return (
    <div style={{ height: '100vh', position: 'relative', overflow: 'clip' }}>
      <Link
        href="/about"
        style={{
          position: 'absolute', top: 16, right: 16, zIndex: 10,
          fontFamily: '"Times New Roman", Times, serif',
          fontWeight: 400, color: 'transparent', WebkitTextStroke: '0.6px #000',
          fontSize: 'clamp(28px, 4vw, 72px)', lineHeight: 1.1, letterSpacing: 0.5,
          textAlign: 'right', textDecoration: 'none', cursor: 'pointer',
        }}
      >
        BHUTAN TREASURY COMPANY
      </Link>
    </div>
  );
}