const requiredServerEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
] as const;

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export function assertServerEnv() {
  const missing = requiredServerEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (supabaseUrl && !isValidSupabaseProjectUrl(supabaseUrl)) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be the Supabase project URL without /rest/v1.");
  }
}

export function getAdminEmails() {
  return [process.env.ADMIN_EMAILS, process.env.ADMIN_EMAIL]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function assertAdminEnv() {
  if (getAdminEmails().length === 0) {
    throw new Error("Missing ADMIN_EMAILS or ADMIN_EMAIL.");
  }
}

export function getSupportEmail() {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@example.com";
}

export function requireServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return key;
}

function isValidSupabaseProjectUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.pathname.replace(/\/$/, "") === "";
  } catch {
    return false;
  }
}
