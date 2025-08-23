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
        className={m.className}
        style={{
          position: 'absolute',
          top: 15,
          left: 15,
          fontSize: 25,
          textDecoration: 'none',
          color: '#000',
          zIndex: 20,
          lineHeight: 1,
        }}
      >
        {'<'}
      </Link>
      <nav
        className={m.className}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'grid', gap: 20, textAlign: 'center' }}>
          <Link
            href="/about"
            style={{ fontSize: 18, color: '#000', textDecoration: 'none', cursor: 'pointer' }}
          >
            about
          </Link>
          <Link
            href="/team"
            style={{ fontSize: 18, color: '#000', textDecoration: 'none', cursor: 'pointer' }}
          >
            team
          </Link>
        </div>
      </nav>
    </div>
  );
}