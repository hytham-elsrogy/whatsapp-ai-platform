// Deterministic (same name -> same color) so an agent's initials avatar
// stays visually consistent everywhere it appears, without storing a color.
const PALETTE = [
  'bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[1][0];
}

interface Props {
  name: string;
  size?: number;
  className?: string;
}

export function Avatar({ name, size = 32, className = '' }: Props) {
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={`flex flex-shrink-0 items-center justify-center rounded-full font-semibold text-white ${colorFor(name)} ${className}`}
    >
      {initialsFor(name).toUpperCase()}
    </div>
  );
}
