import { NextResponse } from "next/server";
import { loadReports } from "@/lib/googleSheets";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "10");

  try {
    const reports = await loadReports(limit);
    return NextResponse.json({ ok: true, reports });
  } catch (error) {
    console.error("[api/reports] failure", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
