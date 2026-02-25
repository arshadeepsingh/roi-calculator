"use client";

import { useState } from "react";

// ── types ────────────────────────────────────────────────────────────────────

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

// ── defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_RATES = {
  formFillRate: 0.5,         // Conservative: 0.5% — accounts for non-ICP traffic on large sites. Source: First Page Sage
  formAbandonRate: 67,       // Industry avg: 67–70%. Source: Formstack 2025, Feathery
  abandonToDemo: 5,          // 5–8% of recovered contacts book a demo. Source: Insiteful
  demoToDeal: 30,            // Conservative end of 30–35%. Source: Operatix 500+ campaigns
  dealWinRate: 20,           // Mid-market B2B avg: 20–22%. Source: HubSpot 2024, Pavilion/Ebsta
  coldReachToMeeting: 2,     // ~1–2% blended. Source: SalesLoft, Gradient Works
  warmReachToMeeting: 10,    // ~5x cold. Intent-triggered outreach. Source: Demandbase, 6sense
  meetingToDeal: 40,         // Conservative end of 40–50%. Source: Operatix 10-yr avg
  dealToClose: 20,           // Same as win rate for deal stage
  warmAccountPct: 15,        // Accounts showing intent signals (broader than in-market). Source: Bombora, 6sense
  crmYears: 5,
  reactivationRate: 10,      // Low end of 10–15%. Source: Mixed Media Ventures
  reactivationDemoRate: 7,   // Mid of 5–10%. Source: Mutare, Intelemark
  reactivationWinRate: 15,   // Conservative end of 15–20%. Source: Mixed Media Ventures
  linkedinRoiGain: 20,
  googleRoiGain: 10,
};

// ── helpers ──────────────────────────────────────────────────────────────────

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

function pct(n: number) { return `${n}%`; }

// ── calculation ───────────────────────────────────────────────────────────────

