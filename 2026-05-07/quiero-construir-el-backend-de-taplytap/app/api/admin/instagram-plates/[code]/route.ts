import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { findExistingAuthUserByEmail } from "@/lib/admin-users";
import { getInstagramProfileUrlError, normalizeInstagramProfileUrl } from "@/lib/instagram-url";
import { isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { QrStatus } from "@/lib/types";

type RouteContext = {
  params: {
    code: string;
  };
};

const validStatuses: QrStatus[] = ["inactive", "active", "blocked"];

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = await getAdminUser();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    destination_url?: string | null;
    owner_email?: string | null;
    status?: QrStatus;
    clear_owner_confirm?: boolean;
  };
  const supabase = createSupabaseAdminClient();
  const { data: plate, error: plateError } = await supabase
    .from("instagram_plates")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (plateError) {
    return NextResponse.json({ error: plateError.message }, { status: 500 });
  }

  if (!plate) {
    return NextResponse.json({ error: "No encontramos esta placa de Instagram." }, { status: 404 });
  }

  const nextStatus = body.status ?? plate.status;

  if (!validStatuses.includes(nextStatus)) {
    return NextResponse.json({ error: "Selecciona un estado válido." }, { status: 400 });
  }

  const nextDestinationUrl = normalizeInstagramProfileUrl(
    typeof body.destination_url === "string" ? body.destination_url : plate.destination_url ?? ""
  );

  if (nextDestinationUrl) {
    const destinationError = getInstagramProfileUrlError(nextDestinationUrl);

    if (destinationError) {
      return NextResponse.json({ error: destinationError }, { status: 400 });
    }
  }

  if (nextStatus === "active" && !nextDestinationUrl) {
    return NextResponse.json(
      { error: "Una placa activa necesita un enlace válido de Instagram." },
      { status: 400 }
    );
  }

  const rawOwnerEmail = typeof body.owner_email === "string" ? body.owner_email.trim().toLowerCase() : undefined;
  let nextOwnerUserId = plate.owner_user_id;
  let nextOwnerEmail = plate.owner_email;

  if (rawOwnerEmail !== undefined) {
    if (rawOwnerEmail) {
      const ownerUser = await findExistingAuthUserByEmail(rawOwnerEmail);

      if (!ownerUser?.id || !ownerUser.email) {
        return NextResponse.json(
          { error: "Ese correo no corresponde a una cuenta TaplyTap existente." },
          { status: 400 }
        );
      }

      nextOwnerUserId = ownerUser.id;
      nextOwnerEmail = ownerUser.email.toLowerCase();
    } else if (plate.owner_user_id || plate.owner_email) {
      if (!body.clear_owner_confirm) {
        return NextResponse.json(
          { error: "Confirma que quieres quitar el propietario de esta placa." },
          { status: 400 }
        );
      }

      nextOwnerUserId = null;
      nextOwnerEmail = null;
    }
  }

  const { data, error } = await supabase
    .from("instagram_plates")
    .update({
      destination_url: nextDestinationUrl || null,
      owner_user_id: nextOwnerUserId,
      owner_email: nextOwnerEmail,
      status: nextStatus
    })
    .eq("id", plate.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, plate: data });
}
