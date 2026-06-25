import { NextRequest, NextResponse } from "next/server";
import { createGoogleReviewUrl, normalizePlaceId } from "@/lib/qr-form";
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

  if (!isPlaceIdPayload(body)) {
    return NextResponse.json({ error: "Ingresa un Place ID válido." }, { status: 400 });
  }

  const placeId = readDashboardPlaceId(body.place_id);

  if (!placeId) {
    return NextResponse.json(
      { error: "El Place ID no puede estar vacío." },
      { status: 400 }
    );
  }

  const destinationUrl = createGoogleReviewUrl(placeId);
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

function isPlaceIdPayload(value: unknown): value is { place_id: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "place_id" in value &&
    typeof (value as { place_id: unknown }).place_id === "string" &&
    (value as { place_id: string }).place_id.trim().length > 0
  );
}

function readDashboardPlaceId(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) return "";

  try {
    const url = new URL(trimmedValue);
    return url.searchParams.get("placeid")?.replace(/\s/g, "") ?? "";
  } catch {
    return normalizePlaceId(trimmedValue);
  }
}
