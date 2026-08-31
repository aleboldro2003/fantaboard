'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  ArrowDownUp,
  ArrowRight,
  BarChart3,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  Flag,
  Gavel,
  Goal,
  Info,
  Search,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

import playersData from '@/data/players.json';
import { dataSources, teamByCode, teams, type TeamInfo } from '@/data/teams';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AuctionDashboard = dynamic(
  () => import('@/components/auction-dashboard').then((module) => module.AuctionDashboard),
  { loading: () => <div className="grid min-h-[360px] place-items-center text-sm text-muted-foreground">Carico la dashboard…</div> },
);

const roleMeta = {
  P: { label: 'Portieri', short: 'POR', color: 'bg-amber-300 text-amber-950' },
  D: { label: 'Difensori', short: 'DIF', color: 'bg-emerald-300 text-emerald-950' },
  C: { label: 'Centrocampisti', short: 'CEN', color: 'bg-sky-300 text-sky-950' },
  A: { label: 'Attaccanti', short: 'ATT', color: 'bg-fuchsia-300 text-fuchsia-950' },
} as const;

type Role = keyof typeof roleMeta;
type View = 'players' | 'teams' | 'setpieces' | 'auction';
type Player = (typeof playersData.players)[number];

const roleCeilings: Record<string, number> = { P: 6.5, D: 8, C: 13, A: 20 };
const roleFvmMax: Record<string, number> = { P: 68, D: 253, C: 266, A: 414 };

function targetPercentage(player: Player) {
  return Math.max(
    0.2,
    roleCeilings[player.role] * (player.fvm / roleFvmMax[player.role]) ** 0.82,
  );
}

