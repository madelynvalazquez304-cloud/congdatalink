import React from 'react';

// Exact Airtel iconic loop & signature emblem matching the uploaded logo
export const AirtelIcon: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-7 h-7',
  color,
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} shrink-0`}
      fill={color || '#E60000'}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Official Airtel Fluid "a" Signature Loop from uploaded asset */}
      <path d="M7.137 23.862c.79 0 1.708-.19 2.751-.554 1.55-.538 2.784-1.281 3.986-2.009l.316-.205a29.733 29.733 0 0 0 3.764-2.72 16.574 16.574 0 0 0 5.457-7.529c.395-1.138.949-3.384.268-5.487a7.117 7.117 0 0 0-2.862-3.749c-.158-.126-1.898-1.47-5.203-1.47-3.005 0-6.31 1.107-9.806 3.32l-.11.08-.317.205a20.133 20.133 0 0 0-2.309 1.693C1.585 6.813-.091 9.106.004 11.067c.031.79.427 1.534 1.075 2.008a3.472 3.472 0 0 0 2.214.68c1.803 0 3.765-.948 5.109-1.74l.253-.157.696-.443.237-.158c1.898-1.234 3.875-2.515 6.105-3.258a5.255 5.255 0 0 1 1.55-.285 3.163 3.163 0 0 1 .664.08 2.112 2.112 0 0 1 1.47 1.106c.523 1.012.396 2.61-.316 4.08a17.871 17.871 0 0 1-4.887 5.836 19.488 19.488 0 0 1-3.194 2.215l-.095.031a9.634 9.634 0 0 1-1.471.696l-.08.032-.41.158c-2.23.57-.87-1.329-.87-1.329.474-.537.98-1.028 1.518-1.502.316-.269.633-.554.933-.854l.064-.063c.395-.38.933-.902.901-1.645-.047-.98-1.075-1.582-2.056-1.613h-.063c-.95 0-1.819.522-2.404.98a7.27 7.27 0 0 0-1.598 1.74c-.6.901-1.85 3.226-.632 5.077.49.743 1.313 1.123 2.42 1.123z" />
    </svg>
  );
};

export const AirtelLogo: React.FC<{
  variant?: 'white' | 'red' | 'nextgen' | 'icon-only';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showSubtitle?: boolean;
}> = ({
  variant = 'red',
  size = 'md',
  className = '',
  showSubtitle = false,
}) => {
  const isWhite = variant === 'white';
  const isNextGen = variant === 'nextgen';
  const isIconOnly = variant === 'icon-only';

  const fillColor = isWhite ? '#FFFFFF' : '#E60000';

  if (isIconOnly) {
    const iconSize = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-7 h-7';
    return <AirtelIcon className={`${iconSize} ${className}`} color={fillColor} />;
  }

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl sm:text-2xl',
    lg: 'text-2xl sm:text-3xl',
  };

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Airtel Iconic Emblem */}
        <AirtelIcon className={`${iconSizes[size]} drop-shadow-sm`} color={fillColor} />

        {/* Airtel Wordmark */}
        <span
          className={`font-black tracking-tighter lowercase leading-none ${textSizes[size]} ${
            isWhite ? 'text-white' : 'text-[#E60000]'
          }`}
          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
        >
          airtel
        </span>
      </div>

      {/* Optional Subtitle / Slogan */}
      {showSubtitle && (
        <>
          {isNextGen ? (
            <div className="w-full flex flex-col items-center mt-1">
              <div className={`w-full h-[1.5px] rounded-full my-0.5 ${isWhite ? 'bg-white/60' : 'bg-[#E60000]'}`} />
              <span className={`text-[9px] sm:text-[10px] font-bold tracking-tight uppercase ${isWhite ? 'text-white/90' : 'text-neutral-700'}`}>
                NextGen Security
              </span>
            </div>
          ) : (
            <span
              className={`text-[8px] font-bold tracking-widest uppercase mt-0.5 ${
                isWhite ? 'text-white/90' : 'text-neutral-600'
              }`}
            >
              A REASON <span className={isWhite ? 'text-amber-300 font-extrabold' : 'text-[#E60000] font-extrabold'}>TO IMAGINE</span>
            </span>
          )}
        </>
      )}
    </div>
  );
};

export const StarlinkLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap justify-center select-none ${className}`}>
      <span className="text-[10px] uppercase font-bold tracking-widest text-white/80 whitespace-nowrap">
        EN COLLABORATION AVEC
      </span>
      <div className="flex items-center gap-1 font-black text-xs sm:text-sm tracking-widest text-white whitespace-nowrap">
        <span>STARLINK</span>
        <svg
          viewBox="0 0 24 24"
          className="w-3.5 h-3.5 fill-current text-white inline-block animate-pulse"
        >
          <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
        </svg>
      </div>
    </div>
  );
};
