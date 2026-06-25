import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { assertServerEnv, requireServiceRoleKey } from "@/lib/env";
import { logServerError } from "@/lib/server-log";

export function createSupabaseAdminClient() {
  try {
    assertServerEnv();
  } catch (error) {
    logServerError("createSupabaseAdminClient assertServerEnv", error);
    throw error;
  }

  let serviceRoleKey: string;

  try {
    serviceRoleKey = requireServiceRoleKey();
  } catch (error) {
    logServerError("createSupabaseAdminClient requireServiceRoleKey", error);
    throw error;
  }

  try {
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
  } catch (error) {
    logServerError("createSupabaseAdminClient createClient", error);
    throw error;
  }
}
