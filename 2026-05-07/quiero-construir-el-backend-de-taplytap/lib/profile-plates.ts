import { createQrCodeValue } from "@/lib/qr";
import { buildProfilePlateUrl } from "@/lib/public-qr-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function createProfilePlatesBatch(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
    throw new Error("Quantity must be an integer between 1 and 1000.");
  }

  const supabase = createSupabaseAdminClient();
  const codes: string[] = [];
  const seen = new Set<string>();

  while (codes.length < quantity) {
    const candidates = new Set<string>();

    while (candidates.size < Math.max(quantity - codes.length + 25, 50)) {
      const code = createQrCodeValue();

      if (!seen.has(code)) {
        candidates.add(code);
        seen.add(code);
      }
    }

    const candidateList = Array.from(candidates);
    const { data: existingProfiles, error: profileLookupError } = await supabase
      .from("profile_plates")
      .select("code")
      .in("code", candidateList);

    if (profileLookupError) {
      throw new Error(profileLookupError.message);
    }

    const existingCodes = new Set((existingProfiles ?? []).map((row) => row.code));

    for (const code of candidateList) {
      if (!existingCodes.has(code)) {
        codes.push(code);
      }

      if (codes.length === quantity) break;
    }
  }

  const { data, error } = await supabase
    .from("profile_plates")
    .insert(
      codes.map((code) => ({
        code,
        status: "inactive" as const,
        public_url: buildProfilePlateUrl(code)
      }))
    )
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
