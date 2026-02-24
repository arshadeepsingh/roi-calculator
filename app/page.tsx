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
  formFillRate: 1,          // B2B SaaS conservative floor: 1–2%. Source: First Page Sage, Chili Piper 2025
  formAbandonRate: 67,      // Industry average: 67–70%. Source: Formstack 2025, Feathery 150-form study
  abandonToDemo: 5,         // Post-recovery follow-up: 5–8% book a demo. Source: Insiteful, practitioner data
  demoToDeal: 30,           // Conservative end of 30–35% range. Source: Operatix 500+ campaigns, Chili Piper
  dealWinRate: 20,          // Mid-market B2B average: 20–22%. Source: HubSpot 2024, Pavilion/Ebsta
  coldReachToMeeting: 2,    // ~1–2% cold email+call blended. Source: SalesLoft, Gradient Works
  warmReachToMeeting: 6,    // ~3x cold (conservative end of 3–5x). Source: Demandbase, 6sense
  meetingToDeal: 40,        // Conservative end of 40–50%. Source: Operatix 52.7% avg, Gartner
  dealToClose: 20,          // Same as win rate — deal stage to closed won
  warmAccountPct: 5,        // Ehrenberg-Bass 95:5 rule: only 5% of TAM in active buying cycle at any time
  crmYears: 5,
  reactivationRate: 10,     // Low end of 10–15% returning. Source: Mixed Media Ventures, practitioner data
  reactivationDemoRate: 7,  // Mid of 5–10% re-engaged → demo. Source: Mutare, Intelemark reactivation studies
  reactivationWinRate: 15,  // Conservative end of 15–20%. Source: Mixed Media Ventures, Adonis Media
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

  // Warmbound — pipeline stops before dealToClose (win rate)
  const coldPipeline = p.tam * (p.coldReachToMeeting / 100) * (p.meetingToDeal / 100);
  const warmAccounts = p.tam * (p.warmAccountPct / 100);
  const warmPipeline = warmAccounts * (p.warmReachToMeeting / 100) * (p.meetingToDeal / 100);
  const warmboundPipeline = Math.max(0, warmPipeline - coldPipeline) * p.acv;
  const warmboundRevenue = warmboundPipeline * (p.dealToClose / 100);

  // Form abandonment — pipeline stops before dealWinRate
  const abandonedForms = annualFormFills * (p.formAbandonRate / 100);
  const formDemos = abandonedForms * (p.abandonToDemo / 100);
  const formDeals = formDemos * (p.demoToDeal / 100);
  const formPipeline = formDeals * p.acv;
  const formWins = formDeals * (p.dealWinRate / 100);
  const formRevenue = formWins * p.acv;

  // CRM reactivation — pipeline stops before reactivationWinRate
  const crmLeads = annualFormFills * p.crmYears;
  const reactivatedLeads = crmLeads * (p.reactivationRate / 100);
  const reactivationDemos = reactivatedLeads * (p.reactivationDemoRate / 100);
  const reactivationPipeline = reactivationDemos * p.acv;
  const reactivationWins = reactivationDemos * (p.reactivationWinRate / 100);
  const reactivationRevenue = reactivationWins * p.acv;

  // Ad savings (not pipeline/revenue — treated separately)
  const linkedinSavings = p.linkedinAdSpend * 12 * (p.linkedinRoiGain / 100);
  const googleSavings = p.googleAdSpend * 12 * (p.googleRoiGain / 100);

  const totalPipeline = warmboundPipeline + formPipeline + reactivationPipeline;
  const totalRevenue = warmboundRevenue + formRevenue + reactivationRevenue;
  const totalAdSavings = linkedinSavings + googleSavings;

  return {
    totalPipeline,
    totalRevenue,
    totalAdSavings,
    warmbound: {
      pipeline: warmboundPipeline,
      revenue: warmboundRevenue,
      steps: [
        `${fmtNum(p.tam)} TAM × ${pct(p.warmAccountPct)} showing intent = ${fmtNum(warmAccounts)} warm accounts`,
        `Warm pipeline: ${fmtNum(warmAccounts)} × ${pct(p.warmReachToMeeting)} reach→meeting × ${pct(p.meetingToDeal)} →deal = ${fmtNum(warmPipeline)} deals`,
        `Cold baseline: ${fmtNum(p.tam)} × ${pct(p.coldReachToMeeting)} × ${pct(p.meetingToDeal)} = ${fmtNum(coldPipeline)} deals`,
        `Pipeline uplift: (${fmtNum(warmPipeline)} − ${fmtNum(coldPipeline)}) × ${fmtMoney(p.acv)} ACV = ${fmtMoney(warmboundPipeline)}`,
        `Revenue: ${fmtMoney(warmboundPipeline)} × ${pct(p.dealToClose)} win rate = ${fmtMoney(warmboundRevenue)}`,
      ],
    },
    formAbandonment: {
      pipeline: formPipeline,
      revenue: formRevenue,
      steps: [
        `${fmtNum(p.monthlyTraffic)}/mo × 12 = ${fmtNum(annualTraffic)} annual visitors`,
        `× ${pct(p.formFillRate)} form fill = ${fmtNum(annualFormFills)} submissions → × ${pct(p.formAbandonRate)} abandoned = ${fmtNum(abandonedForms)}`,
        `× ${pct(p.abandonToDemo)} →demo = ${fmtNum(formDemos)} → × ${pct(p.demoToDeal)} →deal = ${fmtNum(formDeals)} deals`,
        `Pipeline: ${fmtNum(formDeals)} × ${fmtMoney(p.acv)} ACV = ${fmtMoney(formPipeline)}`,
        `Revenue: ${fmtNum(formDeals)} × ${pct(p.dealWinRate)} win rate = ${fmtNum(formWins)} won × ${fmtMoney(p.acv)} = ${fmtMoney(formRevenue)}`,
      ],
    },
    reactivation: {
      pipeline: reactivationPipeline,
      revenue: reactivationRevenue,
      steps: [
        `${fmtNum(annualFormFills)} annual form fills × ${p.crmYears} yrs = ${fmtNum(crmLeads)} CRM leads`,
        `× ${pct(p.reactivationRate)} return to site = ${fmtNum(reactivatedLeads)} re-engaged`,
        `× ${pct(p.reactivationDemoRate)} demo rate = ${fmtNum(reactivationDemos)} demos`,
        `Pipeline: ${fmtNum(reactivationDemos)} × ${fmtMoney(p.acv)} ACV = ${fmtMoney(reactivationPipeline)}`,
        `Revenue: ${fmtNum(reactivationDemos)} × ${pct(p.reactivationWinRate)} win rate = ${fmtNum(reactivationWins)} won × ${fmtMoney(p.acv)} = ${fmtMoney(reactivationRevenue)}`,
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

function SalesRow({ label, pipeline, revenue, steps }: { label: string; pipeline: number; revenue: number; steps: string[] }) {
  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-4 mb-3">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <div className="flex gap-4 shrink-0 text-right">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Pipeline</p>
            <p className="text-sm font-bold text-indigo-600">{fmtMoney(pipeline)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Revenue</p>
            <p className="text-sm font-bold text-green-600">{fmtMoney(revenue)}</p>
          </div>
        </div>
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

function SavingsRow({ label, savings, steps }: { label: string; savings: number; steps: string[] }) {
  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-4 mb-3">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <div className="shrink-0 text-right">
          <p className="text-xs text-gray-400 mb-0.5">Ad Savings</p>
          <p className="text-sm font-bold text-amber-600">{fmtMoney(savings)}</p>
        </div>
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
                <NumericInput label="Form Fill Rate" value={params.formFillRate} onChange={set("formFillRate")} suffix="%" note="Conservative floor: 1–2% of all traffic. Source: First Page Sage B2B SaaS Funnel Benchmarks, Chili Piper 2025." />
                <NumericInput label="Form Abandon Rate" value={params.formAbandonRate} onChange={set("formAbandonRate")} suffix="%" note="Industry average is 67–70%. Even optimised forms with 3–5 fields see 50–60% abandonment. Source: Formstack 2025, Feathery." />
                <NumericInput label="Abandon → Demo" value={params.abandonToDemo} onChange={set("abandonToDemo")} suffix="%" note="Of recovered abandon contacts, 5–8% book a demo. Intent signal is weak — they left. Source: Insiteful, practitioner benchmarks." />
                <NumericInput label="Demo → Deal" value={params.demoToDeal} onChange={set("demoToDeal")} suffix="%" note="Conservative end of 30–35% range for mid-market. Source: Operatix 500+ SDR campaigns, Chili Piper 2025." />
                <NumericInput label="Deal Win Rate" value={params.dealWinRate} onChange={set("dealWinRate")} suffix="%" note="Mid-market B2B average is 20–22%. Source: HubSpot 2024 Sales Trends, Pavilion/Ebsta 4.2M opportunity study." />
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">Outbound Rates</h3>
              <p className="text-xs text-gray-400 mb-5">Cold vs warm outreach performance.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <NumericInput label="Cold Reach → Meeting" value={params.coldReachToMeeting} onChange={set("coldReachToMeeting")} suffix="%" note="~1–2% blended across email and calls. Source: SalesLoft, Gradient Works SDR Benchmarks 2024." />
                <NumericInput label="Warm Reach → Meeting" value={params.warmReachToMeeting} onChange={set("warmReachToMeeting")} suffix="%" note="Conservative 3x uplift over cold (3–5x range). Source: Demandbase warm outbound guide, 6sense intent data." />
                <NumericInput label="Meeting → Deal" value={params.meetingToDeal} onChange={set("meetingToDeal")} suffix="%" note="Conservative end of 40–50%. Operatix 10-yr dataset (500+ campaigns) shows 52.7% average. Source: Operatix, Gartner." />
                <NumericInput label="Deal → Close" value={params.dealToClose} onChange={set("dealToClose")} suffix="%" note="Same rate as win rate. Mid-market B2B average: 20–22%. Source: HubSpot 2024, Pavilion/Ebsta." />
                <NumericInput label="Warm Account %" value={params.warmAccountPct} onChange={set("warmAccountPct")} suffix="%" note="Only ~5% of your TAM is in an active buying cycle at any time — the Ehrenberg-Bass 95:5 Rule. Source: Forrester, Gartner." />
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">CRM Reactivation</h3>
              <p className="text-xs text-gray-400 mb-5">Old leads returning to the website.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <NumericInput label="CRM Lead History" value={params.crmYears} onChange={set("crmYears")} suffix="yrs" note="Standard lookback window for lead reactivation programs. Longer = larger pool but lower recency." />
                <NumericInput label="Return to Site Rate" value={params.reactivationRate} onChange={set("reactivationRate")} suffix="%" note="Conservative low end: 10% of dormant leads return to site within 12 months. Source: Mixed Media Ventures, Intelemark reactivation studies." />
                <NumericInput label="Reactivation Demo Rate" value={params.reactivationDemoRate} onChange={set("reactivationDemoRate")} suffix="%" note="Of re-engaged contacts, 5–10% book a demo. Familiarity helps but timing is still uncertain. Source: Mutare, Insiteful." />
                <NumericInput label="Reactivation Win Rate" value={params.reactivationWinRate} onChange={set("reactivationWinRate")} suffix="%" note="Conservative end of 15–20% close rate for reactivated leads. Source: Mixed Media Ventures, Adonis Media." />
                <NumericInput label="LinkedIn ROI Gain" value={params.linkedinRoiGain} onChange={set("linkedinRoiGain")} suffix="%" note="Audience refinement via intent data typically yields 15–25% improvement. Source: LinkedIn Marketing Solutions case studies." />
                <NumericInput label="Google ROI Gain" value={params.googleRoiGain} onChange={set("googleRoiGain")} suffix="%" note="Smart bidding + audience exclusion yields 8–12% efficiency gains. Source: Google Ads performance benchmarks." />
              </div>
            </div>

            {/* ROI Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {/* Column legend */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-gray-900">Estimated Annual ROI</h3>
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />Pipeline</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Revenue</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Ad Savings</span>
                </div>
              </div>

              <SalesRow label="Warmbound Sales Uplift" pipeline={roi.warmbound.pipeline} revenue={roi.warmbound.revenue} steps={roi.warmbound.steps} />
              <SalesRow label="Form Abandonment Recovery" pipeline={roi.formAbandonment.pipeline} revenue={roi.formAbandonment.revenue} steps={roi.formAbandonment.steps} />
              <SalesRow label="CRM Lead Reactivation" pipeline={roi.reactivation.pipeline} revenue={roi.reactivation.revenue} steps={roi.reactivation.steps} />
              <SavingsRow label="LinkedIn Ads Efficiency" savings={roi.linkedin.savings} steps={roi.linkedin.steps} />
              <SavingsRow label="Google Ads Efficiency" savings={roi.google.savings} steps={roi.google.steps} />

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4 mt-2 grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                  <p className="text-xs text-indigo-500 font-medium mb-1">Total Pipeline</p>
                  <p className="text-xl font-bold text-indigo-600">{fmtMoney(roi.totalPipeline)}</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600 font-medium mb-1">Total Revenue</p>
                  <p className="text-xl font-bold text-green-600">{fmtMoney(roi.totalRevenue)}</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-xs text-amber-600 font-medium mb-1">Ad Savings</p>
                  <p className="text-xl font-bold text-amber-600">{fmtMoney(roi.totalAdSavings)}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
