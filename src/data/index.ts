import fixtures from "./fixtures.json";

export type Position = "Gardien" | "Défenseur" | "Milieu" | "Attaquant";

export interface Player {
  id: string;
  name: string;
  nation: string;
  age: number;
  position: Position;
  club: string;
  marketValue: number; // M€
  profileUrl: string;
}

export interface Team {
  name: string;
  flag: string;
  group: string;
  coach: string;
  totalValue: number; // M€
}

export const teams: Team[] = fixtures.teams as Team[];
export const players: Player[] = fixtures.players as Player[];

export const playersByTeam = (name: string) =>
  players.filter((p) => p.nation === name);

export function toCSV(): string {
  const header = [
    "nation","group","coach","team_total_value_M",
    "player_name","age","position","club","player_value_M","profile_url",
  ].join(",");
  const rows = players.map((p) => {
    const t = teams.find((x) => x.name === p.nation)!;
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [
      esc(p.nation), esc(t.group), esc(t.coach), esc(t.totalValue),
      esc(p.name), esc(p.age), esc(p.position), esc(p.club), esc(p.marketValue), esc(p.profileUrl),
    ].join(",");
  });
  return [header, ...rows].join("\n");
}
