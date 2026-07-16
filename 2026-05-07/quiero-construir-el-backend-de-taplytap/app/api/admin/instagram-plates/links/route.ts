import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createInstagramPlatesBatch } from "@/lib/instagram-plates";
import { createBatchCsv, createBatchQrRows } from "@/lib/qr-assets";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { quantity } = (await request.json().catch(() => ({}))) as { quantity?: number };
    const plates = await createInstagramPlatesBatch(Number(quantity));
    const rows = createBatchQrRows(
      plates.map((plate) => ({
        code: plate.code,
        public_url: plate.public_url ?? "",
        status: plate.status,
        created_at: plate.created_at
      }))
    );

    return NextResponse.json({
      ok: true,
      count: rows.length,
      csv: createBatchCsv(rows),
      filePrefix: `taplytap-instagram-links-${new Date().toISOString().slice(0, 10)}`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate Instagram links.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
