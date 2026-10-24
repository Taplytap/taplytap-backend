import { NextRequest, NextResponse } from "next/server";
import { findExistingAuthUserByEmail } from "@/lib/admin-users";
import { getSupportUser } from "@/lib/auth";
import { getFacebookProfileUrlError, normalizeFacebookProfileUrl } from "@/lib/facebook-url";
import { getInstagramProfileUrlError, normalizeInstagramProfileUrl } from "@/lib/instagram-url";
import { normalizeProfileLinks, profileLinkTypes } from "@/lib/profile-links";
import type { ProfileLinkInput } from "@/lib/profile-links";
import { createGoogleReviewUrl, normalizePlaceId } from "@/lib/qr-form";
import { isSafeDestinationUrl, isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json, QrStatus } from "@/lib/types";

type RouteContext = {
  params: {
    type: string;
    code: string;
  };
};

type PlateType = "google" | "instagram" | "facebook" | "profile";

type RequestBody = {
  status?: unknown;
  business_name?: unknown;
  contact_name?: unknown;
  whatsapp?: unknown;
  owner_email?: unknown;
  place_id?: unknown;
  destination_url?: unknown;
  instagram_handle?: unknown;
  facebook_handle?: unknown;
  description?: unknown;
  links?: unknown;
  clear_owner_confirm?: unknown;
};

