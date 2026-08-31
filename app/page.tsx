'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowDownUp,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  ExternalLink,
  Flag,
  Gavel,
  Goal,
  Info,
  LayoutList,
  Search,
  Shield,
  Star,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';

import playersData from '@/data/players.json';
import { dataSources, teamByCode, teams } from '@/data/teams';
import {
  alternativesFor,
  getSetPieceTags,
  limitCredits,
  normalize,
  roleColor,
  roleKeys,
  roleMeta,
  targetCredits,
  targetPercentage,
  type Player,
  type Role,
} from '@/lib/fanta';
import { BidPad } from '@/components/bid-pad';
import { Eyebrow, RoleDot, SetPieceBadge, TeamMark } from '@/components/fanta-bits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const AuctionDashboard = dynamic(
  () => import('@/components/auction-dashboard').then((module) => module.AuctionDashboard),
  {
    loading: () => (
      <div className="num grid min-h-[360px] place-items-center text-xs tracking-widest text-foreground/30 uppercase">
        Carico la dashboard…
      </div>
    ),
  },
);

type View = 'players' | 'teams' | 'setpieces' | 'auction';

const views: { value: View; label: string; icon: typeof LayoutList }[] = [
  { value: 'players', label: 'Listone', icon: LayoutList },
  { value: 'teams', label: 'Squadre', icon: Shield },
  { value: 'setpieces', label: 'Piazzati', icon: Target },
];

const sortLabels: Record<string, string> = {
  fvm: 'Ordina per FVM',
  quote: 'Ordina per quotazione',
  fantasyAverage: 'Ordina per fantamedia',
  appearances: 'Ordina per presenze',
  name: 'Ordina per nome',
};

const heroCopy: Record<View, { title: string; lead: string }> = {
  players: { title: 'Chi\nprendere', lead: '' },
  teams: { title: 'Squadra\nper squadra', lead: 'Rose complete, distribuzione dei ruoli e gerarchie sui piazzati.' },
  setpieces: { title: 'Chi\ncalcia', lead: 'Rigori, punizioni e corner delle 20 squadre, in ordine di gerarchia.' },
  auction: { title: 'La mia\nasta', lead: 'Registra ogni acquisto e tieni sotto controllo crediti, slot e spesa per reparto.' },
};

