'use client';

import Link from 'next/link';
import { useEffect, useState, CSSProperties } from 'react';
import { useShaderScene } from '../../components/ShaderSceneContext';
import { Roboto_Mono } from 'next/font/google';

const m = Roboto_Mono({ weight: '300', subsets: ['latin'] });
const m400 = Roboto_Mono({ weight: '400', subsets: ['latin'] });

const BODY_FONT_SIZE_DESKTOP_PX = 14;
const WIDTH_DESKTOP_PCT = 50;
const CENTER_OFFSET_DESKTOP_PX = 100;

const TOP_OFFSET_MOBILE_PX = 200;
const BODY_FONT_SIZE_MOBILE_PX = 10;
const WIDTH_MOBILE_PCT = 80;
const MOBILE_HEADER_FONT_SIZE_PX = 18;

export default function AboutPage() {
  const { setShowDragon, setShowFlags, setShowParticles, setShowClouds, setShowBuddha } = useShaderScene();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setShowDragon(false);
    setShowFlags(true);
    setShowParticles(true);
    setShowClouds(false);
    setShowBuddha(false);
  }, [setShowDragon, setShowFlags, setShowParticles, setShowClouds, setShowBuddha]);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px), (pointer: coarse)');
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, []);

  const BODY_FONT_SIZE_PX = isMobile ? BODY_FONT_SIZE_MOBILE_PX : BODY_FONT_SIZE_DESKTOP_PX;
  const WIDTH_PCT = isMobile ? WIDTH_MOBILE_PCT : WIDTH_DESKTOP_PCT;

  const containerStyle: CSSProperties = isMobile
    ? {
        position: 'absolute',
        top: TOP_OFFSET_MOBILE_PX,
        left: '50%',
        transform: 'translateX(-50%)',
        width: `${WIDTH_PCT}vw`,
        zIndex: 10,
        textAlign: 'left',
      }
    : {
        position: 'absolute',
        left: '50%',
        top: `calc(50% - ${CENTER_OFFSET_DESKTOP_PX}px)`,
        transform: 'translate(-50%, -50%)',
        width: `${WIDTH_PCT}vw`,
        zIndex: 10,
        textAlign: 'left',
      };

  return (
    <div style={{ height: '100dvh', position: 'relative', overflow: 'clip' }}>
      {isMobile && (
        <Link
          href="/menu"
          className={`${m.className} ui-link`}
          style={{
            position: 'absolute',
            top: 15,
            left: 15,
            fontSize: 25,
            zIndex: 20,
            lineHeight: 1,
            textDecoration: 'none',
            cursor: 'default',
          }}
        >
          {'<'}
        </Link>
      )}

      <div className="ui-text" style={containerStyle}>
        {isMobile && (
          <div
            className={m.className}
            style={{ fontSize: MOBILE_HEADER_FONT_SIZE_PX, lineHeight: 1.2, marginBottom: 8 }}
          >
            about
          </div>
        )}

        <pre
          style={{
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: BODY_FONT_SIZE_PX,
            margin: 0,
            whiteSpace: 'pre',
            overflowX: 'hidden',
          }}
        >{`00000000  01 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00 00 00  |................|
00000010  00 00 00 00 3B A3 ED FD  7A 7B 12 B2 7A C7 2C 3E 7A 7B  |....;£íýz{..zÇ,>|
00000020  67 76 8F 61 7F CB 1B C3  88 8A 51 32 3A 9F B8 AA 88 8A  |gv.. ….Q2:..ª---|
00000030  4B 1E 5E 4A 29 AB 5F 49  FF FF 00 1D 1D AC 2B 7C 5F 49  |K.^J)._I……..+---|`}</pre>
      </div>
    </div>
  );
}