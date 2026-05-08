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
  const codes = new Set<string>();

  while (codes.size < quantity) {
    codes.add(createQrCodeValue());
  }

  const { data, error } = await supabase
    .from("qr_codes")
    .insert(
      Array.from(codes).map((code) => ({
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
