interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 32 }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-primary)]"
      style={{ width: size, height: size }}
      title={name}
    >
      {initials}
    </span>
  );
}
