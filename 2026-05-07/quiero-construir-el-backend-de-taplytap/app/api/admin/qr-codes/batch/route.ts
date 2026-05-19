import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { buildPublicQrUrl } from "@/lib/public-qr-url";
import { createQrCodesBatch } from "@/lib/qr";
import { createBatchCsv, createQrPngZip } from "@/lib/qr-assets";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const quantity = contentType.includes("application/json")
      ? Number((await request.json()).quantity)
      : Number((await request.formData()).get("quantity"));

    const qrCodes = await createQrCodesBatch(quantity);
    const rows = qrCodes.map((qrCode) => ({
      code: qrCode.code,
      url: buildPublicQrUrl(qrCode.code),
      status: qrCode.status,
      created_at: qrCode.created_at
    }));
    const csv = createBatchCsv(rows);
    const zip = createQrPngZip(rows);

    return NextResponse.json({
      ok: true,
      count: rows.length,
      csv,
      zipBase64: zip.toString("base64"),
      filePrefix: `taplytap-qr-${new Date().toISOString().slice(0, 10)}`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create QR codes.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
