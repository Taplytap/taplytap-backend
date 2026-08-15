import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: {
    code: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = await getAdminUser();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { boost_enabled?: unknown } | null;

  if (!body || typeof body.boost_enabled !== "boolean") {
    return NextResponse.json({ error: "Valor de Boost inválido." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: qrCode, error: qrError } = await supabase
    .from("qr_codes")
    .select("id,code,owner_user_id,owner_email,boost_enabled")
    .eq("code", code)
    .maybeSingle();

  if (qrError) {
    return NextResponse.json({ error: qrError.message }, { status: 500 });
  }

  if (!qrCode) {
    return NextResponse.json({ error: "QR not found." }, { status: 404 });
  }

  if (body.boost_enabled && !qrCode.owner_user_id) {
    return NextResponse.json(
      { error: "Esta placa no tiene owner_user_id. Asigna primero un owner a la placa." },
      { status: 400 }
    );
  }

  if (body.boost_enabled && qrCode.owner_user_id) {
    const { data: boostSubscription, error: subscriptionError } = await supabase
      .from("boost_subscriptions")
      .select("user_id,status,source,email")
      .eq("user_id", qrCode.owner_user_id)
      .maybeSingle();

    if (subscriptionError) {
      return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
    }

    if (boostSubscription?.status !== "active") {
      const { error: upsertError } = await supabase
        .from("boost_subscriptions")
        .upsert(
          {
            user_id: qrCode.owner_user_id,
            status: "active",
            source: "manual_free",
            email: qrCode.owner_email,
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id" }
        );

      if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }
    }
  }

  const { data: updatedQr, error: updateError } = await supabase
    .from("qr_codes")
    .update({ boost_enabled: body.boost_enabled })
    .eq("id", qrCode.id)
    .select("boost_enabled")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    boost_enabled: updatedQr?.boost_enabled ?? body.boost_enabled
  });
}
