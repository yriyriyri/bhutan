'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useShaderScene } from '../../components/ShaderSceneContext';
import { Roboto_Mono } from 'next/font/google';

const m = Roboto_Mono({ weight: '300', subsets: ['latin'] });

export default function MenuPage() {
  const { setShowDragon, setShowFlags, setShowParticles, setShowClouds } = useShaderScene();

  useEffect(() => {
    setShowDragon(false);
    setShowFlags(false);
    setShowParticles(true);
    setShowClouds(false);
  }, [setShowDragon, setShowFlags, setShowParticles, setShowClouds]);

  return (
    <div style={{ height: '100vh', position: 'relative', overflow: 'clip' }}>
      <Link
        href="/"
        className={`${m.className} ui-link`}
        style={{ position: 'absolute', top: 15, left: 15, fontSize: 25, zIndex: 20, lineHeight: 1 }}
      >
        {'<'}
      </Link>

      <nav
        className="ui-text"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <div className={m.className} style={{ display: 'grid', gap: 20, textAlign: 'center' }}>
          <Link href="/about" className="ui-link" style={{ fontSize: 18, cursor: 'pointer' }}>
            about
          </Link>
          <Link href="/team" className="ui-link" style={{ fontSize: 18, cursor: 'pointer' }}>
            team
          </Link>
        </div>
      </nav>
    </div>
  );
}