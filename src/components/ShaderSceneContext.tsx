'use client';

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  ReactNode,
} from 'react';
import { detectMobile } from '../lib/utils/isMobile';

type Ctx = {
  showDragon: boolean;
  setShowDragon: (v: boolean) => void;

  showFlags: boolean;
  setShowFlags: (v: boolean) => void;

  showParticles: boolean;
  setShowParticles: (v: boolean) => void;

  showClouds: boolean;
  setShowClouds: (v: boolean) => void;

  showBuddha: boolean; 
  setShowBuddha: (v: boolean) => void; 

  showStupa: boolean;
  setShowStupa: (v: boolean) => void;

  isMobile: boolean;

  deviceReady: boolean;
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
  showBuddha: false, 
  setShowBuddha: () => {}, 
  showStupa: false, 
  setShowStupa: () => {}, 
  isMobile: false,
  deviceReady: false,
});

export function useShaderScene() {
  return useContext(ShaderSceneContext);
}

export function ShaderSceneProvider({ children }: { children: ReactNode }) {
  const [showDragon, setShowDragon] = useState(true);
  const [showFlags, setShowFlags] = useState(false);
  const [showParticles, setShowParticles] = useState(true);
  const [showClouds, setShowClouds] = useState(true);
  const [showBuddha, setShowBuddha] = useState(false);
  const [showStupa, setShowStupa] = useState(false);

  const bootHasValue =
    typeof window !== 'undefined' && (window as any).__IS_MOBILE__ !== undefined;

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false; 
    if (bootHasValue) return !!(window as any).__IS_MOBILE__;
    return detectMobile();
  });

  const [deviceReady, setDeviceReady] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return bootHasValue; 
  });

  useEffect(() => {
    if (deviceReady) return;
    const v = detectMobile();
    setIsMobile(v);
    setDeviceReady(true);
  }, [deviceReady]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.device = isMobile ? 'mobile' : 'desktop';
  }, [isMobile]);

  const value = useMemo(
    () => ({
      showDragon,
      setShowDragon,
      showFlags,
      setShowFlags,
      showParticles,
      setShowParticles,
      showClouds,
      setShowClouds,
      showBuddha, 
      setShowBuddha,
      showStupa, 
      setShowStupa,
      isMobile,
      deviceReady,
    }),
    [showDragon, showFlags, showParticles, showClouds, showBuddha, showStupa, isMobile, deviceReady]
  );

  return (
    <ShaderSceneContext.Provider value={value}>
      {children}
    </ShaderSceneContext.Provider>
  );
}