import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createQrCodesBatch } from "@/lib/qr";
import { createBatchCsv, createBatchQrRows } from "@/lib/qr-assets";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { quantity } = (await request.json().catch(() => ({}))) as { quantity?: number };
    const qrCodes = await createQrCodesBatch(Number(quantity));
    const rows = createBatchQrRows(
      qrCodes.map((qrCode) => ({
        code: qrCode.code,
        public_url: qrCode.public_url ?? "",
        status: qrCode.status,
        created_at: qrCode.created_at
      }))
    );

    const csv = createBatchCsv(rows);

    return NextResponse.json({
      ok: true,
      count: rows.length,
      csv,
      filePrefix: `taplytap-links-${new Date().toISOString().slice(0, 10)}`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate links.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
