type BrandLogoProps = {
  size?: number;
  className?: string;
};

export function BrandLogo({ size = 28, className }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      className={className}
      role="img"
      aria-label="Career Chronicles"
    >
      <path
        d="M20 9 A8 8 0 1 0 20 23"
        stroke="#22c55e"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M26 9 A8 8 0 1 0 26 23"
        stroke="#22c55e"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
