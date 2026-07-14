'use client';

import { useEffect, useState } from 'react';

export function useIsMobile(query = '(max-width: 768px)'): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => {
      setMobile(mql.matches);
    };
    update();
    mql.addEventListener('change', update);
    return () => {
      mql.removeEventListener('change', update);
    };
  }, [query]);
  return mobile;
}
