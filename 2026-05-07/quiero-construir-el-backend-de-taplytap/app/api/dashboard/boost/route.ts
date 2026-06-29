import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const authClient = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "No se encontró una sesión activa." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!isBoostPayload(body)) {
    return NextResponse.json({ error: "Valor de Boost inválido." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: boostSubscription, error: boostSubscriptionError } = await supabase
    .from("boost_subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (boostSubscriptionError) {
    return NextResponse.json({ error: boostSubscriptionError.message }, { status: 500 });
  }

  if (boostSubscription?.status !== "active") {
    return NextResponse.json(
      { error: "Necesitas una licencia activa de TaplyTap Boost para modificar esta función." },
      { status: 403 }
    );
  }

  const { data: updatedPlates, error } = await supabase
    .from("qr_codes")
    .update({ boost_enabled: body.boost_enabled })
    .eq("owner_user_id", user.id)
    .select("code,boost_enabled");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    boost_enabled: body.boost_enabled,
    plates: updatedPlates ?? []
  });
}

function isBoostPayload(value: unknown): value is { boost_enabled: boolean } {
  return (
    typeof value === "object" &&
    value !== null &&
    "boost_enabled" in value &&
    typeof (value as { boost_enabled: unknown }).boost_enabled === "boolean"
  );
}
