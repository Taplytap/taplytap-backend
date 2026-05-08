import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClientIp, hashIp, isValidCode, normalizeCode } from "@/lib/security";

type RouteContext = {
  params: {
    code: string;
  };
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: qrCode } = await supabase
    .from("qr_codes")
    .select("id,status,destination_url")
    .eq("code", code)
    .maybeSingle();

  const { error } = await supabase.from("scan_events").insert({
    qr_code_id: qrCode?.id,
    code,
    status_at_scan: qrCode?.status ?? "not_found",
    destination_url: qrCode?.destination_url ?? null,
    user_agent: request.headers.get("user-agent"),
    referrer: request.headers.get("referer"),
    ip_hash: hashIp(getClientIp(request))
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
