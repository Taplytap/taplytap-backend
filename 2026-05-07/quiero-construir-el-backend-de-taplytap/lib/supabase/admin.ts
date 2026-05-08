import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { assertServerEnv, requireServiceRoleKey } from "@/lib/env";

export function createSupabaseAdminClient() {
  assertServerEnv();

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    requireServiceRoleKey(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}
