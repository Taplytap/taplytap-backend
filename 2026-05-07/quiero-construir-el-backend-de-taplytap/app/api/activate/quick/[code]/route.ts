import { NextRequest, NextResponse } from "next/server";
import { createGoogleReviewUrl, normalizePlaceId } from "@/lib/qr-form";
import { getRequestOrigin, isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: {
    code: string;
  };
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const sameOrigin = getRequestOrigin(request);

  if (request.headers.get("origin") && !sameOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  }

  const authClient = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await authClient.auth.getUser();

  if (userError || !user?.email) {
    return NextResponse.json({ error: "Inicia sesión para activar esta placa." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { place_id?: unknown };
  const placeId = normalizePlaceId(String(body.place_id ?? ""));

  if (!placeId) {
    return NextResponse.json({ error: "Ingresa el Place ID de Google Maps." }, { status: 400 });
  }

  if (placeId.length > 220) {
    return NextResponse.json({ error: "El Place ID es demasiado largo." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: currentQr, error: currentQrError } = await supabase
    .from("qr_codes")
    .select("id,code,status,owner_user_id")
    .eq("code", code)
    .maybeSingle();

  if (currentQrError) {
    return NextResponse.json({ error: currentQrError.message }, { status: 500 });
  }

  if (!currentQr) {
    return NextResponse.json({ error: "Esta placa no existe." }, { status: 404 });
  }

  if (currentQr.status === "blocked") {
    return NextResponse.json({ error: "Esta placa está bloqueada. Contacta a soporte." }, { status: 409 });
  }

  if (currentQr.status !== "inactive" || currentQr.owner_user_id) {
    return NextResponse.json(
      { error: "Esta placa ya fue activada o ya pertenece a otra cuenta." },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const destinationUrl = createGoogleReviewUrl(placeId);
  const { data: activatedQr, error: activateError } = await supabase
    .from("qr_codes")
    .update({
      owner_email: user.email.toLowerCase(),
      owner_user_id: user.id,
      claimed_at: now,
      place_id: placeId,
      destination_url: destinationUrl,
      status: "active",
      activated_at: now
    })
    .eq("code", code)
    .eq("status", "inactive")
    .is("owner_user_id", null)
    .select("code,destination_url")
    .maybeSingle();

  if (activateError) {
    return NextResponse.json({ error: activateError.message }, { status: 500 });
  }

  if (!activatedQr) {
    return NextResponse.json(
      { error: "Esta placa ya fue activada mientras la configurabas. No hicimos cambios." },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    code: activatedQr.code,
    destination_url: activatedQr.destination_url
  });
}
