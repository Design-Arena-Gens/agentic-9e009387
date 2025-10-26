"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildDefaultConfig } from "@/lib/defaultConfig";
import type { AgentConfig, RiskReport } from "@/lib/types";

type TriggerMode = "manual" | "daily" | "weekly" | "realtime";

interface ScanState {
  loading: boolean;
  success: boolean;
  message: string | null;
  notifications?: string[];
}

const STORAGE_KEY = "agentic-risk-config";

const blankState: ScanState = {
  loading: false,
  success: false,
  message: null,
};

const sortUnique = (items: string[]) =>
  Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const ReportCard = ({ report }: { report: RiskReport }) => (
  <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
    <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
        {report.triggerMode}
      </span>
      <span className="text-sm text-slate-400">
        Generated {new Date(report.generatedAt).toLocaleString()}
      </span>
    </header>
    <h3 className="text-xl font-semibold text-white">
      {report.industry} — {report.severity} risk posture
    </h3>
    <p className="mt-2 text-sm text-slate-300">{report.overview}</p>

    <section className="mt-4">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Dominant themes
      </h4>
      <div className="mt-2 flex flex-wrap gap-2">
        {report.dominantThemes.map((theme) => (
          <span
            key={theme}
            className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/40"
          >
            {theme}
          </span>
        ))}
      </div>
    </section>

    <section className="mt-4 space-y-3">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Top signals
      </h4>
      {report.insights.map((insight) => (
        <div
          key={insight.id}
          className="rounded-lg border border-slate-800 bg-slate-950/40 p-4"
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <a
                href={insight.article.url}
                target="_blank"
                rel="noreferrer"
                className="text-base font-semibold text-emerald-300 hover:underline"
              >
                {insight.article.title}
              </a>
              <div className="text-xs text-slate-400">
                {insight.article.source} •{" "}
                {new Date(insight.article.publishedAt).toLocaleString()}
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                insight.riskLevel === "High"
                  ? "bg-rose-600/20 text-rose-300 ring-1 ring-rose-500/40"
                  : insight.riskLevel === "Medium"
                    ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40"
                    : "bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/40"
              }`}
            >
              {insight.riskLevel}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-300">
            {insight.impactSummary}
          </p>
          {insight.keyQuotes.length > 0 && (
            <ul className="mt-3 space-y-2 border-l-2 border-emerald-700/40 pl-3 text-sm text-emerald-200">
              {insight.keyQuotes.map((quote) => (
                <li key={quote}>&ldquo;{quote}&rdquo;</li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {insight.categories.map((category) => (
              <span
                key={category}
                className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      ))}
    </section>

    <section className="mt-6">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Next moves
      </h4>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-300">
        {report.recommendations.map((recommendation) => (
          <li key={recommendation}>{recommendation}</li>
        ))}
      </ul>
    </section>
  </article>
);

const ConfigTagList = ({
  label,
  items,
  onRemove,
}: {
  label: string;
  items: string[];
  onRemove: (value: string) => void;
}) => (
  <div>
    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
      {label}
    </h4>
    <div className="mt-2 flex flex-wrap gap-2">
      {items.length === 0 && (
        <span className="rounded-md border border-dashed border-slate-700 px-3 py-1 text-xs text-slate-500">
          None configured
        </span>
      )}
      {items.map((item) => (
        <span
          key={item}
          className="group flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1 text-xs text-slate-200"
        >
          <span className="max-w-[180px] truncate">{item}</span>
          <button
            type="button"
            onClick={() => onRemove(item)}
            className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300 opacity-0 transition group-hover:opacity-100"
          >
            Remove
          </button>
        </span>
      ))}
    </div>
  </div>
);

export function AgentDashboard() {
  const [config, setConfig] = useState<AgentConfig>(buildDefaultConfig());
  const [reports, setReports] = useState<RiskReport[]>([]);
  const [scanState, setScanState] = useState<ScanState>(blankState);
  const [draft, setDraft] = useState({
    source: "",
    keyword: "",
    email: "",
    whatsapp: "",
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AgentConfig;
        setConfig({
          ...buildDefaultConfig(),
          ...parsed,
        });
      } catch (error) {
        console.warn("Failed to parse stored config", error);
      }
    }

    fetch("/api/reports?limit=6")
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok) {
          setReports(data.reports ?? []);
        }
      })
      .catch((error) => console.error("Failed to load reports", error));
  }, []);

  const handleAdd = useCallback(
    (field: keyof AgentConfig, value: string) => {
      setConfig((prev) => ({
        ...prev,
        [field]: sortUnique([...(prev[field] as string[]), value]),
      }));
    },
    [],
  );

  const handleRemove = useCallback((field: keyof AgentConfig, value: string) => {
    setConfig((prev) => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((item) => item !== value),
    }));
  }, []);

  const persistConfig = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setScanState({
      loading: false,
      success: true,
      message: "Configuration saved locally.",
    });
  }, [config]);

  const triggerScan = useCallback(
    async (mode: TriggerMode) => {
      setScanState({ loading: true, success: false, message: null });
      try {
        const response = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config,
            triggerMode: mode,
          }),
        });

        const data = await response.json();
        if (!data?.ok) {
          throw new Error(data?.error ?? "Scan failed");
        }

        setReports((prev) => [data.report, ...prev].slice(0, 6));
        setScanState({
          loading: false,
          success: true,
          message: `Scan completed from ${data.meta.articleCount} sources.`,
          notifications: [
            data.notifications.email?.success
              ? "Email dispatch succeeded"
              : data.notifications.email?.error
                ? `Email error: ${data.notifications.email.error}`
                : "Email skipped",
            data.notifications.whatsapp?.success
              ? "WhatsApp alerts delivered"
              : data.notifications.whatsapp?.error
                ? `WhatsApp error: ${data.notifications.whatsapp.error}`
                : "WhatsApp skipped",
          ],
        });
      } catch (error) {
        setScanState({
          loading: false,
          success: false,
          message:
            error instanceof Error ? error.message : "Unexpected scan failure",
        });
      }
    },
    [config],
  );

  const keywordHighlights = useMemo(() => {
    if (!reports.length) return [];
    const latest = reports[0];
    return Object.entries(latest.keywordHits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [reports]);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-12 text-slate-200">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-widest text-emerald-300/80">
          Sentinel Ops Console
        </p>
        <h1 className="text-4xl font-semibold text-white">
          Automobile Risk Intelligence Agent
        </h1>
        <p className="max-w-2xl text-sm text-slate-300">
          Continuous monitoring across global news to flag geopolitical,
          economic, regulatory, and technology events that could disrupt the{" "}
          {config.industry} sector. Adjust intelligence levers below and deploy
          manual, real-time, daily, or weekly assessments at will.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
          <h2 className="text-lg font-semibold text-white">
            Admin Control Center
          </h2>
          <div className="space-y-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Core industry focus
              </span>
              <input
                value={config.industry}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    industry: event.target.value,
                  }))
                }
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                placeholder="Automobile"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Add news source (HTTPS URL)
              </span>
              <div className="flex gap-2">
                <input
                  value={draft.source}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, source: event.target.value }))
                  }
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  placeholder="https://www.reuters.com"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!draft.source) return;
                    handleAdd("sources", draft.source);
                    setDraft((prev) => ({ ...prev, source: "" }));
                  }}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-950 transition hover:bg-emerald-400"
                >
                  Add
                </button>
              </div>
            </label>
            <ConfigTagList
              label="Active sources"
              items={config.sources}
              onRemove={(value) => handleRemove("sources", value)}
            />

            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Add keyword
              </span>
              <div className="flex gap-2">
                <input
                  value={draft.keyword}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, keyword: event.target.value }))
                  }
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  placeholder="Supply chain disruption"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!draft.keyword) return;
                    handleAdd("keywords", draft.keyword);
                    setDraft((prev) => ({ ...prev, keyword: "" }));
                  }}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-950 transition hover:bg-emerald-400"
                >
                  Add
                </button>
              </div>
            </label>
            <ConfigTagList
              label="Monitored keywords"
              items={config.keywords}
              onRemove={(value) => handleRemove("keywords", value)}
            />

            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Add alert email
              </span>
              <div className="flex gap-2">
                <input
                  value={draft.email}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, email: event.target.value }))
                  }
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  placeholder="ops@example.com"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!draft.email) return;
                    handleAdd("emails", draft.email.toLowerCase());
                    setDraft((prev) => ({ ...prev, email: "" }));
                  }}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-950 transition hover:bg-emerald-400"
                >
                  Add
                </button>
              </div>
            </label>
            <ConfigTagList
              label="Email distribution"
              items={config.emails}
              onRemove={(value) => handleRemove("emails", value)}
            />

            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Add WhatsApp number (+countrycode)
              </span>
              <div className="flex gap-2">
                <input
                  value={draft.whatsapp}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      whatsapp: event.target.value,
                    }))
                  }
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  placeholder="+15551234567"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!draft.whatsapp) return;
                    handleAdd("whatsappNumbers", draft.whatsapp);
                    setDraft((prev) => ({ ...prev, whatsapp: "" }));
                  }}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-950 transition hover:bg-emerald-400"
                >
                  Add
                </button>
              </div>
            </label>
            <ConfigTagList
              label="WhatsApp alerts"
              items={config.whatsappNumbers}
              onRemove={(value) => handleRemove("whatsappNumbers", value)}
            />

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <h4 className="text-sm font-semibold text-white">Cadence</h4>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.enableRealtimeAlerts}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        enableRealtimeAlerts: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Realtime alerts to email & WhatsApp</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.enableDailyDigest}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        enableDailyDigest: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Daily report to email</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.enableWeeklyDigest}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        enableWeeklyDigest: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Weekly digest to email</span>
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={persistConfig}
              className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold uppercase tracking-wide text-emerald-950 transition hover:bg-emerald-400"
            >
              Save Control Settings
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Manual Control
                </h2>
                <p className="text-sm text-slate-300">
                  Launch scans instantly or dispatch daily/weekly summaries on
                  demand.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => triggerScan("manual")}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-60"
                  disabled={scanState.loading}
                >
                  Push Scan Now
                </button>
                <button
                  type="button"
                  onClick={() => triggerScan("realtime")}
                  className="rounded-lg border border-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-500/10 disabled:opacity-60"
                  disabled={scanState.loading}
                >
                  Real-time Blast
                </button>
                <button
                  type="button"
                  onClick={() => triggerScan("daily")}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-slate-800/80 disabled:opacity-60"
                  disabled={scanState.loading}
                >
                  Send Daily
                </button>
                <button
                  type="button"
                  onClick={() => triggerScan("weekly")}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-slate-800/80 disabled:opacity-60"
                  disabled={scanState.loading}
                >
                  Send Weekly
                </button>
              </div>
            </div>
            {scanState.message && (
              <div
                className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                  scanState.success
                    ? "border-emerald-700/60 bg-emerald-500/10 text-emerald-100"
                    : "border-rose-700/60 bg-rose-500/10 text-rose-100"
                }`}
              >
                {scanState.message}
                {scanState.notifications && (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {scanState.notifications.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Recent Signals
                </h2>
                <p className="text-sm text-slate-300">
                  Backed up automatically to Google Sheets for long-term
                  analytics.
                </p>
              </div>
              {keywordHighlights.length > 0 && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-xs uppercase tracking-wide text-emerald-200">
                  Hot keywords:{" "}
                  {keywordHighlights
                    .map(([keyword, count]) => `${keyword} (${count})`)
                    .join(" · ")}
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {reports.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 p-6 text-sm text-slate-400">
                  No reports yet. Trigger your first scan to populate the
                  intelligence feed.
                </div>
              ) : (
                reports.map((report) => (
                  <ReportCard key={report.generatedAt} report={report} />
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
