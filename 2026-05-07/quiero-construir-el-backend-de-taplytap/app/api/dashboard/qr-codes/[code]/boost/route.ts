import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidCode, normalizeCode } from "@/lib/security";

type RouteContext = {
  params: {
    code: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const authClient = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "No se encontró una sesión activa." }, { status: 401 });
  }

  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
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
  const { data: qrCode, error } = await supabase
    .from("qr_codes")
    .update({ boost_enabled: body.boost_enabled })
    .eq("code", code)
    .eq("owner_user_id", user.id)
    .select("boost_enabled")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!qrCode) {
    return NextResponse.json({ error: "No tienes permiso para modificar esta placa." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, boost_enabled: qrCode.boost_enabled });
}

function isBoostPayload(value: unknown): value is { boost_enabled: boolean } {
  return (
    typeof value === "object" &&
    value !== null &&
    "boost_enabled" in value &&
    typeof (value as { boost_enabled: unknown }).boost_enabled === "boolean"
  );
}
