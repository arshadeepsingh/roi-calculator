"use client";

import { useState } from "react";

interface ResearchData {
  companyName: string;
  description: string;
  monthlyTraffic: number;
  monthlyTrafficNote: string;
  acv: number;
  acvNote: string;
  tam: number;
  tamNote: string;
  linkedinAdSpend: number;
  linkedinAdSpendNote: string;
  googleAdSpend: number;
  googleAdSpendNote: string;
  confidence: "low" | "medium" | "high";
  citations: string[];
}

interface Params {
  monthlyTraffic: number;
  acv: number;
  tam: number;
  linkedinAdSpend: number;
  googleAdSpend: number;
  formFillRate: number;
  formAbandonRate: number;
  abandonToDemo: number;
  demoToDeal: number;
  dealWinRate: number;
  coldReachToMeeting: number;
  warmReachToMeeting: number;
  meetingToDeal: number;
  dealToClose: number;
  warmAccountPct: number;
  crmYears: number;
  reactivationRate: number;
  reactivationDemoRate: number;
  reactivationWinRate: number;
  linkedinRoiGain: number;
  googleRoiGain: number;
}

const DEFAULT_RATES = {
  formFillRate: 1,
  formAbandonRate: 20,
  abandonToDemo: 50,
  demoToDeal: 50,
  dealWinRate: 40,
  coldReachToMeeting: 2,
  warmReachToMeeting: 8,
  meetingToDeal: 30,
  dealToClose: 40,
  warmAccountPct: 20,
  crmYears: 5,
  reactivationRate: 12,
  reactivationDemoRate: 30,
  reactivationWinRate: 25,
  linkedinRoiGain: 20,
  googleRoiGain: 10,
};

// ── formatting helpers ──────────────────────────────────────────────────────

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return Math.round(n).toLocaleString();
}

function pct(n: number) {
  return `${n}%`;
}

// ── ROI calculation ─────────────────────────────────────────────────────────

