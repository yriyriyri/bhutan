// app/about/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useShaderScene } from '../../components/ShaderSceneContext';
import { Roboto_Mono } from 'next/font/google';

const m = Roboto_Mono({ weight: '300', subsets: ['latin'] });
const m400 = Roboto_Mono({ weight: '400', subsets: ['latin'] });

const TOP_OFFSET_DESKTOP_PX = 200;
const BODY_FONT_SIZE_DESKTOP_PX = 14;
const WIDTH_DESKTOP_PCT = 50;

const TOP_OFFSET_MOBILE_PX = 200;
const BODY_FONT_SIZE_MOBILE_PX = 10;
const WIDTH_MOBILE_PCT = 80; 
const MOBILE_HEADER_FONT_SIZE_PX = 18; 

export default function AboutPage() {
  const { setShowDragon, setShowFlags, setShowParticles, setShowClouds } = useShaderScene();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setShowDragon(false);
    setShowFlags(true);
    setShowParticles(true);
    setShowClouds(false);
  }, [setShowDragon, setShowFlags, setShowParticles, setShowClouds]);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px), (pointer: coarse)');
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, []);

  const TOP_OFFSET_PX = isMobile ? TOP_OFFSET_MOBILE_PX : TOP_OFFSET_DESKTOP_PX;
  const BODY_FONT_SIZE_PX = isMobile ? BODY_FONT_SIZE_MOBILE_PX : BODY_FONT_SIZE_DESKTOP_PX;
  const WIDTH_PCT = isMobile ? WIDTH_MOBILE_PCT : WIDTH_DESKTOP_PCT;

  return (
    <div style={{ height: '100vh', position: 'relative', overflow: 'clip' }}>
      <Link
        href="/menu"
        className={`${m.className} ui-link`}
        style={{ position: 'absolute', top: 15, left: 15, fontSize: 25, zIndex: 20, lineHeight: 1 }}
      >
        {'<'}
      </Link>

      <div
        className="ui-text"
        style={{
          position: 'absolute',
          top: TOP_OFFSET_PX,
          left: '50%',
          transform: 'translateX(-50%)',
          width: `${WIDTH_PCT}vw`,
          zIndex: 10,
          textAlign: 'left',
        }}
      >
        {isMobile && (
          <div
            className={m.className}
            style={{ fontSize: MOBILE_HEADER_FONT_SIZE_PX, lineHeight: 1.2, marginBottom: 8 }}
          >
            about
          </div>
        )}

        <p
          style={{
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: BODY_FONT_SIZE_PX,
            lineHeight: 1.35,
            margin: 0,
          }}
        >
          Lorem Ipsum&nbsp;is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the
          industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and
          scrambled it to make a type specimen book.
        </p>
      </div>
    </div>
  );
}