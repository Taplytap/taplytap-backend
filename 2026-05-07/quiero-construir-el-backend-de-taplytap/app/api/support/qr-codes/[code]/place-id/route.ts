import { NextRequest, NextResponse } from "next/server";
import { requireSupport } from "@/lib/auth";
import { createGoogleReviewUrl, normalizePlaceId } from "@/lib/qr-form";
import { isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: {
    code: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const supportUser = await requireSupport();
  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { place_id?: string };
  const placeId = normalizePlaceId(String(body.place_id ?? ""));

  if (!placeId) {
    return NextResponse.json({ error: "El Place ID no puede estar vacío." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: currentQr, error: currentError } = await supabase
    .from("qr_codes")
    .select("id,code,place_id,destination_url")
    .eq("code", code)
    .maybeSingle();

  if (currentError) {
    return NextResponse.json({ error: currentError.message }, { status: 500 });
  }

  if (!currentQr) {
    return NextResponse.json({ error: "No encontramos esta placa." }, { status: 404 });
  }

  const destinationUrl = createGoogleReviewUrl(placeId);
  const { data: updatedQr, error: updateError } = await supabase
    .from("qr_codes")
    .update({
      place_id: placeId,
      destination_url: destinationUrl
    })
    .eq("id", currentQr.id)
    .select("place_id,destination_url")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: auditError } = await supabase.from("support_audit_logs").insert({
    support_user_id: supportUser.id,
    support_email: supportUser.email,
    qr_code_id: currentQr.id,
    code: currentQr.code,
    action: "update_place_id",
    previous_place_id: currentQr.place_id,
    new_place_id: placeId,
    previous_destination_url: currentQr.destination_url,
    new_destination_url: destinationUrl
  });

  if (auditError) {
    return NextResponse.json({ error: auditError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    place_id: updatedQr?.place_id ?? placeId,
    destination_url: updatedQr?.destination_url ?? destinationUrl
  });
}
