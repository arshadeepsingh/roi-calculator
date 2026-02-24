import { NextRequest, NextResponse } from "next/server";

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

const SYSTEM_PROMPT = `You are a B2B SaaS revenue analyst. Given a company domain, research and estimate the following metrics.
Return ONLY a valid JSON object with no markdown, no explanation, no code fences — just raw JSON.

Required fields:
{
  "companyName": string,
  "description": string (one sentence about what the company does),
  "monthlyTraffic": number (estimated monthly website visitors),
  "monthlyTrafficNote": string (1 sentence: what source/signal you used, e.g. "SimilarWeb estimates ~500K monthly visits based on their SEO footprint and Crunchbase-reported scale."),
  "acv": number (estimated average contract value in USD per year),
  "acvNote": string (1 sentence: how you derived ACV, e.g. "Pricing page shows $99-$499/mo plans; mid-market focus suggests ~$15K ACV."),
  "tam": number (estimated total addressable market — number of target companies),
  "tamNote": string (1 sentence: how you scoped the TAM, e.g. "Targets mid-market SaaS companies; ~10K such companies globally per Crunchbase filters."),
  "linkedinAdSpend": number (estimated monthly LinkedIn Ads spend in USD),
  "linkedinAdSpendNote": string (1 sentence: how you estimated this, e.g. "LinkedIn Ads Library shows active campaigns; estimated at ~5% of inferred $2M ARR marketing budget."),
  "googleAdSpend": number (estimated monthly Google Ads spend in USD),
  "googleAdSpendNote": string (1 sentence: how you estimated this, e.g. "SEMrush/SpyFu signals indicate moderate paid search activity; estimated at ~3% of revenue."),
  "confidence": "low" | "medium" | "high" (your overall confidence in these estimates)
}

Base estimates on:
- Company size, funding, revenue if publicly known
- Industry benchmarks
- SimilarWeb-style traffic estimates
- Typical ad spend ratios for their industry and size

Be pragmatic and conservative. If you cannot find reliable data, use reasonable industry benchmarks and note low confidence.`;

export async function POST(req: NextRequest) {
  const { domain } = await req.json();

  if (!domain) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "PERPLEXITY_API_KEY not configured" },
      { status: 500 }
    );
  }

  const response = await fetch(PERPLEXITY_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Research this company domain and return the JSON: ${domain}`,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json(
      { error: `Perplexity API error: ${error}` },
      { status: 500 }
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const citations: string[] = data.citations ?? [];

  try {
    // Strip any accidental markdown fences
    const clean = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json({ ...parsed, citations });
  } catch {
    return NextResponse.json(
      { error: "Failed to parse AI response", raw: content },
      { status: 500 }
    );
  }
}
