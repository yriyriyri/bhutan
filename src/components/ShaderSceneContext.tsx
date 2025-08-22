'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

type SceneState = {
  showDragon: boolean;
  setShowDragon: (v: boolean) => void;
};

const Ctx = createContext<SceneState | null>(null);

export function ShaderSceneProvider({ children }: { children: ReactNode }) {
  const [showDragon, setShowDragon] = useState(true); 
  return <Ctx.Provider value={{ showDragon, setShowDragon }}>{children}</Ctx.Provider>;
}

export function useShaderScene() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useShaderScene must be used within ShaderSceneProvider');
  return v;
}