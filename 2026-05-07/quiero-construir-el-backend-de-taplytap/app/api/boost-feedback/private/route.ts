import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "No se encontró una sesión activa." }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: plates, error: platesError } = await supabase
    .from("qr_codes")
    .select("id,code,business_name")
    .eq("owner_user_id", user.id);

  if (platesError) {
    return NextResponse.json({ error: platesError.message }, { status: 500 });
  }

  const plateIds = (plates ?? []).map((plate) => plate.id);

  if (plateIds.length === 0) {
    return NextResponse.json({ feedback: [] });
  }

  const { data: feedback, error: feedbackError } = await supabase
    .from("boost_feedback")
    .select("id,qr_code_id,code,rating,message,created_at")
    .in("qr_code_id", plateIds)
    .order("created_at", { ascending: false })
    .limit(20);

  if (feedbackError) {
    return NextResponse.json({ error: feedbackError.message }, { status: 500 });
  }

  const platesById = new Map((plates ?? []).map((plate) => [plate.id, plate]));

  return NextResponse.json({
    feedback: (feedback ?? []).map((item) => {
      const plate = item.qr_code_id ? platesById.get(item.qr_code_id) : null;

      return {
        id: item.id,
        code: item.code,
        rating: item.rating,
        message: item.message,
        created_at: item.created_at,
        plate_code: plate?.code ?? item.code,
        plate_name: plate?.business_name ?? null
      };
    })
  });
}
