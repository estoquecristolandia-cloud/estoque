import { useState, useEffect, useCallback } from 'react';

export type AppTab =
  | 'dashboard'
  | 'products'
  | 'entries'
  | 'exits'
  | 'meals'
  | 'reports'
  | 'ai_assistant';

export function useAppNavigation() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('cristolandia_theme');
    return saved !== null ? saved === 'dark' : true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cristolandia_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cristolandia_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  return {
    activeTab,
    setActiveTab,
    isDarkMode,
    toggleDarkMode,
  };
}
