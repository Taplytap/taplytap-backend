import { randomBytes } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";

export function createQrCodeValue(length = 8) {
  const bytes = randomBytes(length);

  return Array.from(bytes)
    .map((byte) => alphabet[byte % alphabet.length])
    .join("");
}

export async function createQrCodesBatch(quantity: number) {
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
    const { data: existing, error: lookupError } = await supabase
      .from("qr_codes")
      .select("code")
      .in("code", candidateList);

    if (lookupError) {
      throw new Error(lookupError.message);
    }

    const existingCodes = new Set((existing ?? []).map((row) => row.code));

    for (const code of candidateList) {
      if (!existingCodes.has(code)) {
        codes.push(code);
      }

      if (codes.length === quantity) break;
    }
  }

  const { data, error } = await supabase
    .from("qr_codes")
    .insert(
      codes.map((code) => ({
        code,
        status: "inactive" as const
      }))
    )
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
