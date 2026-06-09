import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Trophy, TrendingDown, Star, Calendar, Users, Ruler, FolderRoot as Foot, Target, Wallet } from "lucide-react";
import { teams, players } from "@/data";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — FIWC 2026" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const top10 = useMemo(
    () => [...teams].sort((a, b) => b.totalValue - a.totalValue).slice(0, 10).reverse(),
    []
  );
  const byGroup = useMemo(() => {
    const map = new Map<string, number>();
    teams.forEach((t) => map.set(t.group ?? "A", (map.get(t.group ?? "A") ?? 0) + t.totalValue));
    return Array.from(map.entries())
      .map(([group, value]) => ({ group: `Groupe ${group}`, value: +value.toFixed(0) }))
      .sort((a, b) => a.group.localeCompare(b.group));
  }, []);
  const maxGroup = byGroup.reduce((m, g) => (g.value > m.value ? g : m), byGroup[0]);

  const kpis = useMemo(() => {
    const mostExpensiveTeam = [...teams].sort((a, b) => b.totalValue - a.totalValue)[0];
    const cheapestTeam = [...teams].sort((a, b) => a.totalValue - b.totalValue)[0];
    const topPlayer = [...players].sort((a, b) => b.marketValue - a.marketValue)[0];
    const avgAge = +(players.reduce((s, p) => s + (p.age || 0), 0) / players.length).toFixed(1);
    const avgValue = +(teams.reduce((s, t) => s + t.totalValue, 0) / teams.length).toFixed(1);
    const totalValue = teams.reduce((s, t) => s + t.totalValue, 0);
    return { mostExpensiveTeam, cheapestTeam, topPlayer, avgAge, avgValue, totalValue };
  }, []);

  const positionStats = useMemo(() => {
    const counts: Record<string, number> = {};
    players.forEach((p) => {
      const pos = p.position || "Unknown";
      counts[pos] = (counts[pos] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, []);

  const footStats = useMemo(() => {
    let left = 0, right = 0, both = 0;
    players.forEach((p) => {
      if (!p.foot) return;
      const f = p.foot.toLowerCase();
      if (f === "left") left++;
      else if (f === "right") right++;
      else both++;
    });
    return [
      { name: "Left", value: left, fill: "var(--color-chart-1)" },
      { name: "Right", value: right, fill: "var(--color-chart-2)" },
      { name: "Both", value: both, fill: "var(--color-chart-3)" },
    ];
  }, []);

  const topScorers = useMemo(() => {
    return [...players]
      .filter((p) => (p.goals || 0) > 0)
      .sort((a, b) => (b.goals || 0) - (a.goals || 0))
      .slice(0, 10)
      .map((p) => ({ name: p.name, goals: p.goals || 0, nation: p.nation }));
  }, []);

  const mostCapped = useMemo(() => {
    return [...players]
      .filter((p) => (p.caps || 0) > 0)
      .sort((a, b) => (b.caps || 0) - (a.caps || 0))
      .slice(0, 10)
      .map((p) => ({ name: p.name, caps: p.caps || 0, nation: p.nation }));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Page 02 · Data Analyst</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Analytics & Insights</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Visualisations prêtes pour carrousels LinkedIn — valeur marchande, groupe de la mort, KPIs clés.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Trophy} label="Équipe la + chère" value={kpis.mostExpensiveTeam.name} sub={`${kpis.mostExpensiveTeam.totalValue}M€ ${kpis.mostExpensiveTeam.flag}`} />
        <KpiCard icon={TrendingDown} label="Équipe la - chère" value={kpis.cheapestTeam.name} sub={`${kpis.cheapestTeam.totalValue}M€ ${kpis.cheapestTeam.flag}`} />
        <KpiCard icon={Star} label="Joueur le + cher" value={kpis.topPlayer.name} sub={`${kpis.topPlayer.marketValue}M€ · ${kpis.topPlayer.nation}`} />
        <KpiCard icon={Calendar} label="Âge moyen" value={`${kpis.avgAge} ans`} sub={`${players.length} joueurs`} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard icon={Wallet} label="Valeur totale" value={`${kpis.totalValue.toFixed(0)}M€`} sub={`${teams.length} équipes`} />
        <KpiCard icon={Users} label="Valeur moyenne/équipe" value={`${kpis.avgValue}M€`} sub="Médiane globale" />
        <KpiCard icon={Star} label="Top 10 valeur" value={`${top10.reduce((s, t) => s + t.totalValue, 0).toFixed(0)}M€`} sub="Cumul 10 meilleures" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/60 p-6 backdrop-blur">
          <div className="mb-4">
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Chart · Bar Horizontal</div>
            <h2 className="text-xl font-semibold">Top 10 — Sélections les plus chères</h2>
          </div>
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ left: 24, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} unit="M€" />
                <YAxis type="category" dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} width={110} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}M€`, "Valeur"]} />
                <Bar dataKey="totalValue" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/60 p-6 backdrop-blur">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Chart · Valeur cumulée</div>
              <h2 className="text-xl font-semibold">Groupe de la Mort financier</h2>
            </div>
            <div className="text-right">
              <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Plus riche</div>
              <div className="text-lg font-bold text-primary">{maxGroup.group} · {maxGroup.value}M€</div>
            </div>
          </div>
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byGroup} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="group" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} unit="M" />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}M€`, "Total"]} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {byGroup.map((g) => (
                    <Cell key={g.group} fill={g.group === maxGroup.group ? "var(--color-chart-5)" : "var(--color-chart-1)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/60 p-6 backdrop-blur">
          <div className="mb-4">
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Chart · Répartition</div>
            <h2 className="text-lg font-semibold">Postes</h2>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={positionStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {positionStats.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`var(--color-chart-${(index % 5) + 1})`} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/60 p-6 backdrop-blur">
          <div className="mb-4">
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Chart · Pied fort</div>
            <h2 className="text-lg font-semibold">Latéralité</h2>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={footStats} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {footStats.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/60 p-6 backdrop-blur">
          <div className="mb-4">
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Chart · Buts en sélection</div>
            <h2 className="text-lg font-semibold">Top Buteurs</h2>
          </div>
          <div className="space-y-2">
            {topScorers.slice(0, 6).map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`font-mono ${i === 0 ? "text-primary font-bold" : "text-muted-foreground"}`}>{i + 1}.</span>
                  <span>{p.name}</span>
                  <span className="text-[10px] text-muted-foreground">({p.nation})</span>
                </div>
                <span className="font-mono font-semibold">{p.goals}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/60 p-6 backdrop-blur">
        <div className="mb-4">
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Chart · Sélections</div>
          <h2 className="text-xl font-semibold">Joueurs les plus capés</h2>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mostCapped.slice(0, 10)} layout="vertical" margin={{ left: 100, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "Sélections"]} />
              <Bar dataKey="caps" fill="var(--color-chart-2)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
};

function KpiCard({ icon: Icon, label, value, sub }: { icon: typeof Trophy; label: string; value: string; sub: string }) {
  return (
    <Card className="border-border/60 bg-card/60 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="grid size-8 place-items-center rounded-md bg-primary/15 text-primary">
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-3 text-xl font-bold leading-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </Card>
  );
}
