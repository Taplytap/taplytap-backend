import { redirect } from "next/navigation";
import { assertAdminEnv, assertSupportEnv, getAdminEmails, getSupportEmails } from "@/lib/env";
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
    redirect(`/admin/login?error=config&message=${encodeURIComponent(message)}`);
  }

  if (!userEmail) {
    redirect("/admin/login?error=session&message=No%20se%20encontr%C3%B3%20una%20sesi%C3%B3n%20activa.");
  }

  const isAdmin = getAdminEmails().includes(userEmail);

  if (!isAdmin) {
    redirect("/admin/login?error=unauthorized&message=No%20tienes%20permiso%20para%20acceder%20al%20admin.");
  }

  return { email: userEmail };
}

export async function getSupportUser() {
  try {
    assertSupportEnv();
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user?.email) return null;

    const supportEmails = getSupportEmails();
    const isSupport = supportEmails.includes(user.email.toLowerCase());

    return isSupport ? user : null;
  } catch {
    return null;
  }
}

export async function requireSupport() {
  let user: { id: string; email?: string } | null = null;

  try {
    assertSupportEnv();
    const supabase = createSupabaseServerClient();
    const {
      data: { user: sessionUser },
      error
    } = await supabase.auth.getUser();

    user = error || !sessionUser?.email ? null : sessionUser;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Support auth configuration failed.";
    redirect(`/support/login?error=config&message=${encodeURIComponent(message)}`);
  }

  if (!user?.email) {
    redirect("/support/login?error=session&message=No%20se%20encontr%C3%B3%20una%20sesi%C3%B3n%20activa.");
  }

  const supportEmail = user.email.toLowerCase();
  const isSupport = getSupportEmails().includes(supportEmail);

  if (!isSupport) {
    redirect("/support/login?error=unauthorized&message=No%20tienes%20permiso%20para%20acceder%20a%20soporte.");
  }

  return { id: user.id, email: supportEmail };
}
