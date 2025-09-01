'use client';

import { useEffect } from 'react';
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
  }, [
    setShowDragon,
    setShowFlags,
    setShowParticles,
    setShowClouds,
    setShowBuddha,
    setShowStupa,
  ]);

  return (
    <div
      className={m.className}
      style={{
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      <div
        className="ui-text"
        style={{
          maxWidth: '50vw',
          textAlign: 'center',
          fontSize: 10,
          lineHeight: 1.3,
          fontWeight: 300,
          userSelect: 'text',
        }}
      >
        Mauris aliquet porta dapibus. Pellentesque venenatis fermentum auctor. Nullam id placerat ante, imperdiet accumsan nisi. Ut mattis tellus et cursus porta. Nulla id rutrum massa, eu gravida ligula. Fusce congue facilisis suscipit. Nam est magna, euismod et lobortis id, facilisis a erat. Aliquam erat volutpat. Nunc at massa sed turpis dignissim tincidunt eget in diam. Praesent suscipit id felis sit amet eleifend. Integer ac arcu ante. Aliquam vel justo id urna condimentum lacinia sed sed felis. Aliquam dignissim tellus erat, eu lacinia nisi convallis vel. Phasellus congue laoreet velit eget aliquet.
      </div>
    </div>
  );
}