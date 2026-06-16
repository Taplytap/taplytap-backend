import { NextRequest, NextResponse } from "next/server";
import {
  createGoogleReviewUrl,
  readQrFormValues,
  hasQrFormErrors,
  validateActivation
} from "@/lib/qr-form";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getRequestOrigin,
  isValidCode,
  normalizeCode
} from "@/lib/security";

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
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }

  const formData = await request.formData();
  const values = readQrFormValues(formData);
  const errors = validateActivation(values);

  if (hasQrFormErrors(errors)) {
    return NextResponse.json(
      { error: "Revisa los campos marcados.", errors },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: currentQr, error: currentQrError } = await supabase
    .from("qr_codes")
    .select("code,status")
    .eq("code", code)
    .maybeSingle();

  if (currentQrError) {
    return NextResponse.json({ error: currentQrError.message }, { status: 500 });
  }

  if (!currentQr) {
    return NextResponse.json({ error: "QR not found." }, { status: 404 });
  }

  if (currentQr.status !== "inactive") {
    return NextResponse.json({ error: "Code is not available for activation." }, { status: 409 });
  }

  const ownerResult = await getOrCreateOwnerUser(values.owner_email, values.password);

  if (!ownerResult.ok) {
    return NextResponse.json({ error: ownerResult.error }, { status: ownerResult.status });
  }

  const destinationUrl = createGoogleReviewUrl(values.place_id);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("qr_codes")
    .update({
      business_name: values.business_name,
      whatsapp: values.whatsapp,
      owner_email: values.owner_email,
      owner_user_id: ownerResult.userId,
      claimed_at: now,
      place_id: values.place_id,
      destination_url: destinationUrl,
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

async function getOrCreateOwnerUser(email: string, password: string) {
  const authClient = createSupabaseServerClient();
  const signInResult = await authClient.auth.signInWithPassword({
    email,
    password
  });

  if (signInResult.data.user) {
    return { ok: true as const, userId: signInResult.data.user.id };
  }

  const supabase = createSupabaseAdminClient();
  const createResult = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (!createResult.error && createResult.data.user) {
    const signInCreatedUser = await authClient.auth.signInWithPassword({
      email,
      password
    });

    return {
      ok: true as const,
      userId: signInCreatedUser.data.user?.id ?? createResult.data.user.id
    };
  }

  if (isExistingUserError(createResult.error?.message)) {
    return {
      ok: false as const,
      status: 409,
      error: "Este email ya existe. Ingresa la contraseña correcta para vincular esta placa."
    };
  }

  return {
    ok: false as const,
    status: 500,
    error: createResult.error?.message ?? "No pudimos crear la cuenta del owner."
  };
}

function isExistingUserError(message?: string) {
  if (!message) return false;
  return /already|registered|exists|duplicate/i.test(message);
}
