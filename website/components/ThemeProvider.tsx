'use client';

import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useSettingsStore((state) => state.theme);
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Remove all theme classes
    document.body.classList.remove('theme-dark', 'theme-dark-slate', 'theme-dark-blue', 'theme-white');
    
    // Add current theme class
    document.body.classList.add(`theme-${theme}`);

    // Sync dark mode class on html element for Tailwind/Browser defaults
    if (theme === 'white') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [theme, mounted]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <div className={`contents theme-${theme}`}>
      {children}
    </div>
  );
};
