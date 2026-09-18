import React from 'react';

interface CristolandiaLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'mark' | 'full' | 'compact';
  showSubtitle?: boolean;
}

export const CristolandiaLogo: React.FC<CristolandiaLogoProps> = ({
  className = '',
  size = 36,
  variant = 'mark',
  showSubtitle = true,
}) => {
  const numericSize = typeof size === 'number' ? size : 36;

  // Símbolo Oficial Vetorial em Alta Resolução da Cristolândia
  const LogoMark = (
    <svg
      viewBox="0 0 500 500"
      width={numericSize}
      height={numericSize}
      className={`shrink-0 drop-shadow-sm transition-transform ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Gradiente da Folha Principal (Direita) */}
        <linearGradient id="cristoMainLeafGrad" x1="15%" y1="85%" x2="90%" y2="15%">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="35%" stopColor="#059669" />
          <stop offset="70%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>

        {/* Gradiente da Folha Menor (Esquerda) */}
        <linearGradient id="cristoSmallLeafGrad" x1="90%" y1="90%" x2="10%" y2="20%">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="40%" stopColor="#059669" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>

        {/* Gradiente do Arco Orbital Inferior Verde */}
        <linearGradient id="cristoOrbitGreenGrad" x1="10%" y1="30%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="30%" stopColor="#059669" />
          <stop offset="65%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>

        {/* Gradiente do Arco Orbital Superior Prateado */}
        <linearGradient id="cristoOrbitSilverGrad" x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* 1. Arco Orbital Prateado (Superior Direito) */}
      <path
        d="M 395 355
           C 428 290, 425 190, 375 125
           C 325 60, 235 40, 160 58
           C 120 68, 88 88, 70 108
           C 68 110, 72 114, 75 112
           C 105 88, 160 66, 230 64
           C 310 62, 385 110, 408 185
           C 422 232, 412 298, 388 350
           C 386 354, 393 358, 395 355 Z"
        fill="url(#cristoOrbitSilverGrad)"
      />

      {/* 2. Haste / Broto Curvado Superior */}
      <path
        d="M 195 240
           C 178 190, 150 145, 115 115
           C 112 112, 116 108, 120 110
           C 162 138, 195 185, 208 242
           Z"
        fill="#059669"
      />

      {/* 3. Folha Menor (Esquerda) */}
      <path
        d="M 182 328
           C 145 285, 95 230, 48 186
           C 44 182, 48 178, 52 180
           C 95 198, 138 238, 165 282
           C 182 310, 185 325, 182 328 Z"
        fill="url(#cristoSmallLeafGrad)"
      />
      <path
        d="M 182 328
           C 152 320, 105 282, 65 242
           C 52 228, 48 200, 48 186
           C 55 210, 85 248, 125 285
           C 152 310, 172 324, 182 328 Z"
        fill="#047857"
        opacity="0.35"
      />

      {/* 4. Folha Principal Maior (Direita) */}
      <path
        d="M 188 358
           C 215 270, 275 160, 470 140
           C 475 140, 473 146, 468 149
           C 385 220, 310 340, 198 368
           C 192 370, 186 364, 188 358 Z"
        fill="url(#cristoMainLeafGrad)"
      />

      {/* Nervura Central da Folha Maior */}
      <path
        d="M 194 360
           C 245 275, 320 205, 465 142"
        fill="none"
        stroke="#ffffff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />

      {/* Sombra / Profundidade */}
      <path
        d="M 194 360
           C 245 275, 320 205, 465 142
           C 385 215, 310 335, 198 368
           Z"
        fill="#047857"
        opacity="0.18"
      />

      {/* 5. Arco Orbital Verde (Inferior / Envolvente) */}
      <path
        d="M 72 195
           C 75 190, 82 192, 84 198
           C 98 255, 88 335, 145 392
           C 198 445, 285 455, 355 422
           C 388 406, 408 382, 420 358
           C 422 354, 428 356, 426 360
           C 408 400, 370 435, 320 452
           C 240 478, 145 452, 92 390
           C 52 342, 60 255, 72 195 Z"
        fill="url(#cristoOrbitGreenGrad)"
      />
    </svg>
  );

  if (variant === 'mark') {
    return LogoMark;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 flex items-center justify-center shadow-sm shrink-0">
        {LogoMark}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
            SIG
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            JMN • CBB
          </span>
        </div>
        <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white uppercase leading-tight mt-0.5 truncate">
          SIG-<span className="text-emerald-600 dark:text-emerald-400">Cristolândia</span>
        </h1>
        {showSubtitle && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate">
            Sistema Integrado de Gestão
          </p>
        )}
      </div>
    </div>
  );
};
