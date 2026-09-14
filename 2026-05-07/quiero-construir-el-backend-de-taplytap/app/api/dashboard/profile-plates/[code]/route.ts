import { NextRequest, NextResponse } from "next/server";
import { normalizeProfileLinks, profileLinkTypes } from "@/lib/profile-links";
import { isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileLinkInput } from "@/lib/profile-links";

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

  if (userError || !user?.id) {
    return NextResponse.json({ error: "Necesitas iniciar sesión." }, { status: 401 });
  }

  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    business_name?: string;
    description?: string | null;
    links?: ProfileLinkInput[];
  };
  const businessName = String(body.business_name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const linksInput = Array.isArray(body.links) ? body.links : [];
  const safeLinksInput = profileLinkTypes.map((type, index) => {
    const submitted = linksInput.find((link) => link.type === type);
    return {
      type,
      value: String(submitted?.value ?? ""),
      enabled: Boolean(submitted?.enabled),
      sort_order: Number.isInteger(submitted?.sort_order) ? submitted!.sort_order : index
    };
  });
  const { links, errors: linkErrors } = normalizeProfileLinks(safeLinksInput);
  const errors: Record<string, string> = { ...linkErrors };

  if (!businessName || businessName.length > 120) {
    errors.business_name = "Ingresa el nombre del negocio.";
  }

  if (description.length > 240) {
    errors.description = "Usa una descripción de máximo 240 caracteres.";
  }

  if (links.length === 0) {
    errors.links = "Agrega al menos un enlace para tu perfil.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Revisa los campos marcados.", errors }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: plate, error: plateError } = await supabase
    .from("profile_plates")
    .select("id,code,owner_user_id")
    .eq("code", code)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (plateError) {
    return NextResponse.json({ error: plateError.message }, { status: 500 });
  }

  if (!plate) {
    return NextResponse.json({ error: "No tienes permiso para editar esta placa." }, { status: 403 });
  }

  const { error: updateError } = await supabase
    .from("profile_plates")
    .update({
      business_name: businessName,
      description: description || null
    })
    .eq("id", plate.id)
    .eq("owner_user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: deleteLinksError } = await supabase
    .from("profile_links")
    .delete()
    .eq("profile_plate_id", plate.id);

  if (deleteLinksError) {
    return NextResponse.json({ error: deleteLinksError.message }, { status: 500 });
  }

  const { data: savedLinks, error: insertLinksError } = await supabase
    .from("profile_links")
    .insert(
      links.map((link) => ({
        profile_plate_id: plate.id,
        type: link.type,
        label: link.label,
        source_value: link.source_value,
        url: link.url,
        enabled: link.enabled,
        sort_order: link.sort_order
      }))
    )
    .select("*")
    .order("sort_order", { ascending: true });

  if (insertLinksError) {
    return NextResponse.json({ error: insertLinksError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    plate: {
      code: plate.code,
      business_name: businessName,
      description: description || null,
      links: savedLinks ?? []
    }
  });
}
