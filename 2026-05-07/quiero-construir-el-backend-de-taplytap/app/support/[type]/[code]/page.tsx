import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { SupportPlateEditor } from "@/components/SupportPlateEditor";
import type { SupportEditablePlateType } from "@/components/SupportPlateEditor";
import { requireSupport } from "@/lib/auth";
import {
  buildFacebookPlateUrl,
  buildInstagramPlateUrl,
  buildProfilePlateUrl,
  buildPublicQrUrl
} from "@/lib/public-qr-url";
import { isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  params: {
    type: string;
    code: string;
  };
};

const validTypes: SupportEditablePlateType[] = ["google", "instagram", "facebook", "profile"];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SupportPlatePage({ params }: PageProps) {
  noStore();
  await requireSupport();

  const type = validTypes.includes(params.type as SupportEditablePlateType)
    ? (params.type as SupportEditablePlateType)
    : null;
  const code = normalizeCode(params.code);

  if (!type || !isValidCode(code)) notFound();

  const result = await loadPlate(type, code);
  if (!result) notFound();

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 pb-20 pt-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">TaplyTap Operaciones</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Editar placa</h1>
        <p className="mt-2 text-sm leading-6 text-slateText">
          Los cambios afectan esta placa existente. El código, QR y NFC permanecen intactos.
        </p>

        <div className="mt-6">
          <SupportPlateEditor
            type={type}
            plate={result.plate}
            publicUrl={result.publicUrl}
            links={result.links}
          />
        </div>
      </div>
    </main>
  );
}

async function loadPlate(type: SupportEditablePlateType, code: string) {
  const supabase = createSupabaseAdminClient();

  if (type === "google") {
    const { data, error } = await supabase.from("qr_codes").select("*").eq("code", code).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return { plate: data, publicUrl: data.public_url ?? buildPublicQrUrl(code), links: [] };
  }

  if (type === "instagram") {
    const { data, error } = await supabase.from("instagram_plates").select("*").eq("code", code).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return { plate: data, publicUrl: data.public_url ?? buildInstagramPlateUrl(code), links: [] };
  }

  if (type === "facebook") {
    const { data, error } = await supabase.from("facebook_plates").select("*").eq("code", code).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return { plate: data, publicUrl: data.public_url ?? buildFacebookPlateUrl(code), links: [] };
  }

  const { data, error } = await supabase.from("profile_plates").select("*").eq("code", code).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: links, error: linksError } = await supabase
    .from("profile_links")
    .select("type,source_value,enabled,sort_order")
    .eq("profile_plate_id", data.id)
    .order("sort_order", { ascending: true });

  if (linksError) throw new Error(linksError.message);

  return {
    plate: data,
    publicUrl: data.public_url ?? buildProfilePlateUrl(code),
    links: links ?? []
  };
}
