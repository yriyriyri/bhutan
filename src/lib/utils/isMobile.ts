export function detectMobile(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    const uaMatch = /Android|webOS|iPhone|iPad|iPod|Kindle|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  
    const coarse = typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)').matches
      : false;
  
    const smallSide = Math.min(window.innerWidth, window.innerHeight);
    const smallish = smallSide <= 820;
  
    return uaMatch || (coarse && smallish);
  }