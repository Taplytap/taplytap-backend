import { NextRequest, NextResponse } from "next/server";
import { normalizeProfileLinks, profileLinkTypes } from "@/lib/profile-links";
import { getRequestOrigin, isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileLinkInput } from "@/lib/profile-links";

type RouteContext = {
  params: {
    code: string;
  };
};

type AuthResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; status: number; error: string; errors?: Record<string, string> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const sameOrigin = getRequestOrigin(request);

  if (request.headers.get("origin") && !sameOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }

  const formData = await request.formData();
  const businessName = String(formData.get("business_name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const linksInput = readProfileLinkInputs(formData);
  const { links, errors: linkErrors } = normalizeProfileLinks(linksInput);
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
  const { data: currentPlate, error: currentPlateError } = await supabase
    .from("profile_plates")
    .select("id,code,status,owner_user_id")
    .eq("code", code)
    .maybeSingle();

  if (currentPlateError) {
    return NextResponse.json({ error: currentPlateError.message }, { status: 500 });
  }

  if (!currentPlate) {
    return NextResponse.json({ error: "Profile plate not found." }, { status: 404 });
  }

  if (currentPlate.status !== "inactive" || currentPlate.owner_user_id) {
    return NextResponse.json(
      { error: "Esta placa ya fue activada o asignada a otra cuenta." },
      { status: 409 }
    );
  }

  const ownerResult = await getAuthenticatedOrFormOwner(formData);

  if (!ownerResult.ok) {
    return NextResponse.json(
      { error: ownerResult.error, errors: ownerResult.errors },
      { status: ownerResult.status }
    );
  }

  const now = new Date().toISOString();
  const { data: activatedPlate, error: activationError } = await supabase
    .from("profile_plates")
    .update({
      owner_email: ownerResult.email,
      owner_user_id: ownerResult.userId,
      business_name: businessName,
      description: description || null,
      status: "active",
      activated_at: now
    })
    .eq("code", code)
    .eq("status", "inactive")
    .is("owner_user_id", null)
    .select("id,code")
    .maybeSingle();

  if (activationError) {
    return NextResponse.json({ error: activationError.message }, { status: 500 });
  }

  if (!activatedPlate) {
    return NextResponse.json({ error: "Code is not available for activation." }, { status: 409 });
  }

  const { error: linksError } = await supabase.from("profile_links").insert(
    links.map((link) => ({
      profile_plate_id: activatedPlate.id,
      type: link.type,
      label: link.label,
      source_value: link.source_value,
      url: link.url,
      enabled: link.enabled,
      sort_order: link.sort_order
    }))
  );

  if (linksError) {
    await supabase
      .from("profile_plates")
      .update({
        owner_email: null,
        owner_user_id: null,
        business_name: null,
        description: null,
        status: "inactive",
        activated_at: null
      })
      .eq("id", activatedPlate.id);

    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, code });
}

function readProfileLinkInputs(formData: FormData): ProfileLinkInput[] {
  return profileLinkTypes.map((type, index) => ({
    type,
    value: String(formData.get(`value_${type}`) ?? ""),
    enabled: formData.get(`enabled_${type}`) === "on",
    sort_order: index
  }));
}

async function getAuthenticatedOrFormOwner(formData: FormData): Promise<AuthResult> {
  const authClient = createSupabaseServerClient();
  const {
    data: { user }
  } = await authClient.auth.getUser();

  if (user?.id && user.email) {
    return { ok: true, userId: user.id, email: user.email.toLowerCase() };
  }

  const email = String(formData.get("owner_email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const errors: Record<string, string> = {};

  if (!email) {
    errors.owner_email = "Ingresa tu correo electrónico.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    errors.owner_email = "Ingresa un email válido.";
  }

  if (!password || password.length < 8) {
    errors.password = "Ingresa tu contraseña de al menos 8 caracteres.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, status: 400, error: "Revisa los campos marcados.", errors };
  }

  const signInResult = await authClient.auth.signInWithPassword({ email, password });

  if (signInResult.data.user) {
    return { ok: true, userId: signInResult.data.user.id, email };
  }

  const supabase = createSupabaseAdminClient();
  const createResult = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (!createResult.error && createResult.data.user) {
    const signInCreatedUser = await authClient.auth.signInWithPassword({ email, password });

    return {
      ok: true,
      userId: signInCreatedUser.data.user?.id ?? createResult.data.user.id,
      email
    };
  }

  if (isExistingUserError(createResult.error?.message)) {
    return {
      ok: false,
      status: 409,
      error: "Este email ya existe. Ingresa la contraseña correcta para vincular esta placa.",
      errors: { password: "La contraseña no coincide con esta cuenta." }
    };
  }

  return {
    ok: false,
    status: 500,
    error: createResult.error?.message ?? "No pudimos crear la cuenta."
  };
}

function isExistingUserError(message?: string) {
  if (!message) return false;
  return /already|registered|exists|duplicate/i.test(message);
}
