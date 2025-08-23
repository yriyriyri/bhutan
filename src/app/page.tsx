'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useShaderScene } from '../components/ShaderSceneContext';
import PixelateLinkImage from '../components/PixelateLinkImage';

const GAP_PX = 140;
const IMG_HEIGHT_PX = 30;

export default function HomePage() {
  const { setShowDragon, setShowFlags, setShowClouds } = useShaderScene();

  const bhutanRef = useRef<HTMLImageElement | null>(null);
  const companyRef = useRef<HTMLImageElement | null>(null);

  const recompute = useCallback(() => {
    const _wl = bhutanRef.current?.getBoundingClientRect().width ?? 0;
    const _wr = companyRef.current?.getBoundingClientRect().width ?? 0;
  }, []);

  useEffect(() => {
    setShowDragon(true);
    setShowFlags(false);
    setShowClouds(true);
  }, [setShowDragon, setShowFlags, setShowClouds]);

  useEffect(() => {
    const onResize = () => recompute();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [recompute]);

  return (
    <div style={{ height: '100vh', position: 'relative', overflow: 'clip' }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          columnGap: `${GAP_PX}px`,
          zIndex: 10,
        }}
      >
        <PixelateLinkImage
          href="/about"
          src="/bhutan.png"
          alt="Bhutan"
          height={IMG_HEIGHT_PX}
          style={{ display: 'inline-block', cursor: 'pointer' }}
          tintToTheme={true}
        />
        <PixelateLinkImage
          href="/about"
          src="/treasury.png"
          alt="Treasury"
          height={IMG_HEIGHT_PX}
          style={{ display: 'inline-block', cursor: 'pointer' }}
          tintToTheme={true}
        />
        <PixelateLinkImage
          href="/about"
          src="/company.png"
          alt="Company"
          height={IMG_HEIGHT_PX}
          style={{ display: 'inline-block', cursor: 'pointer' }}
          tintToTheme={true}
        />
      </div>
    </div>
  );
}