const validTypes: PlateType[] = ["google", "instagram", "facebook", "profile"];
const validStatuses: QrStatus[] = ["inactive", "active", "blocked"];

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const actor = await getSupportUser();

  if (!actor?.id || !actor.email) {
    return NextResponse.json({ error: "No tienes permiso para editar placas." }, { status: 403 });
  }

  const type = validTypes.includes(params.type as PlateType) ? (params.type as PlateType) : null;
  const code = normalizeCode(params.code);

  if (!type || !isValidCode(code)) {
    return NextResponse.json({ error: "Tipo o código de placa inválido." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as RequestBody;

  try {
    if (type === "google") return updateGooglePlate(actor.id, actor.email, code, body);
    if (type === "instagram") return updateInstagramPlate(actor.id, actor.email, code, body);
    if (type === "facebook") return updateFacebookPlate(actor.id, actor.email, code, body);
    return updateProfilePlate(actor.id, actor.email, code, body);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No pudimos actualizar la placa." },
      { status: 500 }
    );
  }
}

async function updateGooglePlate(actorId: string, actorEmail: string, code: string, body: RequestBody) {
  const supabase = createSupabaseAdminClient();
  const { data: current, error: currentError } = await supabase.from("qr_codes").select("*").eq("code", code).maybeSingle();

  if (currentError) throw new Error(currentError.message);
  if (!current) return NextResponse.json({ error: "No encontramos esta placa Google." }, { status: 404 });

  const status = readStatus(body.status);
  const businessName = readText(body.business_name, 120);
  const contactName = readText(body.contact_name, 120);
  const whatsapp = readText(body.whatsapp, 30);
  const placeId = normalizePlaceId(readText(body.place_id, 500));
  let destinationUrl = readText(body.destination_url, 2000);

  if (!status) return badRequest("Selecciona un estado válido.");
  if (whatsapp && whatsapp.replace(/\D/g, "").length < 10) return badRequest("WhatsApp debe tener al menos 10 dígitos.");
  if (placeId.length > 220) return badRequest("El Place ID es demasiado largo.");
  if (!destinationUrl && placeId) destinationUrl = createGoogleReviewUrl(placeId);
  if (destinationUrl && !isSafeDestinationUrl(destinationUrl)) return badRequest("Ingresa una URL destino segura con https://.");
  if (status === "active" && !destinationUrl) return badRequest("Una placa activa necesita una URL destino.");

  const owner = await resolveOwner(body, current.owner_email, current.owner_user_id);
  if (!owner.ok) return badRequest(owner.error);

  const update = {
    status,
    business_name: businessName || null,
    contact_name: contactName || null,
    whatsapp: whatsapp || null,
    owner_email: owner.email,
    owner_user_id: owner.userId,
    claimed_at: owner.userId ? current.claimed_at ?? new Date().toISOString() : null,
    place_id: placeId || null,
    destination_url: destinationUrl || null,
    activated_at: status === "active" ? current.activated_at ?? new Date().toISOString() : null
  };

  const { data: saved, error } = await supabase.from("qr_codes").update(update).eq("id", current.id).select("*").maybeSingle();
  if (error) throw new Error(error.message);

  const auditError = await insertAudit(actorId, actorEmail, "google", current.id, code, current as unknown as Json, saved as unknown as Json);
  if (auditError) {
    await supabase.from("qr_codes").update(toGoogleRollback(current)).eq("id", current.id);
    throw new Error(`No se guardó la auditoría: ${auditError}`);
  }

  return NextResponse.json({ ok: true, plate: saved });
}

async function updateInstagramPlate(actorId: string, actorEmail: string, code: string, body: RequestBody) {
  const supabase = createSupabaseAdminClient();
  const { data: current, error: currentError } = await supabase.from("instagram_plates").select("*").eq("code", code).maybeSingle();

  if (currentError) throw new Error(currentError.message);
  if (!current) return NextResponse.json({ error: "No encontramos esta placa de Instagram." }, { status: 404 });

  const status = readStatus(body.status);
  const businessName = readText(body.business_name, 120);
  const handle = readText(body.instagram_handle, 120);
  const destinationUrl = normalizeInstagramProfileUrl(readText(body.destination_url, 2000));

  if (!status) return badRequest("Selecciona un estado válido.");
  const destinationError = destinationUrl ? getInstagramProfileUrlError(destinationUrl) : null;
  if (destinationError) return badRequest(destinationError);
  if (status === "active" && !destinationUrl) return badRequest("Una placa activa necesita un enlace de Instagram.");

  const owner = await resolveOwner(body, current.owner_email, current.owner_user_id);
  if (!owner.ok) return badRequest(owner.error);

  const update = {
    status,
    business_name: businessName || null,
    instagram_handle: handle || null,
    destination_url: destinationUrl || null,
    owner_email: owner.email,
    owner_user_id: owner.userId,
    activated_at: status === "active" ? current.activated_at ?? new Date().toISOString() : null
  };
  const { data: saved, error } = await supabase.from("instagram_plates").update(update).eq("id", current.id).select("*").maybeSingle();
  if (error) throw new Error(error.message);

  const auditError = await insertAudit(actorId, actorEmail, "instagram", current.id, code, current as unknown as Json, saved as unknown as Json);
  if (auditError) {
    await supabase.from("instagram_plates").update(toInstagramRollback(current)).eq("id", current.id);
    throw new Error(`No se guardó la auditoría: ${auditError}`);
  }

  return NextResponse.json({ ok: true, plate: saved });
}

async function updateFacebookPlate(actorId: string, actorEmail: string, code: string, body: RequestBody) {
  const supabase = createSupabaseAdminClient();
  const { data: current, error: currentError } = await supabase.from("facebook_plates").select("*").eq("code", code).maybeSingle();

  if (currentError) throw new Error(currentError.message);
  if (!current) return NextResponse.json({ error: "No encontramos esta placa de Facebook." }, { status: 404 });

  const status = readStatus(body.status);
  const businessName = readText(body.business_name, 120);
  const handle = readText(body.facebook_handle, 120);
  const destinationUrl = normalizeFacebookProfileUrl(readText(body.destination_url, 2000));

  if (!status) return badRequest("Selecciona un estado válido.");
  const destinationError = destinationUrl ? getFacebookProfileUrlError(destinationUrl) : null;
  if (destinationError) return badRequest(destinationError);
  if (status === "active" && !destinationUrl) return badRequest("Una placa activa necesita un enlace de Facebook.");

  const owner = await resolveOwner(body, current.owner_email, current.owner_user_id);
  if (!owner.ok) return badRequest(owner.error);

  const update = {
    status,
    business_name: businessName || null,
    facebook_handle: handle || null,
    destination_url: destinationUrl || null,
    owner_email: owner.email,
    owner_user_id: owner.userId,
    activated_at: status === "active" ? current.activated_at ?? new Date().toISOString() : null
  };
  const { data: saved, error } = await supabase.from("facebook_plates").update(update).eq("id", current.id).select("*").maybeSingle();
  if (error) throw new Error(error.message);

  const auditError = await insertAudit(actorId, actorEmail, "facebook", current.id, code, current as unknown as Json, saved as unknown as Json);
  if (auditError) {
    await supabase.from("facebook_plates").update(toFacebookRollback(current)).eq("id", current.id);
    throw new Error(`No se guardó la auditoría: ${auditError}`);
  }

  return NextResponse.json({ ok: true, plate: saved });
}

async function updateProfilePlate(actorId: string, actorEmail: string, code: string, body: RequestBody) {
  const supabase = createSupabaseAdminClient();
  const { data: current, error: currentError } = await supabase.from("profile_plates").select("*").eq("code", code).maybeSingle();

  if (currentError) throw new Error(currentError.message);
  if (!current) return NextResponse.json({ error: "No encontramos esta Profile Plate." }, { status: 404 });

  const { data: previousLinks, error: linksError } = await supabase.from("profile_links").select("*").eq("profile_plate_id", current.id);
  if (linksError) throw new Error(linksError.message);

  const status = readStatus(body.status);
  const businessName = readText(body.business_name, 120);
  const description = readText(body.description, 240);
  if (!status) return badRequest("Selecciona un estado válido.");
  if (!businessName) return badRequest("Ingresa el nombre del perfil.");

  const submittedLinks = Array.isArray(body.links) ? body.links : [];
  const safeLinks: ProfileLinkInput[] = profileLinkTypes.map((type, index) => {
    const submitted = submittedLinks.find((item) => isRecord(item) && item.type === type);
    return {
      type,
      value: isRecord(submitted) ? String(submitted.value ?? "") : "",
      enabled: isRecord(submitted) ? Boolean(submitted.enabled) : false,
      sort_order: isRecord(submitted) && Number.isInteger(submitted.sort_order) ? Number(submitted.sort_order) : index
    };
  });
  const normalized = normalizeProfileLinks(safeLinks);
  const firstLinkError = Object.values(normalized.errors)[0];
  if (firstLinkError) return badRequest(firstLinkError);
  if (status === "active" && normalized.links.length === 0) return badRequest("Un perfil activo necesita al menos un enlace.");

  const owner = await resolveOwner(body, current.owner_email, current.owner_user_id);
  if (!owner.ok) return badRequest(owner.error);

  const update = {
    status,
    business_name: businessName,
    description: description || null,
    owner_email: owner.email,
    owner_user_id: owner.userId,
    activated_at: status === "active" ? current.activated_at ?? new Date().toISOString() : null
  };
  const { data: saved, error } = await supabase.from("profile_plates").update(update).eq("id", current.id).select("*").maybeSingle();
  if (error) throw new Error(error.message);

  const { error: deleteError } = await supabase.from("profile_links").delete().eq("profile_plate_id", current.id);
  if (deleteError) {
    await supabase.from("profile_plates").update(toProfileRollback(current)).eq("id", current.id);
    throw new Error(deleteError.message);
  }

  if (normalized.links.length > 0) {
    const { error: insertError } = await supabase.from("profile_links").insert(
      normalized.links.map((link) => ({ ...link, profile_plate_id: current.id }))
    );
    if (insertError) {
      await restoreProfile(supabase, current, previousLinks ?? []);
      throw new Error(insertError.message);
    }
  }

  const nextSnapshot = { ...saved, links: normalized.links } as unknown as Json;
  const previousSnapshot = { ...current, links: previousLinks ?? [] } as unknown as Json;
  const auditError = await insertAudit(actorId, actorEmail, "profile", current.id, code, previousSnapshot, nextSnapshot);
  if (auditError) {
    await restoreProfile(supabase, current, previousLinks ?? []);
    throw new Error(`No se guardó la auditoría: ${auditError}`);
  }

  return NextResponse.json({ ok: true, plate: saved, links: normalized.links });
}

async function resolveOwner(body: RequestBody, currentEmail: string | null, currentUserId: string | null) {
  const email = String(body.owner_email ?? "").trim().toLowerCase();

  if (!email) {
    if ((currentEmail || currentUserId) && body.clear_owner_confirm !== true) {
      return { ok: false as const, error: "Confirma que quieres dejar esta placa sin propietario." };
    }
    return { ok: true as const, email: null, userId: null };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return { ok: false as const, error: "Ingresa un correo de propietario válido." };
  }

  if (email === currentEmail?.toLowerCase() && currentUserId) {
    return { ok: true as const, email, userId: currentUserId };
  }

  const user = await findExistingAuthUserByEmail(email);
  if (!user?.id || !user.email) {
    return { ok: false as const, error: "No existe una cuenta registrada con ese correo." };
  }

  return { ok: true as const, email: user.email.toLowerCase(), userId: user.id };
}

async function insertAudit(
  actorId: string,
  actorEmail: string,
  plateType: PlateType,
  plateId: string,
  code: string,
  previousData: Json,
  newData: Json
) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("support_plate_audit_logs").insert({
    actor_user_id: actorId,
    actor_email: actorEmail.toLowerCase(),
    plate_type: plateType,
    plate_id: plateId,
    code,
    action: "update",
    previous_data: previousData,
    new_data: newData
  });
  return error?.message ?? null;
}

