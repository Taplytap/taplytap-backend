import { NextRequest, NextResponse } from "next/server";
import { isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: {
    code: string;
  };
};

const profileImagesBucket = "profile-plate-images";
const maxImageSize = 2 * 1024 * 1024;
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: RouteContext) {
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

  const formData = await request.formData();
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Selecciona una imagen válida." }, { status: 400 });
  }

  const extension = allowedImageTypes.get(file.type);

  if (!extension) {
    return NextResponse.json({ error: "La imagen debe ser JPG, PNG o WEBP." }, { status: 400 });
  }

  if (file.size > maxImageSize) {
    return NextResponse.json({ error: "La imagen debe pesar máximo 2 MB." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: plate, error: plateError } = await supabase
    .from("profile_plates")
    .select("id,code,owner_user_id,profile_image_path")
    .eq("code", code)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (plateError) {
    return NextResponse.json({ error: plateError.message }, { status: 500 });
  }

  if (!plate) {
    return NextResponse.json({ error: "No tienes permiso para editar esta placa." }, { status: 403 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const imagePath = `${user.id}/${plate.id}-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(profileImagesBucket)
    .upload(imagePath, Buffer.from(arrayBuffer), {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("profile_plates")
    .update({ profile_image_path: imagePath })
    .eq("id", plate.id)
    .eq("owner_user_id", user.id);

  if (updateError) {
    await supabase.storage.from(profileImagesBucket).remove([imagePath]);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (plate.profile_image_path) {
    await supabase.storage.from(profileImagesBucket).remove([plate.profile_image_path]);
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(profileImagesBucket).getPublicUrl(imagePath);

  return NextResponse.json({
    ok: true,
    profile_image_path: imagePath,
    public_url: publicUrl
  });
}
