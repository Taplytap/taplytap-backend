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

  if (!isDestinationPayload(body)) {
    return NextResponse.json({ error: "Ingresa un link válido." }, { status: 400 });
  }

  const destinationUrl = body.destination_url.trim();

  if (!isHttpUrl(destinationUrl)) {
    return NextResponse.json(
      { error: "El link debe empezar con http:// o https://." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: qrCode, error } = await supabase
    .from("qr_codes")
    .update({ destination_url: destinationUrl })
    .eq("code", code)
    .eq("owner_user_id", user.id)
    .select("destination_url")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!qrCode) {
    return NextResponse.json({ error: "No tienes permiso para modificar esta placa." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, destination_url: qrCode.destination_url });
}

function isDestinationPayload(value: unknown): value is { destination_url: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "destination_url" in value &&
    typeof (value as { destination_url: unknown }).destination_url === "string" &&
    (value as { destination_url: string }).destination_url.trim().length > 0
  );
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
