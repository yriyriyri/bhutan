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
          fontSize: 11,
          lineHeight: 1.3,
          fontWeight: 300,
          userSelect: 'text',
        }}
      >
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec porttitor fringilla neque, a volutpat libero convallis a. Suspendisse in velit a ligula viverra egestas ac eu massa. Sed quis sodales nibh, non dictum ipsum. Phasellus sodales sit amet nunc sed ultricies. Curabitur posuere finibus accumsan. Integer tellus metus, dignissim vel libero quis, ornare tincidunt nunc.
      </div>
    </div>
  );
}