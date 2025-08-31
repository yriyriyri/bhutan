'use client';

import { useEffect } from 'react';
import { useShaderScene } from '../components/ShaderSceneContext';
import PixelateLinkImage from '../components/PixelateLinkImage';
import { useState } from 'react';

const IMG_HEIGHT_PX = 30;
const IMG_HEIGHT_PX_MOBILE = 20;
const GAP_PX = 140;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px), (pointer: coarse)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else (mq as any).addListener?.(apply);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', apply);
      else (mq as any).removeListener?.(apply);
    };
  }, []);
  return isMobile;
}

export default function HomePage() {
  const { setShowDragon, setShowFlags, setShowClouds } = useShaderScene();
  const isMobile = useIsMobile();

  useEffect(() => {
    setShowDragon(true);
    setShowFlags(false);
    setShowClouds(true);
  }, [setShowDragon, setShowFlags, setShowClouds]);

  return (
    <div style={{ height: '100dvh', position: 'relative', overflow: 'clip' }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          columnGap: isMobile ? 0 : `${GAP_PX}px`,
          zIndex: 10,
        }}
      >
        {isMobile ? (
          <PixelateLinkImage
            href="/menu"
            src="/mobilelogo.png"
            alt="Logo"
            height={IMG_HEIGHT_PX_MOBILE}
            style={{ display: 'inline-block', cursor: isMobile ? 'pointer' : 'default' }}
            tintToTheme={true}
          />
        ) : (
          <>
            <PixelateLinkImage
              href="/menu"
              src="/bhutan.png"
              alt="Bhutan"
              height={IMG_HEIGHT_PX}
              style={{ display: 'inline-block', cursor: isMobile ? 'pointer' : 'default' }}
              tintToTheme={true}
            />
            <PixelateLinkImage
              href="/menu"
              src="/treasury.png"
              alt="Treasury"
              height={IMG_HEIGHT_PX}
              style={{ display: 'inline-block', cursor: isMobile ? 'pointer' : 'default' }}
              tintToTheme={true}
            />
            <PixelateLinkImage
              href="/menu"
              src="/company.png"
              alt="Company"
              height={IMG_HEIGHT_PX}
              style={{ display: 'inline-block', cursor: isMobile ? 'pointer' : 'default' }}
              tintToTheme={true}
            />
          </>
        )}
      </div>
    </div>
  );
}