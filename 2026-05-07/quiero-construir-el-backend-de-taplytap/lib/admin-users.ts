import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function findExistingAuthUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) return null;

  const supabase = createSupabaseAdminClient();
  const perPage = 1000;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      throw new Error(error.message);
    }

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);

    if (user) return user;

    if (data.users.length < perPage) break;
  }

  return null;
}
