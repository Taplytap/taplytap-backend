import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSiteUrl } from "@/lib/env";
import { isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: {
    code: string;
  };
};

export async function POST(_request: NextRequest, { params }: RouteContext) {
  await requireAdmin();

  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: qrCode, error: qrError } = await supabase
    .from("qr_codes")
    .select("owner_email")
    .eq("code", code)
    .maybeSingle();

  if (qrError) {
    return NextResponse.json({ error: qrError.message }, { status: 500 });
  }

  if (!qrCode) {
    return NextResponse.json({ error: "QR not found." }, { status: 404 });
  }

  if (!qrCode.owner_email) {
    return NextResponse.json({ error: "Este QR no tiene owner_email." }, { status: 400 });
  }

  const callbackUrl = new URL("/auth/callback", getSiteUrl());
  callbackUrl.searchParams.set("next", "/reset-password");
  const { error } = await supabase.auth.resetPasswordForEmail(qrCode.owner_email, {
    redirectTo: callbackUrl.toString()
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Email de recuperación enviado." });
}
