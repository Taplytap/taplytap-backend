import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createBatchCsv,
  createBatchQrRows,
  createQrPngZip,
  verifyQrBatchAssets
} from "@/lib/qr-assets";

export const runtime = "nodejs";

export async function POST() {
  const admin = await getAdminUser();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("qr_codes")
      .select("code,public_url,status,created_at")
      .not("public_url", "is", null)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const rows = createBatchQrRows(
      (data ?? []).map((qrCode) => ({
        code: qrCode.code,
        public_url: qrCode.public_url ?? "",
        status: qrCode.status,
        created_at: qrCode.created_at
      }))
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No hay links con public_url para generar QR." },
        { status: 400 }
      );
    }

    const csv = createBatchCsv(rows);
    const zip = createQrPngZip(rows);
    const verification = verifyQrBatchAssets(rows);

    return NextResponse.json({
      ok: true,
      count: rows.length,
      csv,
      zipBase64: zip.toString("base64"),
      filePrefix: `taplytap-qr-${new Date().toISOString().slice(0, 10)}`,
      verification
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate QR assets.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
