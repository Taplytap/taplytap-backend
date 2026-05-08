import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getRequestOrigin,
  isSafeDestinationUrl,
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
  const businessName = String(formData.get("business_name") ?? "").trim();
  const ownerEmail = String(formData.get("owner_email") ?? "").trim().toLowerCase();
  const destinationUrl = String(formData.get("destination_url") ?? "").trim();

  if (!businessName || businessName.length > 120) {
    return NextResponse.json({ error: "Invalid business name." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail) || ownerEmail.length > 160) {
    return NextResponse.json({ error: "Invalid owner email." }, { status: 400 });
  }

  if (!isSafeDestinationUrl(destinationUrl)) {
    return NextResponse.json({ error: "Destination URL must be a valid HTTPS URL." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("qr_codes")
    .update({
      business_name: businessName,
      owner_email: ownerEmail,
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

  return NextResponse.redirect(new URL(`/user/${code}`, request.url), { status: 303 });
}
