'use client';

import { useEffect, useState } from 'react';
import { Roboto_Mono } from 'next/font/google';
import { useShaderScene } from '../../components/ShaderSceneContext';

const m = Roboto_Mono({ weight: '300', subsets: ['latin'] });

export default function ContactPage() {
  const {
    setShowDragon,
    setShowFlags,
    setShowParticles,
    setShowClouds,
    setShowBuddha,
    setShowStupa,
  } = useShaderScene();

  useEffect(() => {
    setShowDragon(false);
    setShowFlags(false);
    setShowParticles(true);
    setShowClouds(false);
    setShowBuddha(false);
    setShowStupa(true);
  }, [setShowDragon, setShowFlags, setShowParticles, setShowClouds, setShowBuddha, setShowStupa]);

  const [hover, setHover] = useState(false);

  return (
    <div
      className={m.className}
      style={{
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 2,
        pointerEvents: 'none',
      }}
    >
      <a
        href="mailto:example@bhutantreasurycompany.com"
        className="ui-text"
        aria-label="Email Bhutan Treasury Company"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        style={{
          maxWidth: '50vw',
          textAlign: 'center',
          fontSize: 14,
          lineHeight: 1.3,
          fontWeight: 300,
          userSelect: 'text',
          display: 'inline-block',
          cursor: 'pointer',
          pointerEvents: 'auto',
          textDecoration: hover ? 'underline' : 'none',
          textUnderlineOffset: '2px',
        }}
      >
        example@bhutantreasurycompany.com
      </a>
    </div>
  );
}