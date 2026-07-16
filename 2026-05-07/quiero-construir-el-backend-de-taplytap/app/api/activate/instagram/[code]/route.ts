import { NextRequest, NextResponse } from "next/server";
import { getInstagramProfileUrlError, normalizeInstagramProfileUrl } from "@/lib/instagram-url";
import { getRequestOrigin, isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const destinationUrl = normalizeInstagramProfileUrl(String(formData.get("destination_url") ?? ""));
  const destinationError = getInstagramProfileUrlError(destinationUrl);

  if (destinationError) {
    return NextResponse.json(
      { error: "Revisa los campos marcados.", errors: { destination_url: destinationError } },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: currentPlate, error: currentPlateError } = await supabase
    .from("instagram_plates")
    .select("code,status")
    .eq("code", code)
    .maybeSingle();

  if (currentPlateError) {
    return NextResponse.json({ error: currentPlateError.message }, { status: 500 });
  }

  if (!currentPlate) {
    return NextResponse.json({ error: "Instagram plate not found." }, { status: 404 });
  }

  if (currentPlate.status !== "inactive") {
    return NextResponse.json({ error: "Code is not available for activation." }, { status: 409 });
  }

  const ownerResult = await getAuthenticatedOrFormOwner(formData);

  if (!ownerResult.ok) {
    return NextResponse.json(
      { error: ownerResult.error, errors: ownerResult.errors },
      { status: ownerResult.status }
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("instagram_plates")
    .update({
      destination_url: destinationUrl,
      owner_email: ownerResult.email,
      owner_user_id: ownerResult.userId,
      status: "active",
      activated_at: now
    })
    .eq("code", code)
    .eq("status", "inactive")
    .select("code")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Code is not available for activation." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, code });
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