export default function Home() {
  const [view, setView] = useState<View>('players');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<Role | 'ALL'>('ALL');
  const [teamCode, setTeamCode] = useState('ALL');
  const [sort, setSort] = useState('fvm');
  const [budget, setBudget] = useState(500);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(120);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [biddingOn, setBiddingOn] = useState<Player | null>(null);
  const [pendingPurchase, setPendingPurchase] = useState<{ player: Player; price: number } | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('fantaboard-favorites');
    if (stored) queueMicrotask(() => setFavorites(JSON.parse(stored)));
  }, []);

  function toggleFavorite(id: number) {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      window.localStorage.setItem('fantaboard-favorites', JSON.stringify(next));
      return next;
    });
  }

  const filtered = useMemo(() => {
    const needle = normalize(query);
    const result = playersData.players.filter((player) => {
      if (role !== 'ALL' && player.role !== role) return false;
      if (teamCode !== 'ALL' && player.team !== teamCode) return false;
      if (favoritesOnly && !favorites.includes(player.id)) return false;
      if (!needle) return true;
      const teamName = teamByCode[player.team]?.name ?? player.team;
      return normalize(`${player.name} ${player.team} ${teamName}`).includes(needle);
    });
    return result.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'it');
      if (sort === 'quote') return b.quote - a.quote;
      if (sort === 'fantasyAverage') return b.fantasyAverage - a.fantasyAverage;
      if (sort === 'appearances') return b.appearances - a.appearances;
      return b.fvm - a.fvm;
    });
  }, [query, role, teamCode, sort, favoritesOnly, favorites]);

  const rosterByTeam = useMemo(
    () =>
      Object.fromEntries(
        teams.map((team) => [team.code, playersData.players.filter((player) => player.team === team.code)]),
      ) as Record<string, Player[]>,
    [],
  );

  const selectedAlternatives = useMemo(
    () => (selectedPlayer ? alternativesFor(selectedPlayer) : []),
    [selectedPlayer],
  );

  function focusTeam(code: string) {
    setTeamCode(code);
    setView('players');
    setVisibleCount(120);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* Dalla scheda al tastierino: la scheda si chiude, resta solo il rilancio. */
  function openBidPad(player: Player) {
    setSelectedPlayer(null);
    setBiddingOn(player);
  }

  /* "PRESO" porta l'acquisto nella dashboard con prezzo già compilato. */
  function registerPurchase(player: Player, price: number) {
    setPendingPurchase({ player, price });
    setBiddingOn(null);
    setView('auction');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const topSignals = playersData.players.slice(0, 5);
  const hero = heroCopy[view];
  const hasFilters = teamCode !== 'ALL' || favoritesOnly || role !== 'ALL' || Boolean(query);

  return (
    <main className="min-h-screen bg-background pb-[var(--dock-height)] text-foreground md:pb-0">
      <header className="sticky top-0 z-40 border-b border-white/6 bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex h-15 max-w-[1500px] items-center gap-4 px-4 sm:px-6">
          <button
            className="flex items-center gap-2.5"
            onClick={() => setView('players')}
            aria-label="Torna al listone"
          >
            <span className="font-display grid size-8 place-items-center rounded-[10px] bg-primary text-[15px] font-black text-primary-foreground">
              F
            </span>
            <Eyebrow className="hidden text-foreground/40 sm:block">Listone 26/27</Eyebrow>
          </button>

          <nav className="hidden flex-1 items-center justify-center md:flex" aria-label="Sezioni principali">
            <div className="flex items-center gap-1 rounded-full border border-white/7 bg-white/4 p-1">
              {[...views, { value: 'auction' as const, label: 'La mia asta', icon: Gavel }].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setView(item.value)}
                  aria-current={view === item.value ? 'page' : undefined}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                    view === item.value
                      ? item.value === 'auction'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-foreground text-background'
                      : 'text-foreground/45 hover:text-foreground/80'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setBudgetOpen(true)}
              className="flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 py-1.5 pr-3 pl-2.5 transition hover:bg-primary/15"
              aria-label="Imposta il budget della lega"
            >
              <span className="live-dot size-1.5 rounded-full bg-primary" />
              <span className="num text-xs font-extrabold text-primary">{budget} cr</span>
            </button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                setFavoritesOnly((value) => !value);
                setView('players');
              }}
              className={`rounded-full ${
                favoritesOnly
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                  : 'bg-white/6 hover:bg-white/10'
              }`}
            >
              {favoritesOnly ? <BookmarkCheck /> : <Bookmark />}
              <span className="hidden sm:inline">Shortlist</span>
              {favorites.length > 0 && <span className="num tabular-nums">{favorites.length}</span>}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 sm:px-6">
        {/* Titolone: una sola frase per schermata, come nel mockup. */}
        <div className="flex flex-wrap items-end justify-between gap-4 pt-6 pb-5 sm:pt-8">
          <div>
            <h1 className="font-display text-[40px] leading-[.95] font-extrabold whitespace-pre-line sm:text-[56px]">
              {hero.title}
            </h1>
            <p className="mt-2.5 max-w-md text-[13px] leading-snug text-pretty text-foreground/42 sm:text-sm">
              {view === 'players'
                ? `${playersData.players.length} giocatori · target calcolato sul tuo budget da ${budget} crediti`
                : hero.lead}
            </p>
          </div>
          {view === 'players' && (
            <div className="hidden gap-2 sm:flex">
              {roleKeys.map((key) => {
                const count = playersData.players.filter((player) => player.role === key).length;
                return (
                  <div
                    key={key}
                    className="min-w-[86px] rounded-2xl border border-white/6 bg-card px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <RoleDot role={key} />
                      <p className="num text-[9px] font-bold tracking-[.12em] text-foreground/35 uppercase">
                        {roleMeta[key].short}
                      </p>
                    </div>
                    <p className="num mt-1.5 text-lg font-extrabold tabular-nums">{count}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={`grid gap-6 pb-10 ${view === 'auction' ? '' : 'xl:grid-cols-[minmax(0,1fr)_310px]'}`}>
          <section className="min-w-0">
            {view === 'players' && (
              <>
                <div className="relative">
                  <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-foreground/40" />
                  <Input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setVisibleCount(120);
                    }}
                    placeholder="Cerca giocatore o squadra…"
                    className="h-12 rounded-2xl border-white/7 bg-secondary pl-11 text-[15px] placeholder:text-foreground/35"
                  />
                  {query && (
                    <button
                      className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-white/8 text-foreground/50 hover:text-foreground"
                      onClick={() => setQuery('')}
                      aria-label="Azzera la ricerca"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                <div className="no-scrollbar -mx-4 mt-3.5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                  <button
                    onClick={() => setRole('ALL')}
                    className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-extrabold tracking-wide transition ${
                      role === 'ALL'
                        ? 'bg-foreground text-background'
                        : 'border border-white/7 bg-white/5 text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    TUTTI
                  </button>
                  {roleKeys.map((key) => (
                    <button
                      key={key}
                      onClick={() => setRole(key)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-extrabold tracking-wide transition ${
                        role === key
                          ? 'bg-foreground text-background'
                          : 'border border-white/7 bg-white/5 text-foreground/60 hover:text-foreground'
                      }`}
                    >
                      <RoleDot role={key} />
                      {roleMeta[key].short}
                    </button>
                  ))}
                  <div className="shrink-0 sm:hidden">
                    <Select
                      value={teamCode}
                      onValueChange={(value) => {
                        setTeamCode(value ?? 'ALL');
                        setVisibleCount(120);
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-full border-white/7 bg-white/5 text-xs font-bold">
                        <SelectValue>{teamCode === 'ALL' ? 'SQUADRA' : teamCode}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tutte le squadre</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.code} value={team.code}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="hidden items-center gap-2 sm:flex">
                    <Select
                      value={teamCode}
                      onValueChange={(value) => {
                        setTeamCode(value ?? 'ALL');
                        setVisibleCount(120);
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-xl border-white/7 bg-card text-xs">
                        <SelectValue>
                          {teamCode === 'ALL' ? 'Tutte le squadre' : teamByCode[teamCode]?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tutte le squadre</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.code} value={team.code}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasFilters && (
                      <Button
                        variant="ghost"
                        size="lg"
                        className="rounded-xl text-foreground/50"
                        onClick={() => {
                          setQuery('');
                          setRole('ALL');
                          setTeamCode('ALL');
                          setFavoritesOnly(false);
                        }}
                      >
                        Azzera
                      </Button>
                    )}
                  </div>
                  <Select value={sort} onValueChange={(value) => setSort(value ?? 'fvm')}>
                    <SelectTrigger className="h-9 rounded-xl border-white/7 bg-card text-xs">
                      <ArrowDownUp className="size-3.5" />
                      <SelectValue>{sortLabels[sort] ?? sortLabels.fvm}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(sortLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-5 mb-2.5 flex items-center justify-between">
                  <Eyebrow>
                    {sort === 'fvm' ? 'FVM ↓' : 'Ordinato'} · target in crediti
                  </Eyebrow>
                  <Eyebrow>
                    {favoritesOnly ? `Shortlist ${filtered.length}` : `${filtered.length} risultati`}
                  </Eyebrow>
                </div>

                {filtered.length ? (
                  <div className="flex flex-col gap-1.5">
                    {filtered.slice(0, visibleCount).map((player) => {
                      const playerTeam = teamByCode[player.team];
                      const tags = getSetPieceTags(player);
                      const isFavorite = favorites.includes(player.id);
                      return (
                        <div
                          key={player.id}
                          className="group flex items-center gap-3 rounded-[18px] border border-white/5 bg-card p-2.5 transition hover:border-white/12 hover:bg-secondary"
                        >
                          <span
                            className="h-9.5 w-[3px] shrink-0 rounded-full"
                            style={{ background: roleColor(player.role) }}
                          />
                          <button
                            onClick={() => setSelectedPlayer(player)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <TeamMark team={playerTeam} size="sm" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[15.5px] font-bold tracking-[-.01em]">
                                {player.name}
                              </span>
                              <span className="num block truncate text-[10.5px] text-foreground/38">
                                {playerTeam?.name ?? player.team} · QA {player.quote} · FVM {player.fvm}
                              </span>
                            </span>

                            <span className="hidden w-32 shrink-0 gap-1 lg:flex">
                              {tags.slice(0, 1).map((tag) => (
                                <SetPieceBadge key={`${tag.type}-${tag.rank}`} type={tag.type}>
                                  {tag.label}
                                </SetPieceBadge>
                              ))}
                            </span>
                            <span className="num hidden w-20 shrink-0 text-right text-[11px] text-foreground/38 md:block">
                              {player.average ? player.average.toFixed(2) : '—'} /{' '}
                              {player.fantasyAverage ? player.fantasyAverage.toFixed(2) : '—'}
                            </span>

                            <span className="shrink-0 text-right">
                              <span className="num block text-[19px] leading-none font-extrabold tracking-[-.03em] tabular-nums text-primary">
                                {targetCredits(player, budget)}
                              </span>
                              <span className="num mt-1 block text-[9.5px] text-foreground/30">
                                {targetPercentage(player).toFixed(1)}%
                              </span>
                            </span>
                          </button>
                          <button
                            aria-label={
                              isFavorite
                                ? `Rimuovi ${player.name} dalla shortlist`
                                : `Aggiungi ${player.name} alla shortlist`
                            }
                            onClick={() => toggleFavorite(player.id)}
                            className={`grid size-8 shrink-0 place-items-center rounded-full transition ${
                              isFavorite ? 'text-warn' : 'text-foreground/20 hover:text-foreground/60'
                            }`}
                          >
                            <Star className={`size-4 ${isFavorite ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid min-h-64 place-items-center rounded-[24px] border border-white/6 bg-card px-6 text-center">
                    <div>
                      <Search className="mx-auto mb-3 size-8 text-foreground/25" />
                      <h3 className="font-bold">Nessun giocatore trovato</h3>
                      <p className="mt-1 text-sm text-foreground/45">Prova a cambiare nome, ruolo o squadra.</p>
                      <Button
                        className="mt-4 rounded-xl"
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          setQuery('');
                          setRole('ALL');
                          setTeamCode('ALL');
                          setFavoritesOnly(false);
                        }}
                      >
                        Azzera filtri
                      </Button>
                    </div>
                  </div>
                )}

                {visibleCount < filtered.length && (
                  <div className="pt-4 text-center">
                    <Button
                      variant="outline"
                      size="lg"
                      className="rounded-full"
                      onClick={() => setVisibleCount((count) => count + 120)}
                    >
                      Mostra altri 120 <ChevronRight />
                    </Button>
                  </div>
                )}
              </>
            )}

            {view === 'teams' && (
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {teams.map((team) => {
                  const roster = rosterByTeam[team.code] ?? [];
                  const top = [...roster].sort((a, b) => b.fvm - a.fvm).slice(0, 3);
                  return (
                    <button
                      key={team.code}
                      aria-label={`Apri il dossier ${team.name}`}
                      onClick={() => focusTeam(team.code)}
                      className="group overflow-hidden rounded-[24px] border border-white/6 bg-card text-left transition hover:-translate-y-0.5 hover:border-white/14"
                    >
                      <div
                        className="h-1"
                        style={{ background: `linear-gradient(90deg, ${team.primary} 0 68%, ${team.secondary} 68%)` }}
                      />
                      <div className="p-4">
                        <div className="flex items-center gap-3">
                          <TeamMark team={team} size="lg" />
                          <div className="min-w-0">
                            <h3 className="font-display truncate text-xl font-extrabold">{team.name}</h3>
                            <p className="num mt-1 text-[10px] text-foreground/35">
                              {roster.length} giocatori nel listone
                            </p>
                          </div>
                          <ArrowRight className="ml-auto size-4 shrink-0 text-foreground/30 transition group-hover:translate-x-1 group-hover:text-primary" />
                        </div>

                        <div className="my-4 grid grid-cols-4 gap-1.5">
                          {roleKeys.map((key) => (
                            <div key={key} className="rounded-xl border border-white/5 bg-secondary px-2 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <RoleDot role={key} />
                                <p className="num text-[9px] font-bold text-foreground/40">{key}</p>
                              </div>
                              <p className="num mt-1 text-sm font-extrabold tabular-nums">
                                {roster.filter((player) => player.role === key).length}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2 border-t border-white/6 pt-3">
                          {top.map((player, index) => (
                            <div key={player.id} className="flex items-center gap-2 text-xs">
                              <span className="num w-4 text-[10px] text-foreground/25">0{index + 1}</span>
                              <span className="min-w-0 flex-1 truncate font-semibold">{player.name}</span>
                              <span className="num tabular-nums text-primary">
                                {targetCredits(player, budget)} cr
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
                          <Target className="size-3.5 shrink-0 text-primary" />
                          <span className="text-[11px] text-foreground/40">Rigorista</span>
                          <span className="ml-auto truncate text-[11px] font-bold text-primary">
                            {team.penalties[0]}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {view === 'setpieces' && (
              <div>
                <div className="mb-5 flex items-start gap-3 rounded-[22px] border border-warn/25 bg-warn/8 p-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warn/15 text-warn">
                    <Info className="size-4.5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-warn">Gerarchie aggiornate al 29 agosto</h2>
                    <p className="mt-1 text-[12.5px] leading-snug text-pretty text-foreground/45">
                      I nomi sono ordinati per priorità. Restano indicative e possono cambiare con mercato,
                      turnover e scelte dell’allenatore.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {teams.map((team) => (
                    <article key={team.code} className="overflow-hidden rounded-[24px] border border-white/6 bg-card">
                      <div className="flex items-center gap-3 border-b border-white/6 px-4 py-3.5">
                        <TeamMark team={team} size="sm" />
                        <h3 className="font-display font-extrabold">{team.name}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto rounded-full text-foreground/45"
                          onClick={() => focusTeam(team.code)}
                        >
                          Rosa <ChevronRight />
                        </Button>
                      </div>
                      <div className="grid gap-4 p-4 sm:grid-cols-3">
                        {(
                          [
                            ['Rigori', team.penalties, Target, 'var(--primary)'],
                            ['Punizioni', team.freeKicks, Goal, 'var(--role-c)'],
                            ['Corner', team.corners, Flag, 'var(--warn)'],
                          ] as const
                        ).map(([label, names, Icon, tint]) => (
                          <div key={label}>
                            <div className="mb-2.5 flex items-center gap-2">
                              <span
                                className="grid size-6 place-items-center rounded-lg"
                                style={{ color: tint, background: `color-mix(in srgb, ${tint} 14%, transparent)` }}
                              >
                                <Icon className="size-3.5" />
                              </span>
                              <Eyebrow className="text-[9.5px]">{label}</Eyebrow>
                            </div>
                            <ol className="space-y-1.5">
                              {names.map((name, index) => (
                                <li key={name} className="flex items-baseline gap-1.5 text-xs">
                                  <span className="num text-[9px] text-foreground/25">0{index + 1}</span>
                                  <span className={index === 0 ? 'font-bold' : 'text-foreground/45'}>{name}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {view === 'auction' && (
              <AuctionDashboard
                pendingPurchase={pendingPurchase}
                onPendingPurchaseHandled={() => setPendingPurchase(null)}
              />
            )}
          </section>

          {view !== 'auction' && (
            <aside className="hidden space-y-3 xl:sticky xl:top-[76px] xl:block xl:self-start">
              <BudgetPlanner budget={budget} onBudgetChange={setBudget} />

              <div className="rounded-[24px] border border-white/6 bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <Eyebrow className="text-primary/70">Radar FVM</Eyebrow>
                    <h3 className="font-display mt-1 font-extrabold">I più caldi</h3>
                  </div>
                  <TrendingUp className="size-4.5 text-primary" />
                </div>
                <div className="space-y-0.5">
                  {topSignals.map((player, index) => (
                    <button
                      key={player.id}
                      onClick={() => setSelectedPlayer(player)}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-white/6"
                    >
                      <span className="num w-5 text-[10px] text-foreground/25">0{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold">{player.name}</span>
                      <span className="num text-[10px] tabular-nums text-primary">{player.fvm} FVM</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/6 bg-card p-4">
                <Eyebrow className="mb-3">Qualità dei dati</Eyebrow>
                <div className="space-y-2 text-[11px]">
                  {(
                    [
                      ['Listone', 'Ufficiale', 'var(--primary)'],
                      ['Statistiche', 'Ufficiali', 'var(--primary)'],
                      ['Piazzati', 'Editoriali', 'var(--warn)'],
                      ['Target asta', 'Stima', 'var(--role-c)'],
                    ] as const
                  ).map(([label, value, tint]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-foreground/40">{label}</span>
                      <span className="font-bold" style={{ color: tint }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border-t border-white/6 pt-3">
                  {dataSources.map((source) => (
                    <a
                      key={source.href}
                      href={source.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between py-1 text-[10px] text-foreground/35 transition hover:text-foreground"
                    >
                      {source.label}
                      <ExternalLink className="size-3" />
                    </a>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      <footer className="border-t border-white/6">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-2 px-4 py-6 text-[11px] text-foreground/30 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <span className="font-display grid size-5 place-items-center rounded-md bg-primary text-[10px] font-black text-primary-foreground">
              F
            </span>
            <span className="font-bold text-foreground/60">FantaBoard</span>
            <span>· Serie A 2026/27</span>
          </div>
          <p>Strumento informativo indipendente · il target d’asta è una stima.</p>
        </div>
      </footer>

      {/* Dock pollice: le tre viste di consultazione più l'asta, sempre raggiungibili. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2.5 bg-gradient-to-t from-background from-55% to-transparent px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] md:hidden"
        aria-label="Navigazione principale"
      >
        <div className="flex flex-1 justify-around rounded-[22px] border border-white/7 bg-[#101815] px-1.5 py-2.5">
          {views.map((item) => {
            const Icon = item.icon;
            const active = view === item.value;
            return (
              <button
                key={item.value}
                onClick={() => setView(item.value)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 px-3 text-[9.5px] font-bold tracking-wider uppercase transition ${
                  active ? 'text-primary' : 'text-foreground/35'
                }`}
              >
                <Icon className="size-5" strokeWidth={2} />
                {item.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setView('auction')}
          aria-current={view === 'auction' ? 'page' : undefined}
          className={`grid size-15 shrink-0 place-items-center rounded-[22px] text-[9.5px] leading-tight font-black tracking-wide transition ${
            view === 'auction'
              ? 'bg-foreground text-background'
              : 'bg-primary text-primary-foreground shadow-[0_12px_30px_-8px_rgba(0,227,160,.7)]'
          }`}
        >
          ASTA
          <br />
          LIVE
        </button>
      </nav>

      {/* Sheet budget: su mobile sostituisce l'aside del planner. */}
      <Sheet open={budgetOpen} onOpenChange={setBudgetOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto gap-0 rounded-t-[32px] border-white/8 bg-popover px-5 pt-5 pb-[max(28px,env(safe-area-inset-bottom))] sm:max-w-[440px]"
        >
          <SheetHeader className="p-0">
            <SheetTitle className="font-display text-2xl font-extrabold">Il tuo budget</SheetTitle>
            <SheetDescription className="text-[13px] text-foreground/45">
              Tutti i target del listone si ricalcolano su questo numero.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-5">
            <BudgetPlanner budget={budget} onBudgetChange={setBudget} bare />
          </div>
        </SheetContent>
      </Sheet>

      {/* Scheda giocatore */}
      <Sheet open={Boolean(selectedPlayer)} onOpenChange={(open) => !open && setSelectedPlayer(null)}>
        <SheetContent className="gap-0 overflow-y-auto border-white/8 bg-background p-0 data-[side=right]:w-full sm:data-[side=right]:max-w-[520px]">
          {selectedPlayer &&
            (() => {
              const playerTeam = teamByCode[selectedPlayer.team];
              const tags = getSetPieceTags(selectedPlayer);
              const change = selectedPlayer.quote - selectedPlayer.initialQuote;
              const target = targetCredits(selectedPlayer, budget);
              const share = targetPercentage(selectedPlayer);
              // L'anello mostra letteralmente la quota di budget, come l'etichetta al centro.
              const ringFill = Math.min(100, share).toFixed(1);
              const sameTeam = (rosterByTeam[selectedPlayer.team] ?? [])
                .filter((player) => player.role === selectedPlayer.role && player.id !== selectedPlayer.id)
                .sort((a, b) => b.quote - a.quote)
                .slice(0, 4);
              return (
                <>
                  <div
                    className="relative p-5 pb-6"
                    style={{
                      background: `radial-gradient(120% 90% at 85% -10%, ${playerTeam?.secondary}55, transparent 60%), linear-gradient(160deg, ${playerTeam?.primary}88, transparent 65%)`,
                    }}
                  >
                    <SheetHeader className="p-0 pr-10">
                      <div className="mb-4 flex items-center gap-3.5">
                        <TeamMark team={playerTeam} size="lg" />
                        <div className="min-w-0">
                          <p className="num text-[10px] font-bold tracking-[.16em] text-foreground/50 uppercase">
                            {playerTeam?.name} · {roleMeta[selectedPlayer.role as Role]?.label}
                          </p>
                          <SheetTitle className="font-display mt-1 text-[34px] leading-none font-extrabold text-foreground">
                            {selectedPlayer.name}
                          </SheetTitle>
                        </div>
                      </div>
                      <SheetDescription className="sr-only">
                        Scheda di {selectedPlayer.name}: target d’asta, statistiche e alternative.
                      </SheetDescription>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <SetPieceBadge key={`${tag.type}-${tag.rank}`} type={tag.type}>
                            {tag.label}
                          </SetPieceBadge>
                        ))}
                        <span className="rounded-full border border-white/10 bg-white/7 px-2.5 py-1 text-[11px] font-bold text-foreground/60">
                          Mantra {selectedPlayer.mantra.join(' / ') || '—'}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/7 px-2.5 py-1 text-[11px] font-bold text-foreground/60">
                          {selectedPlayer.availability}% disponibile
                        </span>
                      </div>
                    </SheetHeader>
                  </div>

                  <div className="space-y-3.5 px-5 pb-6">
                    {/* Il target è il dato per cui si apre questa scheda: sta in cima e in verde. */}
                    <div className="flex items-center gap-3 rounded-3xl bg-primary p-4 text-primary-foreground">
                      <div className="min-w-0 flex-1">
                        <p className="num text-[10px] font-extrabold tracking-[.14em] opacity-60 uppercase">
                          Target su {budget} cr
                        </p>
                        <p className="num mt-1 text-[44px] leading-none font-extrabold tracking-[-.05em] whitespace-nowrap tabular-nums">
                          {target}
                          <span className="text-[17px] tracking-normal opacity-55"> cr</span>
                        </p>
                        <p className="mt-1.5 text-[12px] font-bold opacity-65">
                          {share.toFixed(1)}% del budget · limite {limitCredits(selectedPlayer, budget)}
                        </p>
                      </div>
                      {/* Anello: quanta parte del budget si porta via questo giocatore. */}
                      <div
                        className="grid size-22 shrink-0 place-items-center rounded-full"
                        style={{
                          background: `conic-gradient(var(--primary-foreground) 0 ${ringFill}%, color-mix(in srgb, var(--primary-foreground) 16%, transparent) ${ringFill}% 100%)`,
                        }}
                      >
                        <span className="num grid size-16 place-items-center rounded-full bg-primary text-[15px] font-extrabold">
                          {share.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {(
                        [
                          ['QA', String(selectedPlayer.quote), change >= 0 ? 'var(--primary)' : 'var(--danger)'],
                          ['FVM', String(selectedPlayer.fvm), 'var(--foreground)'],
                          ['MV', selectedPlayer.average ? selectedPlayer.average.toFixed(2) : '—', 'var(--foreground)'],
                          [
                            'FM',
                            selectedPlayer.fantasyAverage ? selectedPlayer.fantasyAverage.toFixed(2) : '—',
                            'var(--primary)',
                          ],
                        ] as const
                      ).map(([label, value, tint]) => (
                        <div
                          key={label}
                          className="rounded-[14px] border border-white/5 bg-card px-1.5 py-2.5 text-center"
                        >
                          <p className="num text-[9px] font-bold tracking-[.08em] text-foreground/35 uppercase">
                            {label}
                          </p>
                          <p
                            className="num mt-1 text-[16px] font-extrabold tabular-nums"
                            style={{ color: tint }}
                          >
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-[22px] border border-white/5 bg-card p-4">
                      <div className="mb-3 flex items-baseline justify-between">
                        <p className="text-[13px] font-extrabold">Rendimento 2026/27</p>
                        <p className="num text-[11px] font-extrabold text-primary">
                          {change >= 0 ? '+' : ''}
                          {change} QA
                        </p>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(
                          [
                            ['Pres.', selectedPlayer.appearances],
                            ['Gol', selectedPlayer.goals],
                            ['Assist', selectedPlayer.assists],
                            ['Rigori', selectedPlayer.penalties],
                            ['Gialli', selectedPlayer.yellows],
                            ['Rossi', selectedPlayer.reds],
                            ['Gol sub.', selectedPlayer.goalsAgainst],
                            ['Rig. par.', selectedPlayer.penaltiesSaved],
                          ] as const
                        ).map(([label, value]) => (
                          <div key={label} className="rounded-[12px] bg-secondary px-1.5 py-2 text-center">
                            <p className="text-[9px] text-foreground/35 uppercase">{label}</p>
                            <p className="num mt-1 text-sm font-extrabold whitespace-nowrap tabular-nums">
                              {String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Eyebrow className="mb-2.5">Se te lo soffiano</Eyebrow>
                      <div className="flex flex-col gap-1.5">
                        {selectedAlternatives.map((player) => (
                          <button
                            key={player.id}
                            onClick={() => setSelectedPlayer(player)}
                            className="flex items-center gap-3 rounded-[16px] border border-white/5 bg-card p-2.5 text-left transition hover:bg-secondary"
                          >
                            <TeamMark team={teamByCode[player.team]} size="xs" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold">{player.name}</span>
                              <span className="num block text-[10px] text-foreground/35">
                                {teamByCode[player.team]?.name} · QA {player.quote}
                              </span>
                            </span>
                            <span className="num text-[15px] font-extrabold tabular-nums text-primary">
                              {targetCredits(player, budget)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {sameTeam.length > 0 && (
                      <div>
                        <Eyebrow className="mb-2.5">Concorrenza in rosa</Eyebrow>
                        <div className="flex flex-wrap gap-1.5">
                          {sameTeam.map((player) => (
                            <button
                              key={player.id}
                              onClick={() => setSelectedPlayer(player)}
                              className="num rounded-full border border-white/7 bg-card px-2.5 py-1.5 text-[10px] text-foreground/60 transition hover:bg-secondary hover:text-foreground"
                            >
                              {player.name} · QA {player.quote}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="rounded-[16px] bg-secondary p-3 text-[10.5px] leading-relaxed text-foreground/40">
                      <strong className="font-bold text-foreground/70">Come leggere il target:</strong> stima
                      comparativa calibrata su ruolo e FVM, pensata per confrontare profili sul tuo budget.
                      Adattala a numero di partecipanti, modificatore e dinamica della tua asta.
                    </p>
                  </div>

                  {/* Barra azioni fissa: si punta da qui. */}
                  <div className="sticky bottom-0 flex gap-2.5 border-t border-white/7 bg-background/95 px-5 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))] backdrop-blur-xl">
                    <button
                      onClick={() => openBidPad(selectedPlayer)}
                      className="h-13 flex-1 rounded-[18px] bg-foreground text-[14px] font-extrabold text-background transition hover:bg-foreground/90 active:translate-y-px"
                    >
                      Punta in asta
                    </button>
                    <button
                      onClick={() => toggleFavorite(selectedPlayer.id)}
                      aria-label={
                        favorites.includes(selectedPlayer.id)
                          ? 'Rimuovi dalla shortlist'
                          : 'Aggiungi alla shortlist'
                      }
                      className={`grid size-13 shrink-0 place-items-center rounded-[18px] border transition ${
                        favorites.includes(selectedPlayer.id)
                          ? 'border-warn/30 bg-warn/15 text-warn'
                          : 'border-white/10 bg-white/6 text-foreground/60 hover:text-foreground'
                      }`}
                    >
                      <Bookmark
                        className={`size-4.5 ${favorites.includes(selectedPlayer.id) ? 'fill-current' : ''}`}
                      />
                    </button>
                    <a
                      href={selectedPlayer.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Apri la scheda ufficiale"
                      className="grid size-13 shrink-0 place-items-center rounded-[18px] border border-white/10 bg-white/6 text-foreground/60 transition hover:text-foreground"
                    >
                      <ExternalLink className="size-4.5" />
                    </a>
                  </div>
                </>
              );
            })()}
        </SheetContent>
      </Sheet>

      <BidPad
        // Rimontare a ogni giocatore riparte dalla sua quotazione senza effetti.
        key={biddingOn?.id}
        player={biddingOn}
        budget={budget}
        fallbackName={biddingOn ? alternativesFor(biddingOn, 1)[0]?.name : undefined}
        onOpenChange={(open) => !open && setBiddingOn(null)}
        onTaken={registerPurchase}
        onLost={() => {
          const next = biddingOn ? alternativesFor(biddingOn, 1)[0] : null;
          setBiddingOn(null);
          if (next) setSelectedPlayer(next);
        }}
      />
    </main>
  );
}

/** Ripartizione del budget per reparto, condivisa fra aside desktop e sheet mobile. */
function BudgetPlanner({
  budget,
  onBudgetChange,
  bare = false,
}: {
  budget: number;
  onBudgetChange: (value: number) => void;
  bare?: boolean;
}) {
  const body = (
    <>
      <label className="num text-[10px] font-bold tracking-[.12em] text-foreground/35 uppercase" htmlFor="budget">
        Crediti iniziali
      </label>
      <div className="relative mt-2">
        <Input
          id="budget"
          type="number"
          min={100}
          max={5000}
          value={budget}
          onChange={(event) => onBudgetChange(Math.max(100, Math.min(5000, Number(event.target.value) || 500)))}
          className="num h-13 rounded-2xl border-white/7 bg-secondary pr-10 text-2xl font-extrabold tabular-nums"
        />
        <span className="num absolute top-1/2 right-4 -translate-y-1/2 text-xs text-foreground/35">cr</span>
      </div>
      <div className="mt-4 space-y-3">
        {roleKeys.map((key) => {
          const meta = roleMeta[key];
          return (
            <div key={key}>
              <div className="mb-1.5 flex items-center gap-2">
                <RoleDot role={key} />
                <span className="flex-1 text-[12.5px] font-bold text-foreground/75">{meta.label}</span>
                <span className="num text-[12px] font-extrabold tabular-nums">
                  {Math.round((meta.budgetShare / 100) * budget)} cr
                </span>
                <span className="num text-[11px] text-foreground/35">{meta.budgetShare}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/7">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${meta.budgetShare}%`, background: meta.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 border-t border-white/6 pt-3 text-[10px] leading-relaxed text-foreground/30">
        Ripartizione mediana misurata su aste 2026/27: 7% P, 19% D, 32% C, 42% A.
      </p>
    </>
  );

  if (bare) return <div>{body}</div>;

  return (
    <div className="rounded-[24px] border border-white/6 bg-card p-4">
      <div className="mb-4">
        <Eyebrow>Budget planner</Eyebrow>
        <h3 className="font-display mt-1 font-extrabold">La tua lega</h3>
      </div>
      {body}
    </div>
  );
}
