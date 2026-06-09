import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpDown, ExternalLink, Users, Wallet, UserCog } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { teams, playersByTeam, type Player } from "@/data";

export const Route = createFileRoute("/explorer")({
  head: () => ({ meta: [{ title: "Explorer — FIWC 2026" }] }),
  component: ExplorerPage,
});

type SortKey = keyof Pick<Player, "name" | "age" | "position" | "club" | "marketValue">;

function ExplorerPage() {
  const [selected, setSelected] = useState(teams[0].name);
  const [sortKey, setSortKey] = useState<SortKey>("marketValue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const team = teams.find((t) => t.name === selected)!;
  const roster = useMemo(() => {
    const arr = [...playersByTeam(selected)];
    arr.sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      const cmp = typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [selected, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "marketValue" || k === "age" ? "desc" : "asc"); }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Page 03 · Explorer</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Explorateur Équipes & Joueurs</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Sélectionne une des 48 nations pour voir sa fiche d'identité et l'effectif détaillé.
        </p>
      </div>

      <div className="max-w-sm">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="bg-card/60"><SelectValue /></SelectTrigger>
          <SelectContent>
            {teams.map((t) => (
              <SelectItem key={t.name} value={t.name}>
                <span className="mr-2">{t.flag}</span>{t.name} <span className="ml-2 font-mono text-xs text-muted-foreground">Gr. {t.group}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/60 bg-card/60 p-6 backdrop-blur">
        <div className="flex flex-wrap items-start gap-6">
          <div className="text-7xl leading-none">{team.flag}</div>
          <div className="flex-1">
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Sélection · Groupe {team.group}</div>
            <h2 className="mt-1 text-3xl font-bold">{team.name}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat icon={UserCog} label="Sélectionneur" value={team.coach} />
              <Stat icon={Wallet} label="Valeur totale" value={`${team.totalValue} M€`} highlight />
              <Stat icon={Users} label="Effectif" value={`${roster.length} joueurs`} />
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-background/40 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <Th onClick={() => toggleSort("name")} active={sortKey === "name"}>Joueur</Th>
                <Th onClick={() => toggleSort("age")} active={sortKey === "age"}>Âge</Th>
                <Th onClick={() => toggleSort("position")} active={sortKey === "position"}>Poste</Th>
                <Th onClick={() => toggleSort("club")} active={sortKey === "club"}>Club</Th>
                <Th onClick={() => toggleSort("marketValue")} active={sortKey === "marketValue"} right>Valeur</Th>
                <th className="px-4 py-3 text-right">Profil</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((p) => (
                <tr key={p.id} className="border-b border-border/40 last:border-0 hover:bg-accent/30">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 font-mono">{p.age}</td>
                  <td className="px-4 py-3"><PositionBadge pos={p.position} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{p.club}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-primary">{p.marketValue} M€</td>
                  <td className="px-4 py-3 text-right">
                    <a href={p.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                      <ExternalLink className="size-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Th({ children, onClick, active, right }: { children: React.ReactNode; onClick: () => void; active: boolean; right?: boolean }) {
  return (
    <th className={`px-4 py-3 ${right ? "text-right" : "text-left"}`}>
      <button onClick={onClick} className={`inline-flex items-center gap-1 ${active ? "text-primary" : ""}`}>
        {children}<ArrowUpDown className="size-3" />
      </button>
    </th>
  );
}

function Stat({ icon: Icon, label, value, highlight }: { icon: typeof Users; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className="size-3" />{label}
      </div>
      <div className={`mt-1 text-base font-semibold ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

const POS_COLORS: Record<string, string> = {
  Gardien: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  Défenseur: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Milieu: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Attaquant: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};
function PositionBadge({ pos }: { pos: string }) {
  return <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${POS_COLORS[pos] ?? ""}`}>{pos}</span>;
}
