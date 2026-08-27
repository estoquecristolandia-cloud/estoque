import React from 'react';

export type BadgeVariant = 'emerald' | 'orange' | 'rose' | 'amber' | 'blue' | 'slate' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80',
  orange: 'bg-orange-50 text-orange-800 border-orange-200/80 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/80',
  rose: 'bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80',
  amber: 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80',
  blue: 'bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80',
  slate: 'bg-slate-100 text-slate-700 border-slate-200/90 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/80',
  purple: 'bg-purple-50 text-purple-800 border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/80',
};

const sizeStyles = {
  sm: 'text-[10px] font-bold px-2 py-0.5 rounded-md gap-1',
  md: 'text-xs font-bold px-2.5 py-1 rounded-lg gap-1.5',
  lg: 'text-xs font-extrabold px-3 py-1.5 rounded-xl gap-2',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'sm',
  icon,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center border font-sans whitespace-nowrap leading-none transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
