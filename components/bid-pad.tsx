'use client';

import { useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RolePill, TeamMark } from '@/components/fanta-bits';
import { teamByCode } from '@/data/teams';
import {
  limitCredits,
  targetCredits,
  verdictFor,
  verdictMeta,
  type Player,
  type Verdict,
} from '@/lib/fanta';

const steps = [1, 5] as const;

function hint(verdict: Verdict, limit: number, bid: number, fallback: string) {
  if (verdict === 'oltre') {
    return `Sopra il limite: ogni credito in più qui lo togli agli altri reparti. Meglio lasciarlo e virare su ${fallback}.`;
  }
  if (verdict === 'target') {
    return 'Prezzo giusto: resti dentro il piano del reparto senza intaccare gli slot pesanti.';
  }
  return `Zona rilancio: sei sopra il target ma dentro il limite. Puoi salire ancora di ${limit - bid} cr.`;
}

/**
 * Tastierino di rilancio: si apre dalla scheda giocatore durante l'asta e
 * risponde a una sola domanda — a quanto mi fermo?
 */
export function BidPad({
  player,
  budget,
  fallbackName,
  onOpenChange,
  onTaken,
  onLost,
}: {
  player: Player | null;
  budget: number;
  fallbackName?: string;
  onOpenChange: (open: boolean) => void;
  onTaken: (player: Player, price: number) => void;
  onLost: () => void;
}) {
  // Si parte dalla quotazione ufficiale; il montaggio è per giocatore (vedi key).
  const [bid, setBid] = useState(() => Math.max(1, player?.quote ?? 1));
  const [step, setStep] = useState<(typeof steps)[number]>(1);

  if (!player) return null;

  const target = targetCredits(player, budget);
  const limit = limitCredits(player, budget);
  const club = teamByCode[player.team];
  const verdict = verdictFor(bid, target, limit);
  const tint = verdictMeta[verdict].color;
  const scale = Math.max(limit * 1.45, bid * 1.1);
  const pct = (value: number) => `${Math.min(100, (value / scale) * 100).toFixed(1)}%`;
  const shareOfBudget = ((bid / budget) * 100).toFixed(1);

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-h-[92dvh] gap-0 overflow-y-auto rounded-t-[36px] border-white/10 bg-[#0c1310] px-5 pt-3.5 pb-[max(28px,env(safe-area-inset-bottom))] sm:max-w-[440px]"
      >
        <span className="mx-auto mb-4 block h-1 w-11 rounded-full bg-white/20" />

        <SheetHeader className="flex-row items-center gap-3.5 p-0">
          <TeamMark code={player.team} size="lg" className="size-13 rounded-2xl p-1.5" />
          <div className="min-w-0 flex-1">
            <SheetTitle className="font-display truncate text-[23px] leading-none font-extrabold text-foreground">
              {player.name}
            </SheetTitle>
            <SheetDescription className="num mt-1.5 truncate text-[10.5px] text-foreground/40 uppercase">
              {club?.name ?? player.team} · QA {player.quote} · FVM {player.fvm}
            </SheetDescription>
          </div>
          <RolePill role={player.role} />
        </SheetHeader>

        <div
          className="mt-5 rounded-[26px] border p-4"
          style={{
            borderColor: `color-mix(in srgb, ${tint} 30%, transparent)`,
            background: `color-mix(in srgb, ${tint} 9%, transparent)`,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="num text-[10px] font-extrabold tracking-[.16em]" style={{ color: tint }}>
              {verdictMeta[verdict].label}
            </p>
            <p className="num text-[11px] font-bold text-foreground/40">
              target {target} · limite {limit}
            </p>
          </div>

          <div className="mt-3.5 flex items-center gap-3.5">
            <button
              type="button"
              aria-label={`Togli ${step} crediti`}
              onClick={() => setBid((value) => Math.max(1, value - step))}
              className="grid size-14 place-items-center rounded-[20px] border border-white/12 bg-white/8 text-foreground transition hover:bg-white/14 active:translate-y-px"
            >
              <Minus className="size-5" strokeWidth={2.6} />
            </button>

            <div className="flex-1 text-center">
              <p
                className="num text-[56px] leading-[.9] font-extrabold tracking-[-.05em] tabular-nums"
                style={{ color: tint }}
                aria-live="polite"
              >
                {bid}
              </p>
              <button
                type="button"
                onClick={() => setStep((value) => (value === 1 ? 5 : 1))}
                className="num mt-1.5 text-[10px] font-bold tracking-[.14em] text-foreground/35 uppercase transition hover:text-foreground/70"
              >
                crediti · passo {step}
              </button>
            </div>

            <button
              type="button"
              aria-label={`Aggiungi ${step} crediti`}
              onClick={() => setBid((value) => value + step)}
              className="grid size-14 place-items-center rounded-[20px] border border-white/12 bg-white/8 text-foreground transition hover:bg-white/14 active:translate-y-px"
            >
              <Plus className="size-5" strokeWidth={2.6} />
            </button>
          </div>

          <div className="relative mt-4 h-2 rounded-full bg-white/8">
            <span
              className="absolute inset-y-0 left-0 rounded-full transition-[width]"
              style={{ width: pct(bid), background: tint }}
            />
            <span
              className="absolute -top-1 -bottom-1 w-0.5 bg-foreground/70"
              style={{ left: pct(target) }}
              title={`Target ${target} cr`}
            />
            <span
              className="absolute -top-1 -bottom-1 w-0.5 bg-danger/80"
              style={{ left: pct(limit) }}
              title={`Limite ${limit} cr`}
            />
          </div>

          <p className="mt-2.5 text-[12px] leading-snug text-pretty text-foreground/50">
            {hint(verdict, limit, bid, fallbackName ?? 'un profilo della stessa fascia')}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2.5">
          {(
            [
              ['−10', () => setBid((value) => Math.max(1, value - 10))],
              ['TARGET', () => setBid(target)],
              ['+10', () => setBid((value) => value + 10)],
              ['LIMITE', () => setBid(limit)],
            ] as const
          ).map(([label, action]) => (
            <button
              key={label}
              type="button"
              onClick={action}
              className="num h-11 rounded-[14px] border border-white/8 bg-white/5 text-[12px] font-extrabold text-foreground/60 transition hover:bg-white/10 hover:text-foreground active:translate-y-px"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3.5 flex gap-2.5">
          <button
            type="button"
            onClick={() => onTaken(player, bid)}
            className="flex h-14 flex-[1.4] items-center justify-center gap-2 rounded-[20px] bg-primary text-[15px] font-black text-primary-foreground shadow-[0_14px_34px_-12px_rgba(0,227,160,.65)] transition hover:bg-primary/90 active:translate-y-px"
          >
            <Check className="size-4.5" strokeWidth={3} /> PRESO
          </button>
          <button
            type="button"
            onClick={onLost}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[20px] border border-white/12 bg-white/6 text-[15px] font-extrabold text-foreground/70 transition hover:bg-white/10 active:translate-y-px"
          >
            <X className="size-4" strokeWidth={2.6} /> Andato
          </button>
        </div>

        <p className="num mt-3.5 text-center text-[10.5px] tracking-wide text-foreground/30 uppercase">
          {bid} cr · {shareOfBudget}% del budget da {budget}
        </p>
      </SheetContent>
    </Sheet>
  );
}
