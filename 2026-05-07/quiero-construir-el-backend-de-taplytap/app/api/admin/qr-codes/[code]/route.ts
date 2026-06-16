import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  createGoogleReviewUrl,
  normalizePlaceId,
  readQrFormValues,
  hasQrFormErrors,
  validateAdminQr
} from "@/lib/qr-form";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isValidCode, normalizeCode } from "@/lib/security";

type RouteContext = {
  params: {
    code: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  await requireAdmin();

  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }

  const formData = await request.formData();
  const values = readQrFormValues(formData);
  const resetOwnerClaim = String(formData.get("reset_owner_claim") ?? "") === "1";
  const rawPlaceId = String(formData.get("place_id") ?? "");
  const placeId = normalizePlaceId(rawPlaceId);

  if (placeId && !values.destination_url) {
    values.destination_url = createGoogleReviewUrl(placeId);
  }

  values.place_id = placeId;
  const errors = validateAdminQr(values);

  if (hasQrFormErrors(errors)) {
    return NextResponse.json(
      { error: "Revisa los campos marcados.", errors },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: currentQr, error: currentError } = await supabase
    .from("qr_codes")
    .select("owner_email")
    .eq("code", code)
    .maybeSingle();

  if (currentError) {
    return NextResponse.json({ error: currentError.message }, { status: 500 });
  }

  if (!currentQr) {
    return NextResponse.json({ error: "QR not found." }, { status: 404 });
  }

  const nextOwnerEmail = values.owner_email || null;
  const currentOwnerEmail = currentQr.owner_email ?? null;
  const shouldResetOwnerClaim = resetOwnerClaim || nextOwnerEmail !== currentOwnerEmail;
  const updatePayload = {
    status: values.status,
    business_name: values.business_name || null,
    whatsapp: values.whatsapp || null,
    owner_email: nextOwnerEmail,
    place_id: values.place_id || null,
    destination_url: values.destination_url || null,
    activated_at: values.status === "active" ? new Date().toISOString() : null,
    ...(shouldResetOwnerClaim ? { owner_user_id: null, claimed_at: null } : {})
  };

  const { data, error } = await supabase
    .from("qr_codes")
    .update(updatePayload)
    .eq("code", code)
    .select("code")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "QR not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, message: "QR actualizado correctamente" });
}
