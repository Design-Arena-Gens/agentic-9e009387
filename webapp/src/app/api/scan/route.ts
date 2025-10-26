import { NextResponse } from "next/server";
import { z } from "zod";
import { runAgentScan } from "@/lib/agent";
import { DEFAULT_CONFIG } from "@/lib/defaultConfig";
import { buildServerConfig } from "@/lib/config.server";

const scanRequestSchema = z.object({
  config: z
    .object({
      sources: z.array(z.string().url()).min(1).default(DEFAULT_CONFIG.sources),
      keywords: z.array(z.string()).min(1).default(DEFAULT_CONFIG.keywords),
      industry: z.string().min(2).default(DEFAULT_CONFIG.industry),
      emails: z.array(z.string().email()).default([]),
      whatsappNumbers: z.array(z.string()).default([]),
      enableDailyDigest: z.boolean().default(true),
      enableWeeklyDigest: z.boolean().default(true),
      enableRealtimeAlerts: z.boolean().default(true),
    })
    .default(buildServerConfig()),
  triggerMode: z
    .enum(["manual", "daily", "weekly", "realtime"])
    .default("manual"),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { config, triggerMode } = scanRequestSchema.parse(json);

    const { report, notifications, articleCount } = await runAgentScan({
      config,
      triggerMode,
    });

    return NextResponse.json({
      ok: true,
      report,
      notifications,
      meta: {
        articleCount,
      },
    });
  } catch (error) {
    console.error("[api/scan] failure", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const triggerModeParam = searchParams.get("triggerMode");
  const triggerMode = triggerModeParam === "weekly"
    ? "weekly"
    : triggerModeParam === "realtime"
      ? "realtime"
      : "daily";

  try {
    const { report, notifications, articleCount } = await runAgentScan({
      config: buildServerConfig(),
      triggerMode,
    });

    return NextResponse.json({
      ok: true,
      report,
      notifications,
      meta: {
        articleCount,
      },
    });
  } catch (error) {
    console.error("[api/scan] GET failure", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
