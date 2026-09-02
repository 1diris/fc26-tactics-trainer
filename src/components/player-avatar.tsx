import { useEffect, useState } from "react";

function initialsOf(name: string): string {
  const parts = name
    .replace(/[^\p{L}\p{N}\s.'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

const sizeClass = {
  sm: "h-9 w-9 text-[11px]",
  md: "h-12 w-12 text-sm",
  lg: "h-14 w-14 text-base",
} as const;

export function PlayerAvatar({
  name,
  src,
  size = "md",
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizeClass;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = !!src && !failed;

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted font-semibold text-muted-foreground ${sizeClass[size]} ${className}`}
      aria-hidden={showImage ? undefined : true}
    >
      {showImage ? (
        <img
          src={src!}
          alt={`Portræt af ${name}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initialsOf(name)}</span>
      )}
    </div>
  );
}
