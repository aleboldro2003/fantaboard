'use client';

import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  Check,
  ChevronRight,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';

import { AuthPanel } from '@/components/auth-panel';
import { Eyebrow, RoleDot, TeamMark } from '@/components/fanta-bits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import playersData from '@/data/players.json';
import { teamByCode } from '@/data/teams';
import { normalize, roleKeys, roleMeta, targetCredits, type Player, type Role } from '@/lib/fanta';
import type { AuctionPurchase, AuctionTeam } from '@/lib/database.types';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

const totalSlots = roleKeys.reduce((sum, role) => sum + roleMeta[role].limit, 0);


export function AuctionDashboard({
  pendingPurchase,
  onPendingPurchaseHandled,
}: {
  /** Acquisto arrivato dal tastierino di rilancio, da precompilare nel form. */
  pendingPurchase?: { player: Player; price: number } | null;
  onPendingPurchaseHandled?: () => void;
} = {}) {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(configured);
  const [team, setTeam] = useState<AuctionTeam | null>(null);
  const [purchases, setPurchases] = useState<AuctionPurchase[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [teamName, setTeamName] = useState('La mia squadra');
  const [initialBudget, setInitialBudget] = useState(500);
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [price, setPrice] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!configured) return;

    const supabase = getSupabaseBrowserClient();
    void supabase.auth
      .getSession()
      .then(({ data }) => setUser(data.session?.user ?? null))
      .catch((caughtError) => setError(caughtError instanceof Error ? caughtError.message : 'Impossibile verificare la sessione.'))
      .finally(() => setCheckingSession(false));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setCheckingSession(false);
      if (!session) {
        setTeam(null);
        setPurchases([]);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [configured]);

  // Il tastierino ha già scelto giocatore e prezzo: qui resta solo da confermare.
  useEffect(() => {
    if (!pendingPurchase) return;
    queueMicrotask(() => {
      setSelectedPlayer(pendingPurchase.player);
      setSearch(pendingPurchase.player.name);
      setPrice(pendingPurchase.price);
    });
  }, [pendingPurchase]);

  const loadWorkspace = useCallback(async (currentUser: User) => {
    setLoadingWorkspace(true);
    setError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: activeTeam, error: teamError } = await supabase
        .from('auction_teams')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (teamError) {
        setError(teamError.message);
        return;
      }

      setTeam(activeTeam);
      if (!activeTeam) {
        setPurchases([]);
        return;
      }

      const { data: savedPurchases, error: purchaseError } = await supabase
        .from('auction_purchases')
        .select('*')
        .eq('auction_team_id', activeTeam.id)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (purchaseError) setError(purchaseError.message);
      setPurchases(savedPurchases ?? []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Impossibile caricare la tua asta. Riprova.');
    } finally {
      setLoadingWorkspace(false);
    }
  }, []);

  useEffect(() => {
    if (user) queueMicrotask(() => void loadWorkspace(user));
  }, [user, loadWorkspace]);

  const spent = useMemo(() => purchases.reduce((total, item) => total + item.price, 0), [purchases]);
  const budget = team?.initial_budget ?? initialBudget;
  const remaining = budget - spent;
  const purchasedIds = useMemo(() => new Set(purchases.map((item) => item.player_id)), [purchases]);

  const suggestions = useMemo(() => {
    const needle = normalize(search.trim());
    if (needle.length < 2) return [];
    return playersData.players
      .filter((player) => !purchasedIds.has(player.id))
      .filter((player) => {
        const club = teamByCode[player.team]?.name ?? player.team;
        return normalize(`${player.name} ${club}`).includes(needle);
      })
      .slice(0, 8);
  }, [search, purchasedIds]);

  async function createTeam(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setPending(true);
    setError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: createError } = await supabase
        .from('auction_teams')
        .insert({ user_id: user.id, name: teamName.trim(), initial_budget: initialBudget })
        .select()
        .single();

      if (createError) setError(createError.message);
      else setTeam(data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Impossibile creare la squadra. Riprova.');
    } finally {
      setPending(false);
    }
  }

  async function addPurchase(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !team || !selectedPlayer) return;
    if (price < 1) {
      setError('Inserisci almeno 1 credito.');
      return;
    }
    if (price > remaining) {
      setError(`Hai ${remaining} crediti disponibili.`);
      return;
    }

    setPending(true);
    setError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: purchaseError } = await supabase
        .from('auction_purchases')
        .insert({
          auction_team_id: team.id,
          user_id: user.id,
          player_id: selectedPlayer.id,
          player_name: selectedPlayer.name,
          player_team: selectedPlayer.team,
          player_role: selectedPlayer.role,
          price,
        })
        .select()
        .single();

      if (purchaseError) setError(purchaseError.message);
      else {
        setPurchases((current) => [data, ...current]);
        setSearch('');
        setSelectedPlayer(null);
        setPrice(1);
        onPendingPurchaseHandled?.();
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Impossibile salvare l’acquisto. Riprova.');
    } finally {
      setPending(false);
    }
  }

  async function updatePrice(id: number, nextPrice: number) {
    if (nextPrice < 1) return;
    const current = purchases.find((item) => item.id === id);
    if (!current) return;
    const availableForItem = remaining + current.price;
    if (nextPrice > availableForItem) {
      setError(`Puoi assegnare al massimo ${availableForItem} crediti a questo acquisto.`);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from('auction_purchases')
        .update({ price: nextPrice, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) setError(updateError.message);
      else setPurchases((items) => items.map((item) => (item.id === id ? { ...item, price: nextPrice } : item)));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Impossibile aggiornare il prezzo. Riprova.');
    }
  }

  async function removePurchase(id: number) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: deleteError } = await supabase.from('auction_purchases').delete().eq('id', id);
      if (deleteError) setError(deleteError.message);
      else setPurchases((items) => items.filter((item) => item.id !== id));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Impossibile rimuovere l’acquisto. Riprova.');
    }
  }

  async function signOut() {
    try {
      const { error: signOutError } = await getSupabaseBrowserClient().auth.signOut();
      if (signOutError) setError(signOutError.message);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Impossibile uscire dall’account.');
    }
  }

  if (!configured) {
    return (
      <div className="rounded-[24px] border border-warn/25 bg-warn/8 p-6">
        <h2 className="font-display text-lg font-extrabold text-warn">Collegamento Supabase da configurare</h2>
        <p className="mt-1.5 text-sm text-foreground/50">
          Aggiungi URL e chiave pubblicabile nelle variabili ambiente del deploy.
        </p>
      </div>
    );
  }

  if (checkingSession) {
    return (
      <div className="num grid min-h-[360px] place-items-center text-xs tracking-widest text-foreground/30 uppercase">
        Controllo sessione…
      </div>
    );
  }

  if (!user) return <AuthPanel />;

  if (loadingWorkspace) {
    return (
      <div className="num grid min-h-[360px] place-items-center text-xs tracking-widest text-foreground/30 uppercase">
        Carico la tua asta…
      </div>
    );
  }

  if (!team) {
    return (
      <div className="mx-auto max-w-2xl rounded-[28px] border border-white/7 bg-card p-6 sm:p-9">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Trophy className="size-6" />
        </span>
        <Eyebrow className="mt-5">Primo passo</Eyebrow>
        <h2 className="font-display mt-2 text-3xl font-extrabold">Crea la squadra per questa asta</h2>
        <p className="mt-2 text-sm text-foreground/45">
          Imposta nome e crediti iniziali. Potrai poi registrare ogni acquisto in tempo reale.
        </p>
        <form className="mt-7 grid gap-4 sm:grid-cols-[1fr_170px]" onSubmit={createTeam}>
          <label htmlFor="auction-team-name" className="text-xs font-bold text-foreground/60">
            Nome squadra
            <Input
              id="auction-team-name"
              required
              maxLength={80}
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              className="mt-2 h-12 rounded-xl border-white/7 bg-secondary"
            />
          </label>
          <label htmlFor="auction-team-budget" className="text-xs font-bold text-foreground/60">
            Budget iniziale
            <Input
              id="auction-team-budget"
              required
              type="number"
              min={1}
              max={100000}
              value={initialBudget}
              onChange={(event) => setInitialBudget(Number(event.target.value) || 500)}
              className="num mt-2 h-12 rounded-xl border-white/7 bg-secondary font-extrabold tabular-nums"
            />
          </label>
          {error && (
            <p role="alert" className="text-xs text-danger sm:col-span-2">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={pending || !teamName.trim()}
            className="h-12 rounded-xl text-sm font-extrabold sm:col-span-2"
          >
            <Plus /> Crea dashboard asta
          </Button>
        </form>
      </div>
    );
  }

  const slotsUsed = purchases.length;
  const spentPct = budget ? Math.round((spent / budget) * 100) : 0;

  return (
    <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-start">
      <div className="space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Eyebrow className="text-foreground/40">{team.name}</Eyebrow>
            <p className="mt-1 text-[15px] font-extrabold">La mia asta</p>
          </div>
          <span className="num flex shrink-0 items-center gap-2 rounded-full border border-danger/30 bg-danger/12 px-3 py-1.5 text-[11px] font-extrabold text-danger">
            <span className="live-dot size-1.5 rounded-full bg-danger" />
            LIVE
          </span>
        </div>

        {/* HUD crediti: il numero che si guarda dieci volte al minuto. */}
        <div className="rounded-[30px] border border-primary/18 bg-[linear-gradient(150deg,#12211b,#0b120f)] p-5.5">
          <p className="num text-[10px] font-extrabold tracking-[.16em] text-primary/75 uppercase">Crediti residui</p>
          <div className="mt-1.5 flex items-end gap-2">
            <p
              className={`num text-[72px] leading-[.85] font-extrabold tracking-[-.06em] tabular-nums sm:text-[76px] ${
                remaining < 0 ? 'text-danger' : 'text-foreground'
              }`}
            >
              {remaining}
            </p>
            <p className="num mb-2 text-[15px] font-bold text-foreground/35">/ {budget}</p>
          </div>

          {/* Una barra sola, segmentata per reparto: dove sono finiti i crediti. */}
          <div className="mt-4.5 flex h-2.5 gap-0.5">
            {roleKeys.map((role) => {
              const roleSpent = purchases
                .filter((item) => item.player_role === role)
                .reduce((total, item) => total + item.price, 0);
              if (!roleSpent) return null;
              return (
                <span
                  key={role}
                  className="rounded-full"
                  style={{ flex: roleSpent, background: roleMeta[role].color }}
                  title={`${roleMeta[role].label}: ${roleSpent} cr`}
                />
              );
            })}
            {remaining > 0 && <span className="rounded-full bg-white/8" style={{ flex: remaining }} />}
          </div>

          <div className="mt-4 flex justify-between gap-2">
            {(
              [
                ['Slot', `${slotsUsed}/${totalSlots}`, 'var(--foreground)'],
                ['Spesi', String(spent), 'var(--foreground)'],
                ['Media/slot', slotsUsed ? (spent / slotsUsed).toFixed(1).replace('.', ',') : '—', 'var(--foreground)'],
                ['% budget', `${spentPct}%`, remaining < 0 ? 'var(--danger)' : 'var(--primary)'],
              ] as const
            ).map(([label, value, tint]) => (
              <div key={label}>
                <p className="text-[9.5px] font-bold tracking-[.1em] text-foreground/35 uppercase">{label}</p>
                <p className="num mt-1 text-base font-extrabold tabular-nums" style={{ color: tint }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/6 bg-card p-4">
          <Eyebrow className="mb-3">Reparti · spesa vs piano</Eyebrow>
          <div className="flex flex-col gap-3">
            {roleKeys.map((role) => {
              const meta = roleMeta[role];
              const rolePurchases = purchases.filter((item) => item.player_role === role);
              const roleSpent = rolePurchases.reduce((total, item) => total + item.price, 0);
              const plan = Math.round((meta.budgetShare / 100) * budget);
              return (
                <div key={role}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <RoleDot role={role} />
                    <span className="flex-1 text-[12.5px] font-bold text-foreground/80">{meta.label}</span>
                    <span className="num text-[11px] font-bold text-foreground/45">
                      {rolePurchases.length}/{meta.limit}
                    </span>
                    <span className="num w-20 text-right text-[12px] font-extrabold tabular-nums">
                      {roleSpent}
                      <span className="text-foreground/35">/{plan}</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/7">
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{
                        width: `${Math.min(100, plan ? (roleSpent / plan) * 100 : 0)}%`,
                        background: roleSpent > plan ? 'var(--danger)' : meta.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-white/6 bg-card">
          <div className="flex items-center justify-between border-b border-white/6 px-4 py-3.5">
            <div>
              <h3 className="font-display font-extrabold">Rosa acquistata</h3>
              <p className="text-[11px] text-foreground/40">Tocca il prezzo per correggerlo.</p>
            </div>
            <span className="num text-[11px] font-bold text-foreground/40">{purchases.length} giocatori</span>
          </div>
          {purchases.length === 0 ? (
            <div className="grid min-h-[220px] place-items-center p-8 text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-foreground/30">
                  <Trophy className="size-5" />
                </span>
                <p className="mt-3 text-sm font-bold">La rosa è ancora vuota</p>
                <p className="mt-1 text-xs text-foreground/40">Il primo acquisto apparirà qui.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {purchases.map((item) => {
                const listed = playersData.players.find((player) => player.id === item.player_id);
                const target = listed ? targetCredits(listed, budget) : null;
                const delta = target ? Math.round(((item.price - target) / target) * 100) : null;
                return (
                  <div key={item.id} className="flex items-center gap-3 px-3.5 py-3">
                    <span
                      className="h-9 w-[3px] shrink-0 rounded-full"
                      style={{ background: roleMeta[item.player_role as Role]?.color ?? 'var(--muted-foreground)' }}
                    />
                    <TeamMark code={item.player_team} size="xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{item.player_name}</p>
                      <p className="num truncate text-[10px] text-foreground/35">
                        {teamByCode[item.player_team]?.name}
                        {target !== null && ` · target ${target}`}
                      </p>
                    </div>
                    {delta !== null && (
                      <span
                        className="num hidden w-12 text-right text-[10px] font-extrabold sm:block"
                        style={{ color: delta > 0 ? 'var(--warn)' : 'var(--primary)' }}
                      >
                        {delta > 0 ? '+' : ''}
                        {delta}%
                      </span>
                    )}
                    <div className="relative w-18 shrink-0">
                      <Input
                        aria-label={`Prezzo di ${item.player_name}`}
                        type="number"
                        min={1}
                        defaultValue={item.price}
                        onBlur={(event) => void updatePrice(item.id, Number(event.target.value) || item.price)}
                        className="num h-9 rounded-xl border-white/7 bg-secondary pr-6 text-right text-xs font-extrabold tabular-nums"
                      />
                      <span className="num absolute top-1/2 right-2 -translate-y-1/2 text-[9px] text-foreground/30">
                        cr
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Rimuovi ${item.player_name}`}
                      onClick={() => void removePurchase(item.id)}
                      className="shrink-0 text-foreground/25 hover:text-danger"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-white/6 bg-card px-4 py-3 text-[10.5px] text-foreground/35">
          <ShieldCheck className="size-4 text-primary" /> Dati salvati su Supabase, visibili solo dal tuo account.
          <span className="ml-auto flex items-center gap-2">
            <span className="max-w-[150px] truncate">{user.email}</span>
            <Button
              variant="ghost"
              size="xs"
              onClick={signOut}
              className="rounded-full bg-white/6 text-foreground/60 hover:text-foreground"
            >
              <LogOut /> Esci
            </Button>
          </span>
        </div>
      </div>

      {/* Registrazione acquisto: sticky su desktop, in cima al flusso su mobile. */}
      <section className="order-first rounded-[24px] border border-white/6 bg-card p-4.5 xl:sticky xl:top-[76px] xl:order-none">
        <div className="flex items-center gap-2">
          <Plus className="size-4 text-primary" />
          <h3 className="font-display font-extrabold">Registra un acquisto</h3>
        </div>
        <p className="mt-1 text-[11.5px] text-foreground/40">
          Cerca nel listone ufficiale e inserisci il prezzo battuto.
        </p>

        <form className="mt-4 space-y-3" onSubmit={addPurchase}>
          <div className="relative">
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-foreground/40" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSelectedPlayer(null);
              }}
              placeholder="Es. Lautaro, Inter…"
              className="h-12 rounded-2xl border-white/7 bg-secondary pl-10.5 placeholder:text-foreground/35"
            />
            {suggestions.length > 0 && !selectedPlayer && (
              <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-2xl border border-white/8 bg-popover p-1 shadow-2xl">
                {suggestions.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlayer(player);
                      setSearch(player.name);
                      setPrice(Math.max(1, targetCredits(player, budget)));
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-white/6"
                  >
                    <TeamMark code={player.team} size="xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold">{player.name}</span>
                      <span className="num block text-[10px] text-foreground/35">
                        {teamByCode[player.team]?.name} · {player.role} · QA {player.quote}
                      </span>
                    </span>
                    <span className="num text-[11px] font-extrabold text-primary">
                      {targetCredits(player, budget)}
                    </span>
                    <ChevronRight className="size-3.5 shrink-0 text-foreground/25" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPlayer && (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-3">
              <TeamMark code={selectedPlayer.team} size="xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{selectedPlayer.name}</p>
                <p className="num text-[10px] text-primary/80">
                  {teamByCode[selectedPlayer.team]?.name} · target {targetCredits(selectedPlayer, budget)} cr
                </p>
              </div>
              <button
                type="button"
                aria-label="Togli la selezione"
                onClick={() => {
                  setSelectedPlayer(null);
                  setSearch('');
                  onPendingPurchaseHandled?.();
                }}
                className="grid size-7 shrink-0 place-items-center rounded-full text-foreground/35 hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <label htmlFor="purchase-price" className="block text-xs font-bold text-foreground/60">
            Prezzo pagato
            <div className="relative mt-2">
              <Input
                id="purchase-price"
                type="number"
                min={1}
                max={Math.max(1, remaining)}
                value={price}
                onChange={(event) => setPrice(Number(event.target.value) || 1)}
                className="num h-13 rounded-2xl border-white/7 bg-secondary pr-10 text-2xl font-extrabold tabular-nums"
              />
              <span className="num absolute top-1/2 right-4 -translate-y-1/2 text-xs text-foreground/35">cr</span>
            </div>
          </label>

          {error && (
            <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2.5 text-xs text-danger">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={pending || !selectedPlayer || remaining < 1}
            className="h-13 w-full rounded-2xl text-[15px] font-black shadow-[0_14px_34px_-12px_rgba(0,227,160,.6)]"
          >
            <Check strokeWidth={3} /> Aggiungi alla rosa
          </Button>
        </form>
      </section>
    </div>
  );
}