function calcROI(p: Params) {
  const annualTraffic = p.monthlyTraffic * 12;
  const annualFormFills = annualTraffic * (p.formFillRate / 100);

  // Warmbound uplift: factors.ai identifies warm accounts so you reach them at warm rate
  // instead of cold. Uplift = warm_accounts × (warm_reach − cold_reach) × meeting→deal
  const warmAccounts = p.tam * (p.warmAccountPct / 100);
  const reachRateDelta = (p.warmReachToMeeting - p.coldReachToMeeting) / 100;
  const warmboundPipelineDeals = warmAccounts * reachRateDelta * (p.meetingToDeal / 100);
  const warmboundPipeline = warmboundPipelineDeals * p.acv;
  const warmboundRevenue = warmboundPipeline * (p.dealToClose / 100);
  // For step display
  const coldDealsFromWarm = warmAccounts * (p.coldReachToMeeting / 100) * (p.meetingToDeal / 100);

  const abandonedForms = annualFormFills * (p.formAbandonRate / 100);
  const formDemos = abandonedForms * (p.abandonToDemo / 100);
  const formDeals = formDemos * (p.demoToDeal / 100);
  const formPipeline = formDeals * p.acv;
  const formWins = formDeals * (p.dealWinRate / 100);
  const formRevenue = formWins * p.acv;

  const crmLeads = annualFormFills * p.crmYears;
  const reactivatedLeads = crmLeads * (p.reactivationRate / 100);
  const reactivationDemos = reactivatedLeads * (p.reactivationDemoRate / 100);
  const reactivationPipelineDeals = reactivationDemos * (p.demoToDeal / 100); // demo→deal, same as form abandonment
  const reactivationPipeline = reactivationPipelineDeals * p.acv;
  const reactivationWins = reactivationPipelineDeals * (p.reactivationWinRate / 100);
  const reactivationRevenue = reactivationWins * p.acv;

  const linkedinSavings = p.linkedinAdSpend * 12 * (p.linkedinRoiGain / 100);
  const googleSavings = p.googleAdSpend * 12 * (p.googleRoiGain / 100);

  return {
    totalPipeline: warmboundPipeline + formPipeline + reactivationPipeline,
    totalRevenue: warmboundRevenue + formRevenue + reactivationRevenue,
    totalAdSavings: linkedinSavings + googleSavings,
    warmbound: {
      pipeline: warmboundPipeline, revenue: warmboundRevenue,
      steps: [
        `${fmtNum(p.tam)} TAM × ${pct(p.warmAccountPct)} showing intent = ${fmtNum(warmAccounts)} warm accounts`,
        `Without factors.ai: ${fmtNum(warmAccounts)} × ${pct(p.coldReachToMeeting)} cold reach × ${pct(p.meetingToDeal)} →deal = ${fmtNum(coldDealsFromWarm)} deals`,
        `With factors.ai: ${fmtNum(warmAccounts)} × ${pct(p.warmReachToMeeting)} warm reach × ${pct(p.meetingToDeal)} →deal = ${fmtNum(warmboundPipelineDeals)} deals`,
        `Uplift: ${fmtNum(warmboundPipelineDeals)} − ${fmtNum(coldDealsFromWarm)} = ${fmtNum(warmboundPipelineDeals - coldDealsFromWarm)} extra deals × ${fmtMoney(p.acv)} ACV = ${fmtMoney(warmboundPipeline)}`,
        `Revenue: ${fmtMoney(warmboundPipeline)} × ${pct(p.dealToClose)} win rate = ${fmtMoney(warmboundRevenue)}`,
      ],
    },
    formAbandonment: {
      pipeline: formPipeline, revenue: formRevenue,
      steps: [
        `${fmtNum(p.monthlyTraffic)}/mo × 12 = ${fmtNum(annualTraffic)} annual visitors`,
        `× ${pct(p.formFillRate)} form fill = ${fmtNum(annualFormFills)} submissions → × ${pct(p.formAbandonRate)} abandoned = ${fmtNum(abandonedForms)}`,
        `× ${pct(p.abandonToDemo)} →demo = ${fmtNum(formDemos)} → × ${pct(p.demoToDeal)} →deal = ${fmtNum(formDeals)} deals`,
        `Pipeline: ${fmtNum(formDeals)} × ${fmtMoney(p.acv)} ACV = ${fmtMoney(formPipeline)}`,
        `Revenue: ${fmtNum(formDeals)} × ${pct(p.dealWinRate)} win rate = ${fmtNum(formWins)} won × ${fmtMoney(p.acv)} = ${fmtMoney(formRevenue)}`,
      ],
    },
    reactivation: {
      pipeline: reactivationPipeline, revenue: reactivationRevenue,
      steps: [
        `${fmtNum(annualFormFills)} annual form fills × ${p.crmYears} yrs = ${fmtNum(crmLeads)} CRM leads`,
        `× ${pct(p.reactivationRate)} return to site = ${fmtNum(reactivatedLeads)} re-engaged`,
        `× ${pct(p.reactivationDemoRate)} demo rate = ${fmtNum(reactivationDemos)} demos`,
        `× ${pct(p.demoToDeal)} demo→deal = ${fmtNum(reactivationPipelineDeals)} pipeline deals × ${fmtMoney(p.acv)} ACV = ${fmtMoney(reactivationPipeline)}`,
        `Revenue: ${fmtNum(reactivationPipelineDeals)} × ${pct(p.reactivationWinRate)} win = ${fmtNum(reactivationWins)} won × ${fmtMoney(p.acv)} = ${fmtMoney(reactivationRevenue)}`,
      ],
    },
    linkedin: {
      savings: linkedinSavings,
      steps: [
        `${fmtMoney(p.linkedinAdSpend)}/mo × 12 = ${fmtMoney(p.linkedinAdSpend * 12)} annual spend`,
        `× ${pct(p.linkedinRoiGain)} efficiency gain = ${fmtMoney(linkedinSavings)} saved`,
      ],
    },
    google: {
      savings: googleSavings,
      steps: [
        `${fmtMoney(p.googleAdSpend)}/mo × 12 = ${fmtMoney(p.googleAdSpend * 12)} annual spend`,
        `× ${pct(p.googleRoiGain)} efficiency gain = ${fmtMoney(googleSavings)} saved`,
      ],
    },
  };
}

