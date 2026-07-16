import { NextRequest, NextResponse } from "next/server";
import { getInstagramProfileUrlError, normalizeInstagramProfileUrl } from "@/lib/instagram-url";
import { isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: {
    code: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  }

  const authClient = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await authClient.auth.getUser();

  if (userError || !user?.id) {
    return NextResponse.json({ error: "Inicia sesión para actualizar esta placa." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { destination_url?: string };
  const destinationUrl = normalizeInstagramProfileUrl(String(body.destination_url ?? ""));
  const destinationError = getInstagramProfileUrlError(destinationUrl);

  if (destinationError) {
    return NextResponse.json({ error: destinationError }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: plate, error: plateError } = await supabase
    .from("instagram_plates")
    .select("id,owner_user_id")
    .eq("code", code)
    .maybeSingle();

  if (plateError) {
    return NextResponse.json({ error: plateError.message }, { status: 500 });
  }

  if (!plate) {
    return NextResponse.json({ error: "No encontramos esta placa." }, { status: 404 });
  }

  if (plate.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Esta placa no pertenece a tu cuenta." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("instagram_plates")
    .update({ destination_url: destinationUrl })
    .eq("id", plate.id)
    .select("destination_url")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, destination_url: data?.destination_url ?? destinationUrl });
}
