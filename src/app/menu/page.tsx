'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useShaderScene } from '../../components/ShaderSceneContext';
import { Roboto_Mono } from 'next/font/google';

const m = Roboto_Mono({ weight: '300', subsets: ['latin'] });

const MENU_FONT_DESKTOP = 18;
const MENU_FONT_MOBILE  = 16;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px), (pointer: coarse)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);
  return isMobile;
}

export default function MenuPage() {
  const { setShowDragon, setShowFlags, setShowParticles, setShowClouds, setShowBuddha } = useShaderScene();
  const isMobile = useIsMobile();
  const fontSize = isMobile ? MENU_FONT_MOBILE : MENU_FONT_DESKTOP;

  useEffect(() => {
    setShowDragon(false);
    setShowFlags(false);
    setShowParticles(true);
    setShowClouds(false);
    setShowBuddha(false);
  }, [setShowDragon, setShowFlags, setShowParticles, setShowClouds, setShowBuddha]);

  return (
    <div style={{ height: '100dvh', position: 'relative', overflow: 'clip' }}>
      <Link
        href="/"
        className={`${m.className} ui-link`}
        style={{
          position: 'absolute',
          top: 15,
          left: 15,
          fontSize: 25,
          zIndex: 20,
          lineHeight: 1,
          textDecoration: isMobile ? 'none' : undefined,
          cursor: isMobile ? 'default' : 'pointer',
        }}
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
          <Link
            href="/about"
            className="ui-link"
            style={{
              fontSize,
              cursor: 'pointer',
              textDecoration: isMobile ? 'none' : undefined,
            }}
          >
            about
          </Link>

          <Link
            href="/team"
            className="ui-link"
            style={{
              fontSize,
              cursor: 'pointer',
              textDecoration: isMobile ? 'none' : undefined,
            }}
          >
            team
          </Link>
        </div>
      </nav>
    </div>
  );
}