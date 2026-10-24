import { NextRequest, NextResponse } from "next/server";
import { findExistingAuthUserByEmail } from "@/lib/admin-users";
import { getAdminOrSupportUser } from "@/lib/auth";
import { isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: {
    code: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const actor = await getAdminOrSupportUser();

  if (!actor) {
    return NextResponse.json({ error: "No tienes permiso para cambiar propietario." }, { status: 403 });
  }

  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { owner_email?: unknown };
  const newOwnerEmail = String(body.owner_email ?? "").trim().toLowerCase();

  if (!newOwnerEmail) {
    return NextResponse.json({ error: "Ingresa el correo del nuevo propietario." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newOwnerEmail) || newOwnerEmail.length > 160) {
    return NextResponse.json({ error: "Ingresa un correo válido." }, { status: 400 });
  }

  const newOwnerUser = await findExistingAuthUserByEmail(newOwnerEmail);

  if (!newOwnerUser?.id || !newOwnerUser.email) {
    return NextResponse.json(
      { error: "No existe una cuenta registrada con ese correo." },
      { status: 404 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: currentQr, error: currentError } = await supabase
    .from("qr_codes")
    .select("id,code,owner_user_id,owner_email")
    .eq("code", code)
    .maybeSingle();

  if (currentError) {
    return NextResponse.json({ error: currentError.message }, { status: 500 });
  }

  if (!currentQr) {
    return NextResponse.json({ error: "No encontramos esta placa." }, { status: 404 });
  }

  if (currentQr.owner_user_id === newOwnerUser.id && currentQr.owner_email === newOwnerEmail) {
    return NextResponse.json({
      ok: true,
      owner_user_id: currentQr.owner_user_id,
      owner_email: currentQr.owner_email,
      unchanged: true
    });
  }

  const { data: updatedQr, error: updateError } = await supabase
    .from("qr_codes")
    .update({
      owner_user_id: newOwnerUser.id,
      owner_email: newOwnerEmail
    })
    .eq("id", currentQr.id)
    .select("owner_user_id,owner_email")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: auditError } = await supabase.from("support_audit_logs").insert({
    support_user_id: actor.id,
    support_email: actor.email,
    qr_code_id: currentQr.id,
    code: currentQr.code,
    action: "update_owner",
    previous_owner_user_id: currentQr.owner_user_id,
    new_owner_user_id: newOwnerUser.id,
    previous_owner_email: currentQr.owner_email,
    new_owner_email: newOwnerEmail
  });

  if (auditError) {
    await supabase
      .from("qr_codes")
      .update({
        owner_user_id: currentQr.owner_user_id,
        owner_email: currentQr.owner_email
      })
      .eq("id", currentQr.id);

    return NextResponse.json({ error: auditError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    owner_user_id: updatedQr?.owner_user_id ?? newOwnerUser.id,
    owner_email: updatedQr?.owner_email ?? newOwnerEmail
  });
}
