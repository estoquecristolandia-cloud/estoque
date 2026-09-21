import { useState, useEffect, useCallback } from 'react';
import { Department } from '../types';
import { toast } from '../utils/toast';

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
  const [activeDepartment, setActiveDepartmentState] = useState<Department>(() => {
    const saved = localStorage.getItem('cristolandia_active_department');
    return saved === 'dml' || saved === 'alimentacao' ? (saved as Department) : 'alimentacao';
  });

  const setActiveDepartment = useCallback((dep: Department) => {
    setActiveDepartmentState(dep);
    localStorage.setItem('cristolandia_active_department', dep);
    setActiveTab((prev) => (dep === 'dml' && prev === 'meals' ? 'dashboard' : prev));
  }, []);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('cristolandia_theme');
    return saved !== null ? saved === 'dark' : true;
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (isDarkMode) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      body.classList.add('dark');
      localStorage.setItem('cristolandia_theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      body.classList.remove('dark');
      localStorage.setItem('cristolandia_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      toast.success(next ? '🌙 Modo Escuro ativado' : '☀️ Modo Claro ativado');
      return next;
    });
  }, []);

  return {
    activeTab,
    setActiveTab,
    activeDepartment,
    setActiveDepartment,
    isDarkMode,
    toggleDarkMode,
  };
}
