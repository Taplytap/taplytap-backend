import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getSiteUrl } from "@/lib/env";
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
    const siteUrl = getSiteUrl();
    const rows = qrCodes.map((qrCode) => ({
      code: qrCode.code,
      url: `${siteUrl}/user/${qrCode.code}`,
      status: qrCode.status
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