function calcROI(p: Params) {
  const annualTraffic = p.monthlyTraffic * 12;
  const annualFormFills = annualTraffic * (p.formFillRate / 100);

  // Warmbound
  const coldDeals = p.tam * (p.coldReachToMeeting / 100) * (p.meetingToDeal / 100) * (p.dealToClose / 100);
  const warmAccounts = p.tam * (p.warmAccountPct / 100);
  const warmDeals = warmAccounts * (p.warmReachToMeeting / 100) * (p.meetingToDeal / 100) * (p.dealToClose / 100);
  const warmboundUplift = Math.max(0, warmDeals - coldDeals) * p.acv;

  // Form abandonment
  const abandonedForms = annualFormFills * (p.formAbandonRate / 100);
  const formDemos = abandonedForms * (p.abandonToDemo / 100);
  const formDeals = formDemos * (p.demoToDeal / 100);
  const formWins = formDeals * (p.dealWinRate / 100);
  const formAbandonRevenue = formWins * p.acv;

  // CRM reactivation
  const crmLeads = annualFormFills * p.crmYears;
  const reactivatedLeads = crmLeads * (p.reactivationRate / 100);
  const reactivationDemos = reactivatedLeads * (p.reactivationDemoRate / 100);
  const reactivationWins = reactivationDemos * (p.reactivationWinRate / 100);
  const reactivationRevenue = reactivationWins * p.acv;

  // Ad efficiency
  const linkedinGain = p.linkedinAdSpend * 12 * (p.linkedinRoiGain / 100);
  const googleGain = p.googleAdSpend * 12 * (p.googleRoiGain / 100);

  const total = warmboundUplift + formAbandonRevenue + reactivationRevenue + linkedinGain + googleGain;

  return {
    total,
    warmbound: {
      value: warmboundUplift,
      steps: [
        `${fmtNum(p.tam)} TAM × ${pct(p.warmAccountPct)} showing intent = ${fmtNum(warmAccounts)} warm accounts`,
        `${fmtNum(warmAccounts)} × ${pct(p.warmReachToMeeting)} reach→meeting × ${pct(p.meetingToDeal)} →deal × ${pct(p.dealToClose)} close = ${fmtNum(warmDeals)} warm deals`,
        `Cold baseline: ${fmtNum(p.tam)} × ${pct(p.coldReachToMeeting)} × ${pct(p.meetingToDeal)} × ${pct(p.dealToClose)} = ${fmtNum(coldDeals)} deals`,
        `Uplift: (${fmtNum(warmDeals)} − ${fmtNum(coldDeals)}) × ${fmtMoney(p.acv)} ACV = ${fmtMoney(warmboundUplift)}`,
      ],
    },
    formAbandonment: {
      value: formAbandonRevenue,
      steps: [
        `${fmtNum(p.monthlyTraffic)}/mo × 12 = ${fmtNum(annualTraffic)} annual visitors`,
        `× ${pct(p.formFillRate)} form fill rate = ${fmtNum(annualFormFills)} form submissions/yr`,
        `× ${pct(p.formAbandonRate)} abandon rate = ${fmtNum(abandonedForms)} abandoned forms`,
        `× ${pct(p.abandonToDemo)} →demo = ${fmtNum(formDemos)} → × ${pct(p.demoToDeal)} →deal = ${fmtNum(formDeals)} → × ${pct(p.dealWinRate)} win = ${fmtNum(formWins)} closed`,
        `${fmtNum(formWins)} × ${fmtMoney(p.acv)} ACV = ${fmtMoney(formAbandonRevenue)}`,
      ],
    },
    reactivation: {
      value: reactivationRevenue,
      steps: [
        `${fmtNum(annualFormFills)} annual form fills × ${p.crmYears} yrs = ${fmtNum(crmLeads)} CRM leads`,
        `× ${pct(p.reactivationRate)} return to site = ${fmtNum(reactivatedLeads)} re-engaged leads`,
        `× ${pct(p.reactivationDemoRate)} demo rate = ${fmtNum(reactivationDemos)} demos`,
        `× ${pct(p.reactivationWinRate)} win rate = ${fmtNum(reactivationWins)} deals × ${fmtMoney(p.acv)} ACV = ${fmtMoney(reactivationRevenue)}`,
      ],
    },
    linkedin: {
      value: linkedinGain,
      steps: [
        `${fmtMoney(p.linkedinAdSpend)}/mo × 12 = ${fmtMoney(p.linkedinAdSpend * 12)} annual spend`,
        `× ${pct(p.linkedinRoiGain)} efficiency gain = ${fmtMoney(linkedinGain)}`,
      ],
    },
    google: {
      value: googleGain,
      steps: [
        `${fmtMoney(p.googleAdSpend)}/mo × 12 = ${fmtMoney(p.googleAdSpend * 12)} annual spend`,
        `× ${pct(p.googleRoiGain)} efficiency gain = ${fmtMoney(googleGain)}`,
      ],
    },
  };
}

// ── components ──────────────────────────────────────────────────────────────

