import { NextResponse } from "next/server";
import { getDb, extractedData } from "@/lib/db";
import { desc } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const allData = await db
      .select()
      .from(extractedData)
      .orderBy(desc(extractedData.createdAt));

    return NextResponse.json(allData);
  } catch (error) {
    console.error("Error fetching extracted data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
