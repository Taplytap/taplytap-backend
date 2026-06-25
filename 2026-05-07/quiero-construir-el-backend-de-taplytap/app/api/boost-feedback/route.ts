import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashIp, isValidCode, normalizeCode } from "@/lib/security";

type FeedbackPayload = {
  code: string;
  rating: number;
  message: string;
};

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!isFeedbackPayload(body)) {
    return NextResponse.json({ error: "Revisa tu comentario." }, { status: 400 });
  }

  const code = normalizeCode(body.code);
  const message = body.message.trim();

  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  }

  if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 3) {
    return NextResponse.json({ error: "Calificación inválida." }, { status: 400 });
  }

  if (!message || message.length > 1200) {
    return NextResponse.json({ error: "Escribe un comentario breve." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: qrCode, error: qrError } = await supabase
    .from("qr_codes")
    .select("id,status,boost_enabled")
    .eq("code", code)
    .maybeSingle();

  if (qrError) {
    return NextResponse.json({ error: qrError.message }, { status: 500 });
  }

  if (!qrCode || qrCode.status !== "active" || !qrCode.boost_enabled) {
    return NextResponse.json({ error: "No pudimos guardar el comentario." }, { status: 404 });
  }

  const requestHeaders = headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const { error } = await supabase.from("boost_feedback").insert({
    qr_code_id: qrCode.id,
    code,
    rating: body.rating,
    message,
    user_agent: requestHeaders.get("user-agent"),
    ip_hash: hashIp(forwardedFor)
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function isFeedbackPayload(value: unknown): value is FeedbackPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "rating" in value &&
    "message" in value &&
    typeof (value as FeedbackPayload).code === "string" &&
    typeof (value as FeedbackPayload).rating === "number" &&
    typeof (value as FeedbackPayload).message === "string"
  );
}
