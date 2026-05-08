import { redirect } from "next/navigation";
import { assertAdminEnv, getAdminEmails } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAdminUser() {
  try {
    assertAdminEnv();
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user?.email) return null;

    const adminEmails = getAdminEmails();
    const isAdmin = adminEmails.includes(user.email.toLowerCase());

    return isAdmin ? user : null;
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  let userEmail: string | null = null;

  try {
    assertAdminEnv();
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    userEmail = error || !user?.email ? null : user.email.toLowerCase();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Auth configuration failed.";
    redirect(`/login?error=config&message=${encodeURIComponent(message)}`);
  }

  if (!userEmail) {
    redirect("/login?error=session&message=No%20se%20encontr%C3%B3%20una%20sesi%C3%B3n%20activa.");
  }

  const isAdmin = getAdminEmails().includes(userEmail);

  if (!isAdmin) {
    redirect("/login?error=unauthorized&message=Este%20email%20no%20est%C3%A1%20autorizado%20para%20administrar%20TaplyTap.");
  }

  return { email: userEmail };
}
