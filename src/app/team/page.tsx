// app/team/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useShaderScene } from '../../components/ShaderSceneContext';
import { Roboto_Mono } from 'next/font/google';

const m = Roboto_Mono({ weight: '300', subsets: ['latin'] });

const H_OFFSET_DESKTOP = 120;
const H_OFFSET_MOBILE  = 60;
const V_GAP = 80;
const FONT_SIZE_PX = 11;
const MOBILE_CENTER_LIFT_DVH = 10; 

const ENTRIES = [
  { name: 'Oscar Paterson', role: 'Dev, Voxl Studios' },
  { name: 'Will Vivian', role: '3d,  Voxl Studios' },
  { name: 'Amadeo Barrionuevo', role: '2d,  Voxl Studios' },
  { name: 'Louis Kang', role: 'cd,  Voxl Studios' },
];

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

export default function TeamPage() {
  const { setShowDragon, setShowFlags, setShowParticles, setShowClouds, setShowBuddha, setShowStupa } = useShaderScene();
  const isMobile = useIsMobile();
  const H_OFFSET = isMobile ? H_OFFSET_MOBILE : H_OFFSET_DESKTOP;

  useEffect(() => {
    setShowDragon(false);
    setShowFlags(false);
    setShowParticles(true);
    setShowClouds(false);
    setShowBuddha(true); 
    setShowStupa(false);
  }, [setShowDragon, setShowFlags, setShowParticles, setShowClouds, setShowBuddha]);

  const roleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [roleWidths, setRoleWidths] = useState<number[]>(() => new Array(ENTRIES.length).fill(0));

  const measure = useMemo(
    () => () => {
      const widths = roleRefs.current.map((el) => (el ? el.getBoundingClientRect().width : 0));
      setRoleWidths(widths);
    },
    []
  );

  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure]);

  const setRoleRef = (index: number) => (el: HTMLSpanElement | null) => {
    roleRefs.current[index] = el;
  };

  return (
    <div style={{ height: '100dvh', position: 'relative', overflow: 'clip' }}>
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
          }}
        >
          {'<'}
        </Link>
      )}

      <div
        className={`${m.className} ui-text`}
        style={{
          position: 'absolute',
          left: '50%',
          top: isMobile ? `calc(50% - ${MOBILE_CENTER_LIFT_DVH}dvh)` : '50%', 
          transform: 'translate(-50%, -50%)',
          fontSize: FONT_SIZE_PX,
          lineHeight: 1.2,
          zIndex: 10,
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