import playersData from '@/data/players.json';
import { teamByCode } from '@/data/teams';

export type Player = (typeof playersData.players)[number];
export type Role = 'P' | 'D' | 'C' | 'A';

/*
  Un ruolo, un colore. Le stesse quattro tinte tornano ovunque: pastiglie del
  listone, barre dei reparti, filetto laterale delle righe.
*/
export const roleMeta: Record<Role, {
  label: string;
  short: string;
  color: string;
  /** Slot standard in una rosa da 25. */
  limit: number;
  /** Quota mediana di budget del reparto, misurata sulle aste 26/27. */
  budgetShare: number;
}> = {
  P: { label: 'Portieri', short: 'POR', color: 'var(--role-p)', limit: 3, budgetShare: 7 },
  D: { label: 'Difensori', short: 'DIF', color: 'var(--role-d)', limit: 8, budgetShare: 19 },
  C: { label: 'Centrocampisti', short: 'CEN', color: 'var(--role-c)', limit: 8, budgetShare: 32 },
  A: { label: 'Attaccanti', short: 'ATT', color: 'var(--role-a)', limit: 6, budgetShare: 42 },
};

export const roleKeys = Object.keys(roleMeta) as Role[];

export function roleColor(role: string) {
  return roleMeta[role as Role]?.color ?? 'var(--muted-foreground)';
}

const roleCeilings: Record<string, number> = { P: 6.5, D: 8, C: 13, A: 20 };
const roleFvmMax: Record<string, number> = { P: 68, D: 253, C: 266, A: 414 };

export function targetPercentage(player: Player) {
  return Math.max(
    0.2,
    roleCeilings[player.role] * (player.fvm / roleFvmMax[player.role]) ** 0.82,
  );
}

export function targetCredits(player: Player, budget: number) {
  return Math.max(1, Math.round((targetPercentage(player) / 100) * budget));
}

/*
  Il limite è il punto oltre il quale il giocatore costa più di quanto valga
  nel piano: 15% sopra il target. Serve al tastierino per dire quando fermarsi.
*/
export function limitCredits(player: Player, budget: number) {
  return Math.max(2, Math.round(targetCredits(player, budget) * 1.15));
}

export type Verdict = 'target' | 'rilancio' | 'oltre';

export function verdictFor(bid: number, target: number, limit: number): Verdict {
  if (bid > limit) return 'oltre';
  if (bid <= target) return 'target';
  return 'rilancio';
}

export const verdictMeta: Record<Verdict, { label: string; color: string }> = {
  target: { label: 'PREZZO GIUSTO', color: 'var(--primary)' },
  rilancio: { label: 'ZONA RILANCIO', color: 'var(--warn)' },
  oltre: { label: 'SOPRA IL LIMITE', color: 'var(--danger)' },
};

export function normalize(value: string) {
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

export type SetPieceTag = {
  label: string;
  rank: number;
  type: 'penalty' | 'freeKick' | 'corner';
};

export function getSetPieceTags(player: Player): SetPieceTag[] {
  const team = teamByCode[player.team];
  if (!team) return [];
  const tags: SetPieceTag[] = [];
  const penaltyRank = team.penalties.findIndex((name) => playerMatches(player.name, name));
  const freeKickRank = team.freeKicks.findIndex((name) => playerMatches(player.name, name));
  const cornerRank = team.corners.findIndex((name) => playerMatches(player.name, name));
  if (penaltyRank >= 0) tags.push({ label: penaltyRank === 0 ? '1° rigorista' : `${penaltyRank + 1}° rigorista`, rank: penaltyRank, type: 'penalty' });
  if (freeKickRank >= 0) tags.push({ label: freeKickRank === 0 ? 'Punizioni' : 'Alt. punizioni', rank: freeKickRank, type: 'freeKick' });
  if (cornerRank >= 0) tags.push({ label: cornerRank === 0 ? 'Corner' : 'Alt. corner', rank: cornerRank, type: 'corner' });
  return tags;
}

/** Alternative dello stesso ruolo con target più vicino al giocatore scelto. */
export function alternativesFor(player: Player, count = 4) {
  const target = targetPercentage(player);
  return playersData.players
    .filter((other) => other.role === player.role && other.id !== player.id)
    .sort((a, b) => Math.abs(targetPercentage(a) - target) - Math.abs(targetPercentage(b) - target))
    .slice(0, count);
}
