'use client';

import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import Image from 'next/image';
import type { User } from '@supabase/supabase-js';
import {
  Banknote,
  Check,
  ChevronRight,
  CircleDollarSign,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  TrendingDown,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';

import { AuthPanel } from '@/components/auth-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import playersData from '@/data/players.json';
import { teamByCode } from '@/data/teams';
import type { AuctionPurchase, AuctionTeam } from '@/lib/database.types';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

type Player = (typeof playersData.players)[number];
type Role = 'P' | 'D' | 'C' | 'A';

const roleMeta: Record<Role, { label: string; limit: number; color: string }> = {
  P: { label: 'Portieri', limit: 3, color: 'bg-amber-300 text-amber-950' },
  D: { label: 'Difensori', limit: 8, color: 'bg-emerald-300 text-emerald-950' },
  C: { label: 'Centrocampisti', limit: 8, color: 'bg-sky-300 text-sky-950' },
  A: { label: 'Attaccanti', limit: 6, color: 'bg-fuchsia-300 text-fuchsia-950' },
};

function clean(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function ClubLogo({ code }: { code: string }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted/60 p-1.5">
      <Image src={`/logos/${code}.svg`} alt="" width={36} height={36} unoptimized className="size-full object-contain" />
    </span>
  );
}

export function AuctionDashboard() {
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
  const remaining = (team?.initial_budget ?? initialBudget) - spent;
  const purchasedIds = useMemo(() => new Set(purchases.map((item) => item.player_id)), [purchases]);

  const suggestions = useMemo(() => {
    const needle = clean(search.trim());
    if (needle.length < 2) return [];
    return playersData.players
      .filter((player) => !purchasedIds.has(player.id))
      .filter((player) => {
        const club = teamByCode[player.team]?.name ?? player.team;
        return clean(`${player.name} ${club}`).includes(needle);
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
      <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h2 className="font-semibold">Collegamento Supabase da configurare</h2>
        <p className="mt-1 text-sm text-amber-900/70">Aggiungi URL e chiave pubblicabile nelle variabili ambiente del deploy.</p>
      </div>
    );
  }

  if (checkingSession) {
    return <div className="grid min-h-[360px] place-items-center text-sm text-muted-foreground">Controllo sessione…</div>;
  }

  if (!user) return <AuthPanel />;

  if (loadingWorkspace) {
    return <div className="grid min-h-[360px] place-items-center text-sm text-muted-foreground">Carico la tua asta…</div>;
  }

  if (!team) {
    return (
      <div className="mx-auto max-w-2xl rounded-[28px] border bg-card p-6 shadow-[0_24px_70px_rgba(8,15,13,.07)] sm:p-9">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-lime-200 text-lime-950"><Trophy className="size-6" /></div>
        <Badge variant="outline" className="mt-5">PRIMO PASSO</Badge>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-.04em]">Crea la squadra per questa asta</h2>
        <p className="mt-2 text-sm text-muted-foreground">Imposta nome e crediti iniziali. Potrai poi registrare ogni acquisto in tempo reale.</p>
        <form className="mt-7 grid gap-4 sm:grid-cols-[1fr_170px]" onSubmit={createTeam}>
          <label htmlFor="auction-team-name" className="text-xs font-medium">Nome squadra<Input id="auction-team-name" required maxLength={80} value={teamName} onChange={(event) => setTeamName(event.target.value)} className="mt-1.5 h-11" /></label>
          <label htmlFor="auction-team-budget" className="text-xs font-medium">Budget iniziale<Input id="auction-team-budget" required type="number" min={1} max={100000} value={initialBudget} onChange={(event) => setInitialBudget(Number(event.target.value) || 500)} className="mt-1.5 h-11" /></label>
          {error && <p role="alert" className="text-xs text-red-600 sm:col-span-2">{error}</p>}
          <Button type="submit" disabled={pending || !teamName.trim()} className="h-11 rounded-xl sm:col-span-2"><Plus /> Crea dashboard asta</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[24px] bg-[#0b1210] p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-lime-300 text-[#0b1210]"><Trophy className="size-5" /></span>
          <div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-lime-300">Asta in corso</p><h2 className="text-xl font-semibold tracking-tight">{team.name}</h2></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/55">
          <UserRound className="size-3.5" /> <span className="max-w-[190px] truncate">{user.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut} className="ml-1 rounded-full bg-white/[.07] text-white hover:bg-white/10 hover:text-white"><LogOut /> Esci</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Crediti rimasti', remaining, `${team.initial_budget} iniziali`, CircleDollarSign, remaining < team.initial_budget * 0.2 ? 'text-red-600' : 'text-emerald-700'],
          ['Spesi', spent, `${team.initial_budget ? Math.round((spent / team.initial_budget) * 100) : 0}% del budget`, Banknote, 'text-foreground'],
          ['Giocatori', purchases.length, '25 slot standard', Users, 'text-foreground'],
        ].map(([label, value, note, Icon, color]) => {
          const MetricIcon = Icon as typeof CircleDollarSign;
          return <div key={String(label)} className="rounded-[20px] border bg-card p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">{String(label)}</p><MetricIcon className="size-4 text-muted-foreground" /></div><p className={`mt-3 text-3xl font-semibold tabular-nums ${String(color)}`}>{String(value)}<span className="ml-1 text-sm font-normal text-muted-foreground">{label !== 'Giocatori' ? 'cr' : ''}</span></p><p className="mt-1 text-[10px] text-muted-foreground">{String(note)}</p></div>;
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(roleMeta) as Role[]).map((role) => {
          const info = roleMeta[role];
          const rolePurchases = purchases.filter((item) => item.player_role === role);
          const roleSpent = rolePurchases.reduce((total, item) => total + item.price, 0);
          return (
            <div key={role} className="rounded-[18px] border bg-card p-3.5">
              <div className="flex items-center gap-2"><span className={`grid size-7 place-items-center rounded-lg text-[10px] font-black ${info.color}`}>{role}</span><p className="text-xs font-semibold">{info.label}</p><span className="ml-auto text-xs tabular-nums text-muted-foreground">{rolePurchases.length}/{info.limit}</span></div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, (rolePurchases.length / info.limit) * 100)}%` }} /></div>
              <p className="mt-2 text-[10px] text-muted-foreground">{roleSpent} crediti spesi</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
        <section className="rounded-[24px] border bg-card p-5 shadow-[0_16px_50px_rgba(8,15,13,.045)]">
          <div className="flex items-center gap-2"><Plus className="size-4" /><h3 className="font-semibold">Registra un acquisto</h3></div>
          <p className="mt-1 text-xs text-muted-foreground">Cerca nel listone ufficiale e inserisci il prezzo battuto.</p>
          <form className="mt-5 space-y-4" onSubmit={addPurchase}>
            <div className="relative">
              <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => { setSearch(event.target.value); setSelectedPlayer(null); }} placeholder="Es. Lautaro, Inter…" className="h-11 pl-10" />
              {suggestions.length > 0 && !selectedPlayer && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border bg-popover p-1 shadow-xl">
                  {suggestions.map((player) => (
                    <button key={player.id} type="button" onClick={() => { setSelectedPlayer(player); setSearch(player.name); setPrice(Math.max(1, player.quote)); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted">
                      <ClubLogo code={player.team} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{player.name}</span><span className="block text-[10px] text-muted-foreground">{teamByCode[player.team]?.name} · {player.role} · QA {player.quote}</span></span>
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedPlayer && (
              <div className="flex items-center gap-3 rounded-xl border border-lime-300 bg-lime-50 p-3 text-lime-950">
                <ClubLogo code={selectedPlayer.team} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{selectedPlayer.name}</p><p className="text-[10px] text-lime-900/65">{teamByCode[selectedPlayer.team]?.name} · ruolo {selectedPlayer.role}</p></div>
                <Check className="size-4" />
              </div>
            )}

            <label htmlFor="purchase-price" className="block text-xs font-medium">Prezzo pagato<div className="relative mt-1.5"><Input id="purchase-price" type="number" min={1} max={Math.max(1, remaining)} value={price} onChange={(event) => setPrice(Number(event.target.value) || 1)} className="h-11 pr-10 text-lg font-semibold tabular-nums" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">cr</span></div></label>
            {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</p>}
            <Button type="submit" disabled={pending || !selectedPlayer || remaining < 1} className="h-11 w-full rounded-xl"><Plus /> Aggiungi alla rosa</Button>
          </form>
        </section>

        <section className="overflow-hidden rounded-[24px] border bg-card shadow-[0_16px_50px_rgba(8,15,13,.045)]">
          <div className="flex items-center justify-between border-b px-5 py-4"><div><h3 className="font-semibold">Rosa acquistata</h3><p className="text-xs text-muted-foreground">Modifica il prezzo o rimuovi un acquisto errato.</p></div><Badge variant="outline">{purchases.length} giocatori</Badge></div>
          {purchases.length === 0 ? (
            <div className="grid min-h-[300px] place-items-center p-8 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted"><Users className="size-5 text-muted-foreground" /></span><p className="mt-3 text-sm font-semibold">La rosa è ancora vuota</p><p className="mt-1 text-xs text-muted-foreground">Il primo acquisto apparirà qui.</p></div></div>
          ) : (
            <div className="divide-y">
              {purchases.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <ClubLogo code={item.player_team} />
                  <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-[10px] font-black ${roleMeta[item.player_role as Role]?.color ?? 'bg-muted'}`}>{item.player_role}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.player_name}</p><p className="text-[10px] text-muted-foreground">{teamByCode[item.player_team]?.name}</p></div>
                  <div className="relative w-20"><Input aria-label={`Prezzo di ${item.player_name}`} type="number" min={1} defaultValue={item.price} onBlur={(event) => void updatePrice(item.id, Number(event.target.value) || item.price)} className="h-9 pr-7 text-right text-xs font-semibold tabular-nums" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">cr</span></div>
                  <Button variant="ghost" size="icon-sm" aria-label={`Rimuovi ${item.player_name}`} onClick={() => void removePurchase(item.id)} className="text-muted-foreground hover:text-red-600"><Trash2 /></Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[18px] border bg-card px-4 py-3 text-[10px] text-muted-foreground">
        <ShieldCheck className="size-4 text-emerald-600" /> Dati salvati su Supabase e visibili solo dal tuo account.
        {remaining < 0 && <span className="ml-auto inline-flex items-center gap-1 text-red-600"><TrendingDown className="size-3.5" /> Budget superato</span>}
      </div>
    </div>
  );
}
