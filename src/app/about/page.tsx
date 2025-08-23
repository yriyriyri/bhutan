// app/about/page.tsx
'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useShaderScene } from '../../components/ShaderSceneContext';
import { Roboto_Mono } from 'next/font/google';

const m = Roboto_Mono({ weight: '300', subsets: ['latin'] });
const m400 = Roboto_Mono({ weight: '400', subsets: ['latin'] });

export default function AboutPage() {
  const { setShowDragon, setShowFlags, setShowParticles, setShowClouds } = useShaderScene();

  useEffect(() => {
    setShowDragon(false);
    setShowFlags(true);
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

      <div
        className="ui-text"
        style={{ position: 'absolute', right: 150, bottom: 100, width: 400, zIndex: 10, textAlign: 'left' }}
      >
        <div className={m.className} style={{ fontSize: 24, lineHeight: 1.2, marginBottom: 8 }}>
          about
        </div>

        <p style={{ fontFamily: '"Courier New", Courier, monospace', fontSize: 12, lineHeight: 1.35, margin: 0 }}>
          Lorem Ipsum&nbsp;is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the
          industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and
          scrambled it to make a type specimen book.{' '}
          <Link href="/team" className={`${m400.className} ui-link`}>team</Link>.
        </p>
      </div>
    </div>
  );
}