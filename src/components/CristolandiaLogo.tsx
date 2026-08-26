import React from 'react';

interface CristolandiaLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'icon-only';
  showSubtitle?: boolean;
}

export const CristolandiaLogo: React.FC<CristolandiaLogoProps> = ({
  className = '',
  variant = 'full',
  showSubtitle = true,
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official Symbol Vector - Arc "C" + 2 Leaves */}
      <div className="relative w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/20 border border-emerald-200/80 dark:border-emerald-800/40 p-1.5 shadow-xs">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-emerald-600 dark:text-emerald-400"
        >
          {/* C-shaped embrace arcs */}
          <path
            d="M36 12C31.5 7.5 22 7.5 15 13.5C8 19.5 7.5 30 14 36.5C20.5 43 31 41.5 36 36.5"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="opacity-95"
          />
          {/* Inner protective curve */}
          <path
            d="M32 16.5C28.5 13.5 22 14 17.5 18C13 22 13 28.5 17 32.5C21 36.5 27.5 36.5 31.5 32.5"
            stroke="#10b981"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="opacity-80"
          />
          {/* Main Growth Leaf (Hope) */}
          <path
            d="M24 16C24 16 32 14 36 21C36 21 33 27 24 23Z"
            fill="#059669"
            className="dark:fill-emerald-400"
          />
          {/* Secondary Support Leaf (Discipleship) */}
          <path
            d="M26 23C26 23 33 22 36 28C36 28 32 32 26 28.5Z"
            fill="#10b981"
            className="dark:fill-emerald-300 opacity-90"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      {variant !== 'icon-only' && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200/80 dark:border-emerald-800/40">
              JMN • CBB
            </span>
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
              LEM / BA
            </span>
          </div>
          <h1 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white uppercase leading-tight mt-0.5">
            Estoque <span className="text-emerald-600 dark:text-emerald-400">Cristolândia</span>
          </h1>
          {showSubtitle && variant === 'full' && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5 font-medium">
              Centro de Assistência Social
            </p>
          )}
        </div>
      )}
    </div>
  );
};
