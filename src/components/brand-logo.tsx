type BrandLogoProps = {
  size?: number;
  className?: string;
};

export function BrandLogo({ size = 28, className }: BrandLogoProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} role="img" aria-label="Career Chronicles">
      <g fill="none" strokeWidth="4" strokeLinecap="round">
        <path d="M23.07 7.57A11 11 0 0 0 8.09 8.36" stroke="#fafafa" />
        <path d="M6.77 10.01A11 11 0 0 0 9.38 24.79" stroke="#fafafa" />
        <path d="M11.18 25.89A11 11 0 0 0 25.53 21.5" stroke="#22c55e" />
      </g>
    </svg>
  );
}
