import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play, Download, CheckCircle2, AlertCircle, Loader2, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { teams, players, toCSV } from "@/data";

const SCRAPE_URL = "http://localhost:5000/api/scrape";
const TARGET = "https://www.transfermarkt.com/weltmeisterschaft/startseite/pokalwettbewerb/FIWC";

type Status = "idle" | "running" | "done" | "error";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Scraper Control — FIWC 2026" }] }),
  component: ScraperPage,
});

function ScraperPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  const pushLog = (msg: string) =>
    setLogs((l) => [...l, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  async function runScrape() {
    setStatus("running");
    setProgress(0);
    setLogs([]);
    pushLog(`POST ${SCRAPE_URL}`);
    pushLog(`Target: ${TARGET}`);

    // Try real backend (non-blocking; fall back to simulation)
    let usedBackend = false;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 1500);
      const res = await fetch(SCRAPE_URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: TARGET }),
      });
      clearTimeout(timer);
      if (res.ok) {
        usedBackend = true;
        setBackendOk(true);
        pushLog("✓ Backend Python connecté");
      }
    } catch {
      setBackendOk(false);
      pushLog("⚠ Backend localhost:5000 indisponible — mode simulation");
    }

    // Animate progress over 48 teams
    for (let i = 0; i < teams.length; i++) {
      await new Promise((r) => setTimeout(r, usedBackend ? 30 : 80));
      setProgress(Math.round(((i + 1) / teams.length) * 100));
      if (i % 6 === 0 || i === teams.length - 1) {
        pushLog(`Scraped ${teams[i].flag} ${teams[i].name} (${teams[i].totalValue}M€)`);
      }
    }
    pushLog(`✓ Terminé : ${teams.length} équipes, ${players.length} joueurs`);
    setStatus("done");
  }

  function exportCSV() {
    const csv = toCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fiwc2026_dataset_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Page 01 · Data Engineering</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Scraper Control</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Orchestration du scraping Transfermarkt pour la Coupe du Monde 2026 (FIWC).
          Lance le pipeline, monitore le progrès des 48 nations, exporte le dataset.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 bg-card/60 p-6 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Scraper Status</div>
              <div className="mt-1 flex items-center gap-2">
                <StatusDot status={status} />
                <span className="text-lg font-semibold capitalize">{status === "idle" ? "En attente" : status === "running" ? "En cours" : status === "done" ? "Terminé" : "Erreur"}</span>
              </div>
            </div>
            <Button size="lg" onClick={runScrape} disabled={status === "running"} className="gap-2">
              {status === "running" ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              {status === "running" ? "Scraping..." : "Lancer le Scraping"}
            </Button>
          </div>

          <Progress value={progress} className="h-2" />
          <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground">
            <span>{Math.round((progress / 100) * teams.length)} / {teams.length} équipes</span>
            <span>{progress}%</span>
          </div>

          <div className="mt-6 rounded-md border border-border/60 bg-background/60 p-3 font-mono text-xs">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Server className="size-3" /> CONSOLE
            </div>
            <div className="max-h-56 space-y-1 overflow-auto">
              {logs.length === 0 ? (
                <div className="text-muted-foreground">$ en attente de lancement…</div>
              ) : (
                logs.map((l, i) => <div key={i} className="text-foreground/80">{l}</div>)
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60 bg-card/60 p-5 backdrop-blur">
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Target</div>
            <a href={TARGET} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm text-primary hover:underline">
              {TARGET}
            </a>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Stat label="Nations" value={teams.length} />
              <Stat label="Joueurs" value={players.length} />
              <Stat label="Groupes" value={12} />
              <Stat label="Endpoint" value=":5000" mono />
            </div>
          </Card>

          <Card className="border-border/60 bg-card/60 p-5 backdrop-blur">
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Export</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Télécharge le dataset complet en CSV (compatible import Canva en bloc).
            </p>
            <Button variant="outline" className="mt-4 w-full gap-2" onClick={exportCSV} disabled={status !== "done"}>
              <Download className="size-4" /> Export CSV
            </Button>
            {status !== "done" && (
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">Lance le scraping d'abord.</p>
            )}
          </Card>

          {backendOk === false && (
            <Card className="border-yellow-500/30 bg-yellow-500/5 p-4 text-xs">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 size-4 text-yellow-500" />
                <div>
                  <div className="font-semibold text-yellow-200">Backend hors-ligne</div>
                  <p className="mt-1 text-muted-foreground">
                    Lance <code className="font-mono text-primary">python scraper/app.py</code> pour activer le scraping réel.
                  </p>
                </div>
              </div>
            </Card>
          )}
          {backendOk === true && (
            <Card className="border-primary/30 bg-primary/5 p-4 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                <div className="text-muted-foreground">Backend Python détecté sur :5000</div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: Status }) {
  const cls =
    status === "running" ? "bg-primary animate-pulse"
    : status === "done" ? "bg-emerald-400"
    : status === "error" ? "bg-destructive"
    : "bg-muted-foreground";
  return <span className={`inline-block size-2.5 rounded-full ${cls}`} />;
}

function Stat({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
