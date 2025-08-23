'use client';

import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { detectMobile } from '..//lib/utils/isMobile';

type Ctx = {
  showDragon: boolean;
  setShowDragon: (v: boolean) => void;

  showFlags: boolean;
  setShowFlags: (v: boolean) => void;

  showParticles: boolean;
  setShowParticles: (v: boolean) => void;

  showClouds: boolean;
  setShowClouds: (v: boolean) => void;

  isMobile: boolean;
};

const ShaderSceneContext = createContext<Ctx>({
  showDragon: true,
  setShowDragon: () => {},
  showFlags: false,
  setShowFlags: () => {},
  showParticles: true,
  setShowParticles: () => {},
  showClouds: true,
  setShowClouds: () => {},
  isMobile: false, 
});

export function useShaderScene() {
  return useContext(ShaderSceneContext);
}

export function ShaderSceneProvider({ children }: { children: ReactNode }) {
  const [showDragon, setShowDragon] = useState(true);
  const [showFlags, setShowFlags] = useState(false);
  const [showParticles, setShowParticles] = useState(true);
  const [showClouds, setShowClouds] = useState(true);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(detectMobile());
  }, []);

  const value = useMemo(
    () => ({
      showDragon, setShowDragon,
      showFlags, setShowFlags,
      showParticles, setShowParticles,
      showClouds, setShowClouds,
      isMobile,
    }),
    [showDragon, showFlags, showParticles, showClouds, isMobile]
  );

  return <ShaderSceneContext.Provider value={value}>{children}</ShaderSceneContext.Provider>;
}