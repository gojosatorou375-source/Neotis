interface LogoProps {
  className?: string;
  size?: number;
}

/** The Noetis mark: an open book branching into a small node/connection
 * cluster — knowledge (the book) becoming connected insight (the nodes). */
export function Logo({ className, size = 20 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="noetisMarkInline" x1="6" y1="10" x2="58" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1c6b74" />
          <stop offset="55%" stopColor="#3f8f8a" />
          <stop offset="100%" stopColor="#d8a548" />
        </linearGradient>
      </defs>
      <path
        d="M8 20C8 14 17 10 32 16C47 10 56 14 56 20V44C56 44 47 38 32 44C17 38 8 44 8 44V20Z"
        stroke="url(#noetisMarkInline)"
        strokeWidth={4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M32 16V44" stroke="url(#noetisMarkInline)" strokeWidth={3.5} strokeLinecap="round" />
      <path d="M32 16V8" stroke="url(#noetisMarkInline)" strokeWidth={3.5} strokeLinecap="round" />
      <path d="M32 8L21 13" stroke="url(#noetisMarkInline)" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M32 8L43 13" stroke="url(#noetisMarkInline)" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx="32" cy="8" r="4.5" fill="url(#noetisMarkInline)" />
      <circle cx="21" cy="13" r="3" fill="url(#noetisMarkInline)" />
      <circle cx="43" cy="13" r="3" fill="url(#noetisMarkInline)" />
    </svg>
  );
}
