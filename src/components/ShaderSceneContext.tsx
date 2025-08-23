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

  // Read the early "device-boot" result if present (set in app/layout via <Script beforeInteractive>)
  const bootHasValue =
    typeof window !== 'undefined' && (window as any).__IS_MOBILE__ !== undefined;

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false; // SSR placeholder; we finalize on client
    if (bootHasValue) return !!(window as any).__IS_MOBILE__;
    // Fallback: quick sync guess (safe on client)
    return detectMobile();
  });

  const [deviceReady, setDeviceReady] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return bootHasValue; // ready immediately if boot flag exists
  });

  // If the boot flag wasn't available, finalize once on mount with detectMobile()
  useEffect(() => {
    if (deviceReady) return;
    const v = detectMobile();
    setIsMobile(v);
    setDeviceReady(true);
  }, [deviceReady]);

  // Keep <html data-device="mobile|desktop"> in sync (useful for CSS/debugging)
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
      isMobile,
      deviceReady,
    }),
    [showDragon, showFlags, showParticles, showClouds, isMobile, deviceReady]
  );

  return (
    <ShaderSceneContext.Provider value={value}>
      {children}
    </ShaderSceneContext.Provider>
  );
}