import fixtures from "./fixtures.json";

export type Position = "Gardien" | "Défenseur" | "Milieu" | "Attaquant" | string;

export interface Player {
  id: string;
  name: string;
  nation: string;
  age: number;
  position: Position;
  height?: string;
  foot?: string;
  club: string;
  marketValue: number; // M€
  caps?: number;
  goals?: number;
  number?: number;
  profileUrl?: string;
}

export interface Team {
  name: string;
  flag: string;
  group?: string;
  coach: string;
  totalValue: number; // M€
  url?: string;
}

export const teams: Team[] = fixtures.teams as Team[];
export const players: Player[] = (fixtures.players as Player[]).map((p, i) => ({
  ...p,
  id: p.id || `p${i + 1}`,
}));

export const playersByTeam = (name: string) =>
  players.filter((p) => p.nation === name);

export function toCSV(): string {
  const header = [
    "nation",
    "group",
    "coach",
    "team_total_value_M",
    "player_name",
    "number",
    "age",
    "position",
    "height",
    "foot",
    "club",
    "caps",
    "goals",
    "player_value_M",
    "profile_url",
  ].join(",");
  const rows = players.map((p) => {
    const t = teams.find((x) => x.name === p.nation)!;
    const esc = (v: string | number | undefined) => {
      if (v === undefined) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [
      esc(p.nation),
      esc(t?.group),
      esc(t?.coach),
      esc(t?.totalValue),
      esc(p.name),
      esc(p.number),
      esc(p.age),
      esc(p.position),
      esc(p.height),
      esc(p.foot),
      esc(p.club),
      esc(p.caps),
      esc(p.goals),
      esc(p.marketValue),
      esc(p.profileUrl),
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

export function getTopPlayers(limit = 10): Player[] {
  return [...players].sort((a, b) => b.marketValue - a.marketValue).slice(0, limit);
}

export function getStats() {
  const totalValue = teams.reduce((sum, t) => sum + t.totalValue, 0);
  const avgAge =
    Math.round(players.reduce((sum, p) => sum + (p.age || 0), 0) / players.length);
  const avgValue =
    Math.round(totalValue / teams.length);
  const topPlayer = players.sort((a, b) => b.marketValue - a.marketValue)[0];
  const topTeam = teams.sort((a, b) => b.totalValue - a.totalValue)[0];
  return { totalValue, avgAge, avgValue, topPlayer, topTeam };
}
