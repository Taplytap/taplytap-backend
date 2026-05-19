import { NextRequest, NextResponse } from "next/server";
import {
  createGoogleReviewUrl,
  readQrFormValues,
  hasQrFormErrors,
  validateActivation
} from "@/lib/qr-form";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  const destinationUrl = createGoogleReviewUrl(values.place_id);
  const { data, error } = await supabase
    .from("qr_codes")
    .update({
      business_name: values.business_name,
      whatsapp: values.whatsapp || null,
      owner_email: values.owner_email,
      place_id: values.place_id,
      destination_url: destinationUrl,
      status: "active",
      activated_at: new Date().toISOString()
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
