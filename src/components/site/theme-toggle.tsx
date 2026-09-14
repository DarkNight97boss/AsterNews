'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => { setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'); }, []);
  const apply = (t: 'light' | 'dark') => {
    document.documentElement.dataset.theme = t;
    document.cookie = `theme=${t}; path=/; max-age=31536000; samesite=lax`;
    setTheme(t);
  };
  return (
    <>
      <button className={`tool ${theme === 'light' ? 'active' : ''}`} title="Tema chiaro" aria-label="Tema chiaro" onClick={() => apply('light')}>☀</button>
      <button className={`tool ${theme === 'dark' ? 'active' : ''}`} title="Tema scuro" aria-label="Tema scuro" onClick={() => apply('dark')}>☾</button>
    </>
  );
}
