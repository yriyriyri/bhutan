'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Roboto_Mono } from 'next/font/google';
import { useShaderScene } from '../../components/ShaderSceneContext';

const m = Roboto_Mono({ weight: '300', subsets: ['latin'] });

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

  const isMobile = useIsMobile();
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
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
      }}
    >
      {/* Mobile-only return button */}
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
            pointerEvents: 'auto', // make the button clickable
          }}
        >
          {'<'}
        </Link>
      )}

      <a
        href="mailto:example@bhutantreasurycompany.com"
        className="ui-text contact-email"
        aria-label="Email Bhutan Treasury Company"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        style={{
          userSelect: 'text',
          cursor: 'pointer',
          pointerEvents: 'auto', // clickable even though parent is none
          textDecoration: hover ? 'underline' : 'none',
          textUnderlineOffset: '2px',
        }}
      >
        example@bhutantreasurycompany.com
      </a>

      <style jsx>{`
        .contact-email {
          display: block;
          margin: 0 auto;
          max-width: 50vw;
          text-align: center;
          font-size: 14px;
          line-height: 1.3;
          font-weight: 300;
        }
        @media (max-width: 768px), (pointer: coarse) {
          .contact-email {
            font-size: 12px;
            max-width: 90vw;
          }
        }
      `}</style>
    </div>
  );
}