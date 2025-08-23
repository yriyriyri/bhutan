// app/team/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useShaderScene } from '../../components/ShaderSceneContext';

import { Roboto_Mono } from 'next/font/google';
const m = Roboto_Mono({ weight: '300', subsets: ['latin'] });

const H_OFFSET = 120;
const V_GAP = 80;
const FONT_SIZE_PX = 11; 

const ENTRIES = [
  { name: 'Oscar Paterson', role: 'Dev, Voxl Studios' },
  { name: 'Will Vivian', role: 'Dev, Voxl Studios' },
  { name: 'Amadeo Barrionuevo', role: 'Dev, Voxl Studios' },
];

export default function TeamPage() {
  const { setShowDragon, setShowFlags, setShowParticles, setShowClouds } = useShaderScene();

  useEffect(() => {
    setShowDragon(false);
    setShowFlags(false);
    setShowParticles(true);
    setShowClouds(false);
  }, [setShowDragon, setShowFlags, setShowParticles, setShowClouds]);

  const roleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [roleWidths, setRoleWidths] = useState<number[]>(
    () => new Array(ENTRIES.length).fill(0)
  );

  const measure = useMemo(
    () => () => {
      const widths = roleRefs.current.map((el) =>
        el ? el.getBoundingClientRect().width : 0
      );
      setRoleWidths(widths);
    },
    []
  );

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure]);

  const setRoleRef = (index: number) => (el: HTMLSpanElement | null) => {
    roleRefs.current[index] = el;
  };

  return (
    <div style={{ height: '100vh', position: 'relative', overflow: 'clip' }}>
      <Link
        href="/about"
        className={m.className}
        style={{
          position: 'absolute',
          top: 15,
          left: 15,
          fontSize: 25,
          textDecoration: 'none',
          color: '#000',
          zIndex: 20,
          lineHeight: 1,
        }}
      >
        {'<'}
      </Link>
      <div
        className={m.className}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: FONT_SIZE_PX,
          lineHeight: 1.2,
          zIndex: 10,
          color: '#000',
          fontWeight: 300, 
        }}
      >
        {ENTRIES.map(({ name, role }, i) => {
          const nameStartOffset = (roleWidths[i] || 0) + H_OFFSET;
          return (
            <div
              key={name}
              style={{
                position: 'relative',
                width: 0,
                height: '1.2em',
                marginBottom: i < ENTRIES.length - 1 ? V_GAP : 0,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: -nameStartOffset,
                  whiteSpace: 'nowrap',
                }}
              >
                {name}
              </span>

              <span
                ref={setRoleRef(i)}
                style={{
                  position: 'absolute',
                  left: H_OFFSET,
                  whiteSpace: 'nowrap',
                }}
              >
                {role}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}