// ── cache ─────────────────────────────────────────────────────────────────────

const CACHE_KEY = "roi_research_cache_v3";

function loadCache(): Record<string, ResearchData> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}"); }
  catch { return {}; }
}

function saveCache(domain: string, data: ResearchData) {
  try {
    const cache = loadCache();
    cache[domain] = data;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* silently skip */ }
}

// ── components ────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
      {children}
    </p>
  );
}

function ParamRow({
  label, note, value, onChange, prefix = "", suffix = "",
}: {
  label: string; note?: string; value: number;
  onChange: (v: number) => void; prefix?: string; suffix?: string;
}) {
  return (
    <div className="flex items-start justify-between py-3.5 border-b border-gray-100 last:border-0 gap-6">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{label}</p>
        {note && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{note}</p>}
      </div>
      <div className="flex items-center border border-gray-200 rounded-md focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900 shrink-0 bg-white">
        {prefix && <span className="pl-2.5 text-gray-400 text-sm select-none">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-28 px-2.5 py-1.5 text-sm text-gray-900 bg-transparent outline-none"
        />
        {suffix && <span className="pr-2.5 text-gray-400 text-sm select-none">{suffix}</span>}
      </div>
    </div>
  );
}

function SalesRow({ label, pipeline, revenue, steps }: {
  label: string; pipeline: number; revenue: number; steps: string[];
}) {
  return (
    <div className="py-5 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-4 mb-3">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <div className="flex gap-6 shrink-0">
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">Pipeline</p>
            <p className="text-sm font-semibold text-gray-900">{fmtMoney(pipeline)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">Revenue</p>
            <p className="text-sm font-semibold text-gray-900">{fmtMoney(revenue)}</p>
          </div>
        </div>
      </div>
      <div className="space-y-1">
        {steps.map((step, i) => (
          <p key={i} className="text-xs text-gray-400 font-mono leading-relaxed">{step}</p>
        ))}
      </div>
    </div>
  );
}

function SavingsRow({ label, savings, steps }: {
  label: string; savings: number; steps: string[];
}) {
  return (
    <div className="py-5 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-4 mb-3">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-400 mb-0.5">Ad Savings</p>
          <p className="text-sm font-semibold text-gray-900">{fmtMoney(savings)}</p>
        </div>
      </div>
      <div className="space-y-1">
        {steps.map((step, i) => (
          <p key={i} className="text-xs text-gray-400 font-mono leading-relaxed">{step}</p>
        ))}
      </div>
    </div>
  );
}

const CONFIDENCE_BADGE: Record<string, string> = {
  high: "text-emerald-600 bg-emerald-50",
  medium: "text-amber-600 bg-amber-50",
  low: "text-red-500 bg-red-50",
};

// ── page ──────────────────────────────────────────────────────────────────────

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
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">factors.ai</p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">ROI Calculator</h1>
          <p className="text-gray-400 mt-2 text-sm">Enter a prospect&apos;s domain. We research their metrics and estimate what factors.ai unlocks.</p>
        </div>

        {/* Domain input */}
        <div className="flex gap-3 mb-2">
          <input
            type="text"
            placeholder="hubspot.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleResearch()}
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
          />
          <button
            onClick={handleResearch}
            disabled={loading || !domain.trim()}
            className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {loading ? "Researching…" : "Get ROI"}
          </button>
        </div>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

        {/* Results */}
        {research && params && roi && (
          <div className="mt-14 space-y-14">

            {/* Company */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-semibold text-gray-900">{research.companyName}</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CONFIDENCE_BADGE[research.confidence]}`}>
                  {research.confidence} confidence
                </span>
                {fromCache && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">cached</span>
                )}
              </div>
              <p className="text-sm text-gray-500">{research.description}</p>
            </div>

            {/* Hero totals */}
            <div>
              <SectionLabel>Estimated Annual Impact</SectionLabel>
              <div className="grid grid-cols-3 divide-x divide-gray-100">
                <div className="pr-8">
                  <p className="text-xs text-gray-400 mb-2">Total Pipeline</p>
                  <p className="text-4xl font-semibold tracking-tight text-gray-900">{fmtMoney(roi.totalPipeline)}</p>
                </div>
                <div className="px-8">
                  <p className="text-xs text-gray-400 mb-2">Revenue Impact</p>
                  <p className="text-4xl font-semibold tracking-tight text-gray-900">{fmtMoney(roi.totalRevenue)}</p>
                </div>
                <div className="pl-8">
                  <p className="text-xs text-gray-400 mb-2">Ad Savings</p>
                  <p className="text-4xl font-semibold tracking-tight text-gray-900">{fmtMoney(roi.totalAdSavings)}</p>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div>
              <SectionLabel>Breakdown</SectionLabel>
              <div className="border-t border-gray-100">
                <SalesRow label="Warmbound Sales Uplift" pipeline={roi.warmbound.pipeline} revenue={roi.warmbound.revenue} steps={roi.warmbound.steps} />
                <SalesRow label="Form Abandonment Recovery" pipeline={roi.formAbandonment.pipeline} revenue={roi.formAbandonment.revenue} steps={roi.formAbandonment.steps} />
                <SalesRow label="CRM Lead Reactivation" pipeline={roi.reactivation.pipeline} revenue={roi.reactivation.revenue} steps={roi.reactivation.steps} />
                <SavingsRow label="LinkedIn Ads Efficiency" savings={roi.linkedin.savings} steps={roi.linkedin.steps} />
                <SavingsRow label="Google Ads Efficiency" savings={roi.google.savings} steps={roi.google.steps} />
              </div>
            </div>

            {/* Parameters */}
            <div>
              <SectionLabel>Assumptions</SectionLabel>
              <p className="text-xs text-gray-400 mb-6">All values are editable — changes recalculate instantly.</p>

              <p className="text-xs font-medium text-gray-500 mb-1">Company metrics</p>
              <div className="border-t border-gray-100">
                <ParamRow label="Monthly Traffic" note={research.monthlyTrafficNote} value={params.monthlyTraffic} onChange={set("monthlyTraffic")} />
                <ParamRow label="Annual Contract Value" note={research.acvNote} value={params.acv} onChange={set("acv")} prefix="$" />
                <ParamRow label="Total Addressable Market" note={research.tamNote} value={params.tam} onChange={set("tam")} suffix=" co." />
                <ParamRow label="LinkedIn Ads / Month" note={research.linkedinAdSpendNote} value={params.linkedinAdSpend} onChange={set("linkedinAdSpend")} prefix="$" />
                <ParamRow label="Google Ads / Month" note={research.googleAdSpendNote} value={params.googleAdSpend} onChange={set("googleAdSpend")} prefix="$" />
              </div>

              <p className="text-xs font-medium text-gray-500 mt-8 mb-1">Conversion rates</p>
              <div className="border-t border-gray-100">
                <ParamRow label="Form Fill Rate" note="0.5% conservative — large sites have significant non-ICP traffic (customers, partners, jobseekers). Pure ICP traffic converts 1–2%. Source: First Page Sage." value={params.formFillRate} onChange={set("formFillRate")} suffix="%" />
                <ParamRow label="Form Abandon Rate" note="Industry average is 67–70%. Even optimised forms see 50–60% abandonment. Source: Formstack 2025." value={params.formAbandonRate} onChange={set("formAbandonRate")} suffix="%" />
                <ParamRow label="Abandon → Demo" note="Of recovered contacts, 5–8% book a demo. Source: Insiteful, practitioner benchmarks." value={params.abandonToDemo} onChange={set("abandonToDemo")} suffix="%" />
                <ParamRow label="Demo → Deal" note="Conservative end of 30–35% for mid-market. Source: Operatix 500+ SDR campaigns." value={params.demoToDeal} onChange={set("demoToDeal")} suffix="%" />
                <ParamRow label="Deal Win Rate" note="Mid-market B2B average: 20–22%. Source: HubSpot 2024, Pavilion/Ebsta 4.2M opportunity study." value={params.dealWinRate} onChange={set("dealWinRate")} suffix="%" />
              </div>

              <p className="text-xs font-medium text-gray-500 mt-8 mb-1">Outbound rates</p>
              <div className="border-t border-gray-100">
                <ParamRow label="Cold Reach → Meeting" note="~1–2% blended across email and calls. Source: SalesLoft, Gradient Works SDR Benchmarks 2024." value={params.coldReachToMeeting} onChange={set("coldReachToMeeting")} suffix="%" />
                <ParamRow label="Warm Reach → Meeting" note="Conservative 3x uplift over cold (range: 3–5x). Source: Demandbase, 6sense intent data." value={params.warmReachToMeeting} onChange={set("warmReachToMeeting")} suffix="%" />
                <ParamRow label="Meeting → Deal" note="Conservative end of 40–50%. Operatix 10-yr avg (500+ campaigns) is 52.7%." value={params.meetingToDeal} onChange={set("meetingToDeal")} suffix="%" />
                <ParamRow label="Deal → Close" note="Mid-market B2B average: 20–22%. Source: HubSpot 2024, Pavilion/Ebsta." value={params.dealToClose} onChange={set("dealToClose")} suffix="%" />
                <ParamRow label="% of TAM Showing Intent" note="~15% of TAM shows measurable intent signals at any time (broader than active buying cycle). Source: Bombora, 6sense intent data." value={params.warmAccountPct} onChange={set("warmAccountPct")} suffix="%" />
              </div>

              <p className="text-xs font-medium text-gray-500 mt-8 mb-1">CRM reactivation</p>
              <div className="border-t border-gray-100">
                <ParamRow label="CRM Lead History" note="Lookback window for reactivation. Longer = larger pool but lower recency signal." value={params.crmYears} onChange={set("crmYears")} suffix=" yrs" />
                <ParamRow label="Return to Site Rate" note="Conservative: 10% of dormant leads return within 12 months. Source: Mixed Media Ventures." value={params.reactivationRate} onChange={set("reactivationRate")} suffix="%" />
                <ParamRow label="Reactivation Demo Rate" note="5–10% of re-engaged contacts book a demo. Familiarity helps but timing is uncertain. Source: Mutare." value={params.reactivationDemoRate} onChange={set("reactivationDemoRate")} suffix="%" />
                <ParamRow label="Reactivation Win Rate" note="Conservative end of 15–20%. Source: Mixed Media Ventures, Adonis Media." value={params.reactivationWinRate} onChange={set("reactivationWinRate")} suffix="%" />
              </div>

              <p className="text-xs font-medium text-gray-500 mt-8 mb-1">Ad efficiency</p>
              <div className="border-t border-gray-100">
                <ParamRow label="LinkedIn ROI Gain" note="Audience refinement via intent data yields 15–25% improvement. Source: LinkedIn Marketing Solutions." value={params.linkedinRoiGain} onChange={set("linkedinRoiGain")} suffix="%" />
                <ParamRow label="Google ROI Gain" note="Smart bidding + audience exclusion yields 8–12% efficiency gains. Source: Google Ads benchmarks." value={params.googleRoiGain} onChange={set("googleRoiGain")} suffix="%" />
              </div>
            </div>

            {/* Citations */}
            {research.citations.length > 0 && (
              <div>
                <SectionLabel>Sources</SectionLabel>
                <div className="space-y-2">
                  {research.citations.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="block text-xs text-gray-400 hover:text-gray-900 truncate transition-colors">
                      {url}
                    </a>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </main>
  );
}