function NumericInput({
  label,
  value,
  onChange,
  suffix = "",
  prefix = "",
  note,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  prefix?: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </label>
      <div className="flex items-center border border-gray-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
        {prefix && <span className="pl-3 text-gray-400 text-sm">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 px-3 py-2 text-sm text-gray-900 bg-transparent outline-none min-w-0"
        />
        {suffix && <span className="pr-3 text-gray-400 text-sm">{suffix}</span>}
      </div>
      {note && <p className="text-xs text-gray-400 italic leading-relaxed">{note}</p>}
    </div>
  );
}

function RoiRow({ label, value, steps }: { label: string; value: number; steps: string[] }) {
  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-4 mb-2">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <span className="text-sm font-bold text-gray-900 shrink-0">{fmtMoney(value)}</span>
      </div>
      <div className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-xs text-gray-400 shrink-0 mt-0.5">{i + 1}.</span>
            <p className="text-xs font-mono text-gray-600">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const CONFIDENCE_COLORS = {
  high: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-red-100 text-red-700",
};

const CACHE_KEY = "roi_research_cache";

function loadCache(): Record<string, ResearchData> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveCache(domain: string, data: ResearchData) {
  try {
    const cache = loadCache();
    cache[domain.toLowerCase().trim()] = data;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage unavailable — silently skip
  }
}

// ── page ────────────────────────────────────────────────────────────────────

export default function Home() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [research, setResearch] = useState<ResearchData | null>(null);
  const [params, setParams] = useState<Params | null>(null);
  const [fromCache, setFromCache] = useState(false);

  async function handleResearch() {
    const key = domain.trim().toLowerCase();
    if (!key) return;

    setLoading(true);
    setError("");
    setResearch(null);
    setParams(null);
    setFromCache(false);

    // Check cache first
    const cached = loadCache()[key];
    if (cached) {
      setResearch(cached);
      setParams({ monthlyTraffic: cached.monthlyTraffic, acv: cached.acv, tam: cached.tam, linkedinAdSpend: cached.linkedinAdSpend, googleAdSpend: cached.googleAdSpend, ...DEFAULT_RATES });
      setFromCache(true);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Research failed");

      saveCache(key, data);
      setResearch(data);
      setParams({ monthlyTraffic: data.monthlyTraffic, acv: data.acv, tam: data.tam, linkedinAdSpend: data.linkedinAdSpend, googleAdSpend: data.googleAdSpend, ...DEFAULT_RATES });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function set(key: keyof Params) {
    return (v: number) => setParams((p) => (p ? { ...p, [key]: v } : p));
  }

  const roi = params ? calcROI(params) : null;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">factors.ai ROI Calculator</h1>
          <p className="text-gray-500 mt-1">Enter a prospect&apos;s domain to research their metrics and estimate ROI.</p>
        </div>

        {/* Domain input */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="e.g. hubspot.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResearch()}
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleResearch}
              disabled={loading || !domain.trim()}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Researching..." : "Research"}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </div>

        {research && params && roi && (
          <>
            {/* Company summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-gray-900">{research.companyName}</h2>
                    {fromCache && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">cached</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mt-1">{research.description}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${CONFIDENCE_COLORS[research.confidence]}`}>
                  {research.confidence} confidence
                </span>
              </div>
              {research.citations.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Sources</p>
                  <div className="flex flex-col gap-1">
                    {research.citations.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:text-blue-700 hover:underline truncate">
                        {url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Parameters */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-1">Company Metrics</h3>
              <p className="text-xs text-gray-400 mb-5">Pre-filled from AI research — edit any value to recalculate.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <NumericInput label="Monthly Traffic" value={params.monthlyTraffic} onChange={set("monthlyTraffic")} note={research.monthlyTrafficNote} />
                <NumericInput label="ACV (USD/year)" value={params.acv} onChange={set("acv")} prefix="$" note={research.acvNote} />
                <NumericInput label="TAM (Target Accounts)" value={params.tam} onChange={set("tam")} note={research.tamNote} />
                <NumericInput label="LinkedIn Ads / Month" value={params.linkedinAdSpend} onChange={set("linkedinAdSpend")} prefix="$" note={research.linkedinAdSpendNote} />
                <NumericInput label="Google Ads / Month" value={params.googleAdSpend} onChange={set("googleAdSpend")} prefix="$" note={research.googleAdSpendNote} />
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">Conversion Rates</h3>
              <p className="text-xs text-gray-400 mb-5">Industry defaults — adjust to match the prospect.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <NumericInput label="Form Fill Rate" value={params.formFillRate} onChange={set("formFillRate")} suffix="%" note="B2B SaaS average is 1–3% of site traffic. Source: Unbounce Conversion Benchmark Report." />
                <NumericInput label="Form Abandon Rate" value={params.formAbandonRate} onChange={set("formAbandonRate")} suffix="%" note="~20% of visitors start but don't complete forms. Source: Formstack Form Conversion Report." />
                <NumericInput label="Abandon → Demo" value={params.abandonToDemo} onChange={set("abandonToDemo")} suffix="%" note="Form starters show high intent; estimated 50% can be converted to a demo with timely follow-up." />
                <NumericInput label="Demo → Deal" value={params.demoToDeal} onChange={set("demoToDeal")} suffix="%" note="Mid-market B2B SaaS benchmark: 40–60% demo-to-opportunity rate. Source: OpenView SaaS Benchmarks." />
                <NumericInput label="Deal Win Rate" value={params.dealWinRate} onChange={set("dealWinRate")} suffix="%" note="Typical B2B SaaS win rate is 20–50%. Source: HubSpot State of Sales Report." />
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">Outbound Rates</h3>
              <p className="text-xs text-gray-400 mb-5">Cold vs warm outreach performance.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <NumericInput label="Cold Reach → Meeting" value={params.coldReachToMeeting} onChange={set("coldReachToMeeting")} suffix="%" note="Industry average cold outbound reach-to-meeting rate is 1–3%. Source: Outreach.io / SalesLoft benchmarks." />
                <NumericInput label="Warm Reach → Meeting" value={params.warmReachToMeeting} onChange={set("warmReachToMeeting")} suffix="%" note="Intent-based outreach sees 3–5x higher response rates vs cold. Source: Demandbase / 6sense research." />
                <NumericInput label="Meeting → Deal" value={params.meetingToDeal} onChange={set("meetingToDeal")} suffix="%" note="B2B SaaS average meeting-to-opportunity conversion is 25–35%. Source: Salesforce State of Sales." />
                <NumericInput label="Deal → Close" value={params.dealToClose} onChange={set("dealToClose")} suffix="%" note="Standard B2B pipeline close rate is 30–50%. Source: Salesforce benchmarks." />
                <NumericInput label="Warm Account %" value={params.warmAccountPct} onChange={set("warmAccountPct")} suffix="%" note="At any given time, ~20% of your TAM is in an active buying cycle. Source: Gartner B2B Buying Research." />
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">CRM Reactivation</h3>
              <p className="text-xs text-gray-400 mb-5">Old leads returning to the website.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <NumericInput label="CRM Lead History" value={params.crmYears} onChange={set("crmYears")} suffix="yrs" note="Standard lookback window for lead reactivation programs. Longer = larger pool but lower recency." />
                <NumericInput label="Return to Site Rate" value={params.reactivationRate} onChange={set("reactivationRate")} suffix="%" note="10–15% of historical leads revisit the website within a year. Source: factors.ai platform data." />
                <NumericInput label="Reactivation Demo Rate" value={params.reactivationDemoRate} onChange={set("reactivationDemoRate")} suffix="%" note="Re-engaged leads with prior intent convert to demos at a higher rate than cold traffic." />
                <NumericInput label="Reactivation Win Rate" value={params.reactivationWinRate} onChange={set("reactivationWinRate")} suffix="%" note="Returning leads already familiar with the product have higher close rates than net-new prospects." />
                <NumericInput label="LinkedIn ROI Gain" value={params.linkedinRoiGain} onChange={set("linkedinRoiGain")} suffix="%" note="Audience refinement via intent data typically yields 15–25% improvement. Source: LinkedIn Marketing Solutions case studies." />
                <NumericInput label="Google ROI Gain" value={params.googleRoiGain} onChange={set("googleRoiGain")} suffix="%" note="Smart bidding + audience exclusion yields 8–12% efficiency gains. Source: Google Ads performance benchmarks." />
              </div>
            </div>

            {/* ROI Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-5">Estimated Annual ROI</h3>
              <RoiRow label="Warmbound Sales Uplift" value={roi.warmbound.value} steps={roi.warmbound.steps} />
              <RoiRow label="Form Abandonment Recovery" value={roi.formAbandonment.value} steps={roi.formAbandonment.steps} />
              <RoiRow label="CRM Lead Reactivation" value={roi.reactivation.value} steps={roi.reactivation.steps} />
              <RoiRow label="LinkedIn Ads Efficiency" value={roi.linkedin.value} steps={roi.linkedin.steps} />
              <RoiRow label="Google Ads Efficiency" value={roi.google.value} steps={roi.google.steps} />
              <div className="border-t border-gray-200 pt-4 mt-2 flex items-center justify-between">
                <span className="font-semibold text-gray-900">Total Annual ROI</span>
                <span className="text-2xl font-bold text-blue-600">{fmtMoney(roi.total)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