async function restoreProfile(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  current: Parameters<typeof toProfileRollback>[0],
  previousLinks: Array<Record<string, unknown>>
) {
  await supabase.from("profile_plates").update(toProfileRollback(current)).eq("id", current.id);
  await supabase.from("profile_links").delete().eq("profile_plate_id", current.id);
  if (previousLinks.length > 0) {
    await supabase.from("profile_links").insert(previousLinks as never);
  }
}

function readStatus(value: unknown) {
  const status = String(value ?? "") as QrStatus;
  return validStatuses.includes(status) ? status : null;
}

function readText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toGoogleRollback(current: {
  status: QrStatus; business_name: string | null; contact_name: string | null; whatsapp: string | null;
  owner_email: string | null; owner_user_id: string | null; claimed_at: string | null; place_id: string | null;
  destination_url: string | null; activated_at: string | null;
}) {
  return {
    status: current.status, business_name: current.business_name, contact_name: current.contact_name,
    whatsapp: current.whatsapp, owner_email: current.owner_email, owner_user_id: current.owner_user_id,
    claimed_at: current.claimed_at, place_id: current.place_id, destination_url: current.destination_url,
    activated_at: current.activated_at
  };
}

function toInstagramRollback(current: {
  status: QrStatus; business_name: string | null; instagram_handle: string | null; destination_url: string | null;
  owner_email: string | null; owner_user_id: string | null; activated_at: string | null;
}) {
  return {
    status: current.status, business_name: current.business_name, instagram_handle: current.instagram_handle,
    destination_url: current.destination_url, owner_email: current.owner_email, owner_user_id: current.owner_user_id,
    activated_at: current.activated_at
  };
}

function toFacebookRollback(current: {
  status: QrStatus; business_name: string | null; facebook_handle: string | null; destination_url: string | null;
  owner_email: string | null; owner_user_id: string | null; activated_at: string | null;
}) {
  return {
    status: current.status, business_name: current.business_name, facebook_handle: current.facebook_handle,
    destination_url: current.destination_url, owner_email: current.owner_email, owner_user_id: current.owner_user_id,
    activated_at: current.activated_at
  };
}

function toProfileRollback(current: {
  id: string; status: QrStatus; business_name: string | null; description: string | null;
  owner_email: string | null; owner_user_id: string | null; activated_at: string | null;
}) {
  return {
    status: current.status, business_name: current.business_name, description: current.description,
    owner_email: current.owner_email, owner_user_id: current.owner_user_id, activated_at: current.activated_at
  };
}