function targetCredits(player: Player, budget: number) {
  return Math.max(1, Math.round((targetPercentage(player) / 100) * budget));
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function playerMatches(playerName: string, listedName: string) {
  const playerTokens = normalize(playerName).split(' ').filter((token) => token.length >= 3);
  const listed = normalize(listedName);
  return playerTokens.some((token) => listed.includes(token));
}

function getSetPieceTags(player: Player) {
  const team = teamByCode[player.team];
  if (!team) return [];
  const tags: { label: string; rank: number; type: 'penalty' | 'freeKick' | 'corner' }[] = [];
  const penaltyRank = team.penalties.findIndex((name) => playerMatches(player.name, name));
  const freeKickRank = team.freeKicks.findIndex((name) => playerMatches(player.name, name));
  const cornerRank = team.corners.findIndex((name) => playerMatches(player.name, name));
  if (penaltyRank >= 0) tags.push({ label: penaltyRank === 0 ? '1° rigorista' : `${penaltyRank + 1}° rigorista`, rank: penaltyRank, type: 'penalty' });
  if (freeKickRank >= 0) tags.push({ label: freeKickRank === 0 ? 'Punizioni' : 'Alt. punizioni', rank: freeKickRank, type: 'freeKick' });
  if (cornerRank >= 0) tags.push({ label: cornerRank === 0 ? 'Corner' : 'Alt. corner', rank: cornerRank, type: 'corner' });
  return tags;
}

function TeamMark({ team, size = 'md' }: { team?: TeamInfo; size?: 'sm' | 'md' | 'lg' }) {
  const dimension = size === 'sm' ? 'size-8 rounded-[10px] p-1' : size === 'lg' ? 'size-14 rounded-2xl p-2' : 'size-10 rounded-xl p-1.5';
  return (
    <div className={`grid shrink-0 place-items-center bg-muted/55 ${dimension}`}>
      {team ? (
        <Image src={`/logos/${team.code}.svg`} alt={`Logo ${team.name}`} width={56} height={56} unoptimized className="size-full object-contain" />
      ) : (
        <span className="text-[10px] text-muted-foreground">—</span>
      )}
    </div>
  );
}

function RoleBadge({ role, compact = false }: { role: string; compact?: boolean }) {
  const meta = roleMeta[role as Role];
  return (
    <span className={`inline-grid ${compact ? 'size-6' : 'size-8'} place-items-center rounded-lg text-[11px] font-black ${meta?.color ?? 'bg-muted'}`}>
      {role}
    </span>
  );
}

function SetPieceBadge({ type, children }: { type: string; children: React.ReactNode }) {
  const styles =
    type === 'penalty'
      ? 'border-lime-300/40 bg-lime-300/15 text-lime-800'
      : type === 'freeKick'
        ? 'border-sky-300/50 bg-sky-200/30 text-sky-800'
        : 'border-amber-300/50 bg-amber-200/35 text-amber-800';
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles}`}>{children}</span>;
}

export default function Home() {
  const [view, setView] = useState<View>('players');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<Role | 'ALL'>('ALL');
  const [teamCode, setTeamCode] = useState('ALL');
  const [sort, setSort] = useState('fvm');
  const [budget, setBudget] = useState(500);
  const [visibleCount, setVisibleCount] = useState(120);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
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

  const selectedAlternatives = useMemo(() => {
    if (!selectedPlayer) return [];
    const target = targetPercentage(selectedPlayer);
    return playersData.players
      .filter((player) => player.role === selectedPlayer.role && player.id !== selectedPlayer.id)
      .sort((a, b) => Math.abs(targetPercentage(a) - target) - Math.abs(targetPercentage(b) - target))
      .slice(0, 4);
  }, [selectedPlayer]);

  function focusTeam(code: string) {
    setTeamCode(code);
    setView('players');
    setVisibleCount(120);
    window.scrollTo({ top: 255, behavior: 'smooth' });
  }

  const topSignals = playersData.players.slice(0, 5);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b1210]/94 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-5 px-4 sm:px-6">
          <button className="flex items-center gap-3" onClick={() => setView('players')} aria-label="Torna al listone">
            <div className="grid size-9 place-items-center rounded-[12px] bg-lime-300 text-[#0b1210] shadow-[0_0_28px_rgba(190,242,100,.22)]">
              <Zap className="size-[18px] fill-current" />
            </div>
            <div className="text-left">
              <p className="text-[9px] font-bold uppercase tracking-[.18em] text-lime-300">Asta 26/27</p>
              <p className="text-[15px] font-semibold tracking-tight">FantaBoard</p>
            </div>
          </button>

          <nav className="hidden flex-1 items-center justify-center md:flex" aria-label="Sezioni principali">
            <Tabs value={view} onValueChange={(value) => setView(value as View)}>
              <TabsList className="h-9 rounded-full bg-white/[.07] p-1 text-white/55">
                <TabsTrigger value="players" className="rounded-full px-4 text-xs text-white/55 data-active:bg-white data-active:text-[#0b1210]">Listone</TabsTrigger>
                <TabsTrigger value="teams" className="rounded-full px-4 text-xs text-white/55 data-active:bg-white data-active:text-[#0b1210]">Squadre</TabsTrigger>
                <TabsTrigger value="setpieces" className="rounded-full px-4 text-xs text-white/55 data-active:bg-white data-active:text-[#0b1210]">Piazzati</TabsTrigger>
                <TabsTrigger value="auction" className="rounded-full px-4 text-xs text-white/55 data-active:bg-lime-300 data-active:text-[#0b1210]">La mia asta</TabsTrigger>
              </TabsList>
            </Tabs>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 pr-2 text-[11px] text-white/45 lg:flex">
              <span className="size-1.5 rounded-full bg-lime-300 shadow-[0_0_10px_#bef264]" />
              Aggiornato 31 agosto
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFavoritesOnly((value) => !value); setView('players'); }}
              className={`rounded-full text-white hover:bg-white/10 hover:text-white ${favoritesOnly ? 'bg-lime-300 text-[#0b1210] hover:bg-lime-200 hover:text-[#0b1210]' : 'bg-white/[.07]'}`}
            >
              {favoritesOnly ? <BookmarkCheck /> : <Bookmark />} <span className="hidden sm:inline">Preferiti</span> {favorites.length > 0 && <span className="tabular-nums">{favorites.length}</span>}
            </Button>
            <Button size="sm" onClick={() => setView('auction')} className="hidden rounded-full bg-lime-300 text-[#0b1210] hover:bg-lime-200 sm:inline-flex">
              <Gavel /> Asta live
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b bg-[#0b1210] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[.12] [background-image:linear-gradient(rgba(190,242,100,.25)_1px,transparent_1px),linear-gradient(90deg,rgba(190,242,100,.25)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_right,black,transparent_75%)]" />
        <div className="relative mx-auto grid max-w-[1500px] gap-6 px-4 py-7 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="border-lime-300/20 bg-lime-300/10 text-lime-300">SERIE A · CLASSIC + MANTRA</Badge>
              <span className="text-xs text-white/35">Listone, statistiche e gerarchie in un’unica schermata</span>
            </div>
            <h1 className="max-w-4xl text-balance text-[34px] font-semibold leading-[1.03] tracking-[-.045em] sm:text-5xl">
              L’asta si vince <span className="text-white/34">prima del rilancio.</span>
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['Giocatori', playersData.players.length, Users],
              ['Squadre', teams.length, Shield],
              ['Budget', `${budget} cr`, CircleDollarSign],
            ].map(([label, value, Icon]) => {
              const MetricIcon = Icon as typeof Users;
              return (
                <div key={String(label)} className="min-w-[98px] rounded-2xl border border-white/10 bg-white/[.055] px-3.5 py-3 backdrop-blur-sm sm:min-w-[118px] sm:px-4">
                  <div className="mb-2 flex items-center justify-between text-white/35">
                    <p className="text-[9px] uppercase tracking-[.12em]">{String(label)}</p>
                    <MetricIcon className="size-3.5" />
                  </div>
                  <p className="text-lg font-semibold tabular-nums">{String(value)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
        <div className="mb-4 md:hidden">
          <Tabs value={view} onValueChange={(value) => setView(value as View)}>
            <TabsList className="grid h-10 w-full grid-cols-4 bg-muted">
              <TabsTrigger value="players">Listone</TabsTrigger>
              <TabsTrigger value="teams">Squadre</TabsTrigger>
              <TabsTrigger value="setpieces">Piazzati</TabsTrigger>
              <TabsTrigger value="auction">Asta</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className={`grid gap-5 ${view === 'auction' ? '' : 'xl:grid-cols-[minmax(0,1fr)_300px]'}`}>
          <section className="min-w-0">
            {view === 'players' && (
              <>
                <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-center">
                  <div className="relative w-full max-w-xl">
                    <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(event) => { setQuery(event.target.value); setVisibleCount(120); }}
                      placeholder="Cerca giocatore o squadra…"
                      className="h-11 rounded-xl border-border bg-card pl-10 text-[15px] shadow-sm"
                    />
                    {query && (
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setQuery('')}>Azzera</button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:justify-end lg:pb-0">
                    <Button variant={role === 'ALL' ? 'default' : 'outline'} onClick={() => setRole('ALL')} className="rounded-full">Tutti</Button>
                    {(Object.keys(roleMeta) as Role[]).map((key) => (
                      <Button key={key} variant={role === key ? 'default' : 'outline'} onClick={() => setRole(key)} className="rounded-full">
                        <RoleBadge role={key} compact />
                        <span className="hidden sm:inline">{roleMeta[key].short}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Select value={teamCode} onValueChange={(value) => { setTeamCode(value ?? 'ALL'); setVisibleCount(120); }}>
                      <SelectTrigger className="h-9 rounded-xl bg-card"><SelectValue>{teamCode === 'ALL' ? 'Tutte le squadre' : teamByCode[teamCode]?.name}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tutte le squadre</SelectItem>
                        {teams.map((team) => <SelectItem key={team.code} value={team.code}>{team.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {(teamCode !== 'ALL' || favoritesOnly) && (
                      <Button variant="ghost" size="sm" onClick={() => { setTeamCode('ALL'); setFavoritesOnly(false); }}>Rimuovi filtri</Button>
                    )}
                  </div>
                  <Select value={sort} onValueChange={(value) => setSort(value ?? 'fvm')}>
                    <SelectTrigger className="h-9 rounded-xl bg-card"><ArrowDownUp className="size-3.5" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fvm">Ordina per FVM</SelectItem>
                      <SelectItem value="quote">Ordina per quotazione</SelectItem>
                      <SelectItem value="fantasyAverage">Ordina per fantamedia</SelectItem>
                      <SelectItem value="appearances">Ordina per presenze</SelectItem>
                      <SelectItem value="name">Ordina per nome</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-hidden rounded-[22px] border bg-card shadow-[0_16px_50px_rgba(8,15,13,.055)]">
                  <div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
                    <div>
                      <h2 className="font-semibold tracking-tight">{favoritesOnly ? 'La tua shortlist' : 'Listone ufficiale'}</h2>
                      <p className="text-xs text-muted-foreground">Clicca un giocatore per dati completi, piazzati e alternative.</p>
                    </div>
                    <Badge variant="outline">{filtered.length} risultati</Badge>
                  </div>

                  {filtered.length ? (
                    <Table>
                      <TableHeader className="bg-muted/55">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-10 pl-4"><span className="sr-only">Preferito</span></TableHead>
                          <TableHead>Calciatore</TableHead>
                          <TableHead>Ruolo</TableHead>
                          <TableHead className="hidden text-right sm:table-cell">QA</TableHead>
                          <TableHead className="hidden text-right lg:table-cell">FVM</TableHead>
                          <TableHead className="hidden text-right md:table-cell">MV / FM</TableHead>
                          <TableHead className="hidden xl:table-cell">Plus</TableHead>
                          <TableHead className="pr-5 text-right">Target</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.slice(0, visibleCount).map((player) => {
                          const playerTeam = teamByCode[player.team];
                          const tags = getSetPieceTags(player);
                          return (
                            <TableRow key={player.id} className="group cursor-pointer" onClick={() => setSelectedPlayer(player)}>
                              <TableCell className="pl-4 pr-0">
                                <button
                                  aria-label={favorites.includes(player.id) ? `Rimuovi ${player.name} dai preferiti` : `Aggiungi ${player.name} ai preferiti`}
                                  onClick={(event) => { event.stopPropagation(); toggleFavorite(player.id); }}
                                  className={`grid size-7 place-items-center rounded-full transition-colors hover:bg-amber-100 ${favorites.includes(player.id) ? 'text-amber-500' : 'text-muted-foreground/45'}`}
                                >
                                  <Star className={`size-4 ${favorites.includes(player.id) ? 'fill-current' : ''}`} />
                                </button>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <TeamMark team={playerTeam} />
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold tracking-tight group-hover:underline group-hover:underline-offset-4">{player.name}</p>
                                    <p className="truncate text-[11px] text-muted-foreground">{playerTeam?.name ?? player.team} · {player.mantra.join(' / ') || '—'}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell><RoleBadge role={player.role} /></TableCell>
                              <TableCell className="hidden text-right font-medium tabular-nums sm:table-cell">{player.quote}</TableCell>
                              <TableCell className="hidden text-right font-medium tabular-nums lg:table-cell">{player.fvm}</TableCell>
                              <TableCell className="hidden text-right md:table-cell">
                                <div className="font-medium tabular-nums">{player.average ? player.average.toFixed(2) : '—'} / {player.fantasyAverage ? player.fantasyAverage.toFixed(2) : '—'}</div>
                                <div className="text-[10px] text-muted-foreground">{player.appearances} pres.</div>
                              </TableCell>
                              <TableCell className="hidden xl:table-cell">
                                <div className="flex max-w-48 flex-wrap gap-1">
                                  {tags.slice(0, 2).map((tag) => <SetPieceBadge key={`${tag.type}-${tag.rank}`} type={tag.type}>{tag.label}</SetPieceBadge>)}
                                  {!tags.length && <span className="text-xs text-muted-foreground">—</span>}
                                </div>
                              </TableCell>
                              <TableCell className="pr-5 text-right">
                                <div className="font-semibold tabular-nums">{targetCredits(player, budget)} cr</div>
                                <div className="text-[10px] tabular-nums text-muted-foreground">{targetPercentage(player).toFixed(1)}%</div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="grid min-h-64 place-items-center px-6 text-center">
                      <div>
                        <Search className="mx-auto mb-3 size-8 text-muted-foreground/45" />
                        <h3 className="font-semibold">Nessun giocatore trovato</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Prova a cambiare nome, ruolo o squadra.</p>
                        <Button className="mt-4" variant="outline" onClick={() => { setQuery(''); setRole('ALL'); setTeamCode('ALL'); setFavoritesOnly(false); }}>Azzera filtri</Button>
                      </div>
                    </div>
                  )}

                  {visibleCount < filtered.length && (
                    <div className="border-t p-3 text-center">
                      <Button variant="ghost" onClick={() => setVisibleCount((count) => count + 120)}>Mostra altri 120 <ChevronRight /></Button>
                    </div>
                  )}
                </div>
              </>
            )}

            {view === 'teams' && (
              <div>
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <Badge variant="outline" className="mb-2">20 DOSSIER</Badge>
                    <h2 className="text-2xl font-semibold tracking-[-.035em] sm:text-3xl">Squadra per squadra</h2>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Rose complete, distribuzione dei ruoli, giocatori di punta e gerarchie sui piazzati.</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {teams.map((team) => {
                    const roster = rosterByTeam[team.code] ?? [];
                    const top = [...roster].sort((a, b) => b.fvm - a.fvm).slice(0, 3);
                    return (
                      <button key={team.code} aria-label={`Apri il dossier ${team.name}`} onClick={() => focusTeam(team.code)} className="group overflow-hidden rounded-[22px] border bg-card text-left shadow-[0_12px_35px_rgba(8,15,13,.04)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(8,15,13,.09)]">
                        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${team.primary} 0 68%, ${team.secondary} 68%)` }} />
                        <div className="p-4">
                          <div className="flex items-center gap-3">
                            <TeamMark team={team} size="lg" />
                            <div>
                              <h3 className="text-lg font-semibold tracking-tight">{team.name}</h3>
                              <p className="text-xs text-muted-foreground">{roster.length} giocatori nel listone</p>
                            </div>
                            <ArrowRight className="ml-auto size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
                          </div>
                          <div className="my-4 grid grid-cols-4 gap-1.5">
                            {(Object.keys(roleMeta) as Role[]).map((key) => (
                              <div key={key} className="rounded-xl bg-muted/65 px-2 py-2 text-center">
                                <p className="text-[9px] font-bold text-muted-foreground">{key}</p>
                                <p className="text-sm font-semibold tabular-nums">{roster.filter((player) => player.role === key).length}</p>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-2 border-t pt-3">
                            {top.map((player, index) => (
                              <div key={player.id} className="flex items-center gap-2 text-xs">
                                <span className="w-4 font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
                                <span className="min-w-0 flex-1 truncate font-medium">{player.name}</span>
                                <span className="tabular-nums text-muted-foreground">{targetCredits(player, budget)} cr</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 rounded-xl bg-[#101a17] px-3 py-2 text-xs text-white">
                            <span className="text-white/45">Rigorista · </span><span className="font-semibold text-lime-300">{team.penalties[0]}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {view === 'setpieces' && (
              <div>
                <div className="mb-5 rounded-[22px] border border-amber-200 bg-amber-50 p-4 sm:flex sm:items-center sm:gap-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-200 text-amber-900"><Info className="size-5" /></div>
                  <div className="mt-3 sm:mt-0">
                    <h2 className="font-semibold text-amber-950">Gerarchie aggiornate al 29 agosto</h2>
                    <p className="text-sm text-amber-900/70">I nomi sono ordinati per priorità. Le gerarchie restano indicative e possono cambiare con mercato, turnover e scelte dell’allenatore.</p>
                  </div>
                </div>
                <div className="mb-5">
                  <Badge variant="outline" className="mb-2">CALCI PIAZZATI</Badge>
                  <h2 className="text-2xl font-semibold tracking-[-.035em] sm:text-3xl">Rigori, punizioni e corner</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Tutti i battitori delle 20 squadre, in ordine di gerarchia.</p>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {teams.map((team) => (
                    <article key={team.code} className="overflow-hidden rounded-[22px] border bg-card shadow-[0_10px_32px_rgba(8,15,13,.04)]">
                      <div className="flex items-center gap-3 border-b px-4 py-3.5">
                        <TeamMark team={team} />
                        <h3 className="font-semibold tracking-tight">{team.name}</h3>
                        <Button variant="ghost" size="xs" className="ml-auto" onClick={() => focusTeam(team.code)}>Vedi rosa <ChevronRight /></Button>
                      </div>
                      <div className="grid gap-4 p-4 sm:grid-cols-3">
                        {[
                          ['Rigori', team.penalties, Target, 'text-lime-700 bg-lime-100'],
                          ['Punizioni', team.freeKicks, Goal, 'text-sky-700 bg-sky-100'],
                          ['Corner', team.corners, Flag, 'text-amber-700 bg-amber-100'],
                        ].map(([label, names, Icon, iconStyle]) => {
                          const PieceIcon = Icon as typeof Target;
                          return (
                            <div key={String(label)}>
                              <div className="mb-2 flex items-center gap-2">
                                <span className={`grid size-6 place-items-center rounded-lg ${String(iconStyle)}`}><PieceIcon className="size-3.5" /></span>
                                <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">{String(label)}</p>
                              </div>
                              <ol className="space-y-1.5">
                                {(names as string[]).map((name, index) => (
                                  <li key={name} className="flex items-baseline gap-1.5 text-xs">
                                    <span className={`font-mono text-[9px] ${index === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>0{index + 1}</span>
                                    <span className={index === 0 ? 'font-semibold' : 'text-muted-foreground'}>{name}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {view === 'auction' && <AuctionDashboard />}
          </section>

          {view !== 'auction' && <aside className="space-y-4 xl:sticky xl:top-[84px] xl:self-start">
            <div className="rounded-[22px] border bg-card p-4 shadow-[0_14px_40px_rgba(8,15,13,.05)]">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">Budget planner</p>
                  <h3 className="mt-1 font-semibold tracking-tight">La tua lega</h3>
                </div>
                <CircleDollarSign className="size-5 text-muted-foreground" />
              </div>
              <label className="text-xs font-medium" htmlFor="budget">Crediti iniziali</label>
              <div className="relative mt-1.5">
                <Input
                  id="budget"
                  type="number"
                  min={100}
                  max={5000}
                  value={budget}
                  onChange={(event) => setBudget(Math.max(100, Math.min(5000, Number(event.target.value) || 500)))}
                  className="h-11 rounded-xl bg-muted/55 pr-10 text-lg font-semibold tabular-nums"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">cr</span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ['Portieri', 7, '#fcd34d'],
                  ['Difensori', 19, '#6ee7b7'],
                  ['Centrocampo', 32, '#7dd3fc'],
                  ['Attacco', 42, '#f0abfc'],
                ].map(([label, percentage, color]) => (
                  <div key={String(label)}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{String(label)}</span>
                      <span className="font-medium tabular-nums">{Math.round((Number(percentage) / 100) * budget)} cr · {percentage}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${percentage}%`, background: String(color) }} /></div>
                  </div>
                ))}
              </div>
              <p className="mt-4 border-t pt-3 text-[10px] leading-relaxed text-muted-foreground">Ripartizione mediana misurata su aste 2026/27: 7% P, 19% D, 32% C, 42% A.</p>
            </div>

            <div className="rounded-[22px] bg-[#101a17] p-4 text-white shadow-[0_18px_42px_rgba(8,15,13,.12)]">
              <div className="mb-3 flex items-center justify-between">
                <div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-lime-300">Radar FVM</p><h3 className="mt-1 font-semibold">I più caldi</h3></div>
                <TrendingUp className="size-5 text-lime-300" />
              </div>
              <div className="space-y-1">
                {topSignals.map((player, index) => (
                  <button key={player.id} onClick={() => setSelectedPlayer(player)} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-white/[.07]">
                    <span className="w-5 font-mono text-[10px] text-white/30">0{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">{player.name}</span>
                    <span className="text-[10px] tabular-nums text-lime-300">{player.fvm} FVM</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border bg-card p-4">
              <div className="mb-3 flex items-center gap-2"><BarChart3 className="size-4 text-muted-foreground" /><h3 className="text-sm font-semibold">Qualità dei dati</h3></div>
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between"><span className="text-muted-foreground">Listone</span><span className="font-medium text-emerald-700">Ufficiale</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Statistiche</span><span className="font-medium text-emerald-700">Ufficiali</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Piazzati</span><span className="font-medium text-amber-700">Gerarchie editoriali</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Target asta</span><span className="font-medium text-sky-700">Stima comparativa</span></div>
              </div>
              <div className="mt-3 border-t pt-3">
                {dataSources.map((source) => (
                  <a key={source.href} href={source.href} target="_blank" rel="noreferrer" className="flex items-center justify-between py-1 text-[10px] text-muted-foreground hover:text-foreground">
                    {source.label}<ExternalLink className="size-3" />
                  </a>
                ))}
              </div>
            </div>
          </aside>}
        </div>
      </div>

      <footer className="mt-10 border-t bg-[#0b1210] text-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2"><Zap className="size-4 text-lime-300" /><span className="font-semibold text-white">FantaBoard</span><span>· Serie A 2026/27</span></div>
          <p>Strumento informativo indipendente · loghi trasparenti via FootyLogos. Il target d’asta è una stima.</p>
        </div>
      </footer>

      <Sheet open={Boolean(selectedPlayer)} onOpenChange={(open) => !open && setSelectedPlayer(null)}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[520px]">
          {selectedPlayer && (() => {
            const playerTeam = teamByCode[selectedPlayer.team];
            const tags = getSetPieceTags(selectedPlayer);
            const change = selectedPlayer.quote - selectedPlayer.initialQuote;
            const sameTeam = (rosterByTeam[selectedPlayer.team] ?? [])
              .filter((player) => player.role === selectedPlayer.role && player.id !== selectedPlayer.id)
              .sort((a, b) => b.quote - a.quote)
              .slice(0, 4);
            return (
              <>
                <div className="relative overflow-hidden bg-[#0b1210] p-5 pb-6 text-white">
                  <div className="absolute inset-0 opacity-15" style={{ background: `radial-gradient(circle at 80% 0%, ${playerTeam?.secondary}, transparent 45%), linear-gradient(140deg, transparent, ${playerTeam?.primary}55)` }} />
                  <SheetHeader className="relative p-0 pr-10">
                    <div className="mb-5 flex items-center gap-3">
                      <TeamMark team={playerTeam} size="lg" />
                      <div>
                        <p className="text-[10px] uppercase tracking-[.14em] text-white/45">{playerTeam?.name} · Serie A</p>
                        <SheetTitle className="mt-0.5 text-2xl font-semibold tracking-[-.035em] text-white">{selectedPlayer.name}</SheetTitle>
                        <SheetDescription className="mt-1 text-xs text-white/45">Classic {selectedPlayer.role} · Mantra {selectedPlayer.mantra.join(' / ') || '—'}</SheetDescription>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => <span key={`${tag.type}-${tag.rank}`} className="rounded-full border border-white/10 bg-white/[.08] px-2.5 py-1 text-[10px] font-medium text-lime-200">{tag.label}</span>)}
                      {!tags.length && <span className="rounded-full border border-white/10 bg-white/[.06] px-2.5 py-1 text-[10px] text-white/45">Nessun piazzato assegnato</span>}
                    </div>
                  </SheetHeader>
                </div>

                <div className="space-y-5 p-5">
                  <div className="grid grid-cols-[1fr_1fr_1.3fr] gap-2">
                    <div className="rounded-2xl bg-muted/65 p-3"><p className="text-[9px] uppercase tracking-[.12em] text-muted-foreground">Quotazione</p><p className="mt-1 text-xl font-semibold tabular-nums">{selectedPlayer.quote}</p><p className={`text-[10px] ${change >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{change} dall’inizio</p></div>
                    <div className="rounded-2xl bg-muted/65 p-3"><p className="text-[9px] uppercase tracking-[.12em] text-muted-foreground">FVM / 1000</p><p className="mt-1 text-xl font-semibold tabular-nums">{selectedPlayer.fvm}</p><p className="text-[10px] text-muted-foreground">valore ufficiale</p></div>
                    <div className="rounded-2xl bg-lime-200 p-3 text-lime-950"><p className="text-[9px] uppercase tracking-[.12em] text-lime-900/60">Target {budget} cr</p><p className="mt-1 text-xl font-bold tabular-nums">{targetCredits(selectedPlayer, budget)} cr</p><p className="text-[10px] text-lime-900/60">{targetPercentage(selectedPlayer).toFixed(1)}% del budget</p></div>
                  </div>

                  <section>
                    <div className="mb-2 flex items-center gap-2"><Trophy className="size-4 text-muted-foreground" /><h3 className="text-sm font-semibold">Rendimento 2026/27</h3></div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        ['Pres.', selectedPlayer.appearances],
                        ['MV', selectedPlayer.average ? selectedPlayer.average.toFixed(2) : '—'],
                        ['FM', selectedPlayer.fantasyAverage ? selectedPlayer.fantasyAverage.toFixed(2) : '—'],
                        ['Gol', selectedPlayer.goals],
                        ['Assist', selectedPlayer.assists],
                        ['Rigori', selectedPlayer.penalties],
                        ['Gialli', selectedPlayer.yellows],
                        ['Rossi', selectedPlayer.reds],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="rounded-xl border bg-card p-2.5 text-center"><p className="text-[9px] uppercase text-muted-foreground">{String(label)}</p><p className="mt-1 text-sm font-semibold tabular-nums">{String(value)}</p></div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2"><Sparkles className="size-4 text-muted-foreground" /><h3 className="text-sm font-semibold">Alternative di fascia</h3></div><span className="text-[10px] text-muted-foreground">stesso ruolo</span></div>
                    <div className="space-y-1.5">
                      {selectedAlternatives.map((player) => (
                        <button key={player.id} onClick={() => setSelectedPlayer(player)} className="flex w-full items-center gap-3 rounded-xl border bg-card p-2.5 text-left transition hover:bg-muted/55">
                          <TeamMark team={teamByCode[player.team]} size="sm" />
                          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{player.name}</p><p className="text-[10px] text-muted-foreground">{teamByCode[player.team]?.name} · QA {player.quote}</p></div>
                          <div className="text-right"><p className="text-xs font-semibold tabular-nums">{targetCredits(player, budget)} cr</p><p className="text-[9px] text-muted-foreground">{targetPercentage(player).toFixed(1)}%</p></div>
                          <ChevronRight className="size-3.5 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </section>

                  {sameTeam.length > 0 && (
                    <section>
                      <div className="mb-2 flex items-center gap-2"><Users className="size-4 text-muted-foreground" /><h3 className="text-sm font-semibold">Concorrenza in rosa</h3></div>
                      <div className="flex flex-wrap gap-1.5">{sameTeam.map((player) => <button key={player.id} onClick={() => setSelectedPlayer(player)} className="rounded-full border bg-card px-2.5 py-1 text-[10px] hover:bg-muted">{player.name} · QA {player.quote}</button>)}</div>
                    </section>
                  )}

                  <div className="rounded-xl bg-muted/60 p-3 text-[10px] leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Come leggere il target:</strong> stima comparativa calibrata su ruolo e FVM, pensata per confrontare profili sul tuo budget. Adattala a numero di partecipanti, modificatore e dinamica della tua asta.
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-2 pb-2">
                    <Button onClick={() => toggleFavorite(selectedPlayer.id)} variant={favorites.includes(selectedPlayer.id) ? 'default' : 'outline'} className="h-10 rounded-xl">
                      {favorites.includes(selectedPlayer.id) ? <BookmarkCheck /> : <Bookmark />} {favorites.includes(selectedPlayer.id) ? 'Nella shortlist' : 'Aggiungi alla shortlist'}
                    </Button>
                    <a href={selectedPlayer.href} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-medium hover:bg-muted">Scheda ufficiale <ExternalLink className="size-3.5" /></a>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </main>
  );
}
