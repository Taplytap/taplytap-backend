import { redirect } from "next/navigation";
import { getAdminEmails } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAdminUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user?.email) return null;

  const adminEmails = getAdminEmails();
  const isAdmin = adminEmails.includes(user.email.toLowerCase());

  return isAdmin ? user : null;
}

export async function requireAdmin() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    redirect("/login");
  }

  const adminEmails = getAdminEmails();
  const isAdmin = adminEmails.includes(user.email.toLowerCase());

  if (!isAdmin) {
    redirect("/unauthorized");
  }

  return user;
}
