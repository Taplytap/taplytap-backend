import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const confirmationText = "ELIMINAR TODO";

export async function DELETE(request: NextRequest) {
  await requireAdmin();

  const body = (await request.json().catch(() => null)) as { confirmation?: string } | null;

  if (body?.confirmation !== confirmationText) {
    return NextResponse.json({ error: "Confirmación inválida." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { count: scanCount, error: scanError } = await supabase
    .from("scan_events")
    .delete({ count: "exact" })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (scanError) {
    return NextResponse.json({ error: scanError.message }, { status: 500 });
  }

  const { count: qrCount, error: qrError } = await supabase
    .from("qr_codes")
    .delete({ count: "exact" })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (qrError) {
    return NextResponse.json({ error: qrError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    deletedQrCodes: qrCount ?? 0,
    deletedScans: scanCount ?? 0
  });
}
