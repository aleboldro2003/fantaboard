import Image from 'next/image';

import { roleColor, roleMeta, type Role } from '@/lib/fanta';
import { teamByCode, type TeamInfo } from '@/data/teams';
import { cn } from '@/lib/utils';

// Raggi espliciti: la scala del tema è troppo morbida a queste dimensioni
// e trasformerebbe le piastrelle in cerchi.
const markSizes = {
  xs: 'size-8 rounded-[10px] p-1',
  sm: 'size-9.5 rounded-[12px] p-1',
  md: 'size-10 rounded-[14px] p-1.5',
  lg: 'size-16 rounded-[20px] p-2.5',
} as const;

/**
 * I loghi Serie A sono pensati per fondo chiaro: su nero vanno posati su una
 * piastrella bianca, altrimenti spariscono.
 */
export function TeamMark({
  team,
  code,
  size = 'md',
  className,
}: {
  team?: TeamInfo;
  code?: string;
  size?: keyof typeof markSizes;
  className?: string;
}) {
  const info = team ?? (code ? teamByCode[code] : undefined);
  return (
    <span className={cn('grid shrink-0 place-items-center bg-white/92', markSizes[size], className)}>
      {info ? (
        <Image
          src={`/logos/${info.code}.svg`}
          alt={`Logo ${info.name}`}
          width={64}
          height={64}
          unoptimized
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <span className="num text-[10px] text-black/40">—</span>
      )}
    </span>
  );
}

/** Quadratino colorato del ruolo, l'unità minima del codice colore. */
export function RoleDot({ role, className }: { role: string; className?: string }) {
  return (
    <span
      className={cn('size-[7px] shrink-0 rounded-[2px]', className)}
      style={{ background: roleColor(role) }}
    />
  );
}

/** Pastiglia con la sigla del ruolo, usata nelle schede. */
export function RolePill({ role, className }: { role: string; className?: string }) {
  const meta = roleMeta[role as Role];
  const color = roleColor(role);
  return (
    <span
      className={cn('num rounded-[10px] border px-2.5 py-1 text-[10px] font-extrabold tracking-wider', className)}
      style={{ color, borderColor: `color-mix(in srgb, ${color} 32%, transparent)`, background: `color-mix(in srgb, ${color} 13%, transparent)` }}
    >
      {meta?.short ?? role}
    </span>
  );
}

/** Occhiello mono in maiuscoletto spaziato: la voce ricorrente del design. */
export function Eyebrow({
  children,
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn('num text-[10px] font-bold tracking-[.16em] text-foreground/30 uppercase', className)}
      {...props}
    >
      {children}
    </p>
  );
}

const setPieceTint = {
  penalty: 'var(--primary)',
  freeKick: 'var(--role-c)',
  corner: 'var(--warn)',
} as const;

export function SetPieceBadge({
  type,
  children,
}: {
  type: keyof typeof setPieceTint;
  children: React.ReactNode;
}) {
  const color = setPieceTint[type];
  return (
    <span
      className="rounded-full border px-2.5 py-1 text-[11px] font-bold"
      style={{ color, borderColor: `color-mix(in srgb, ${color} 30%, transparent)`, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      {children}
    </span>
  );
}
