import { isSafeDestinationUrl } from "@/lib/security";
import type { QrStatus } from "@/lib/types";

export type QrFormValues = {
  status?: QrStatus;
  business_name: string;
  contact_name: string;
  whatsapp: string;
  owner_email: string;
  destination_url: string;
  place_id: string;
  shopify_order_number: string;
};

export type QrFormErrors = Partial<Record<keyof QrFormValues, string>>;

const validStatuses: QrStatus[] = ["inactive", "active", "blocked"];

export function readQrFormValues(formData: FormData): QrFormValues {
  const rawStatus = String(formData.get("status") ?? "").trim();

  return {
    status: validStatuses.includes(rawStatus as QrStatus) ? (rawStatus as QrStatus) : undefined,
    business_name: String(formData.get("business_name") ?? "").trim(),
    contact_name: String(formData.get("contact_name") ?? "").trim(),
    whatsapp: String(formData.get("whatsapp") ?? "").trim(),
    owner_email: String(formData.get("owner_email") ?? "").trim().toLowerCase(),
    destination_url: String(formData.get("destination_url") ?? "").trim(),
    place_id: normalizePlaceId(String(formData.get("place_id") ?? "")),
    shopify_order_number: String(formData.get("shopify_order_number") ?? "").trim()
  };
}

export function validateActivation(values: QrFormValues) {
  const errors: QrFormErrors = {};

  if (!values.business_name || values.business_name.length > 120) {
    errors.business_name = "Ingresa el nombre del negocio.";
  }

  if (!values.whatsapp || values.whatsapp.replace(/\D/g, "").length < 10) {
    errors.whatsapp = "Ingresa un WhatsApp con al menos 10 dígitos.";
  }

  if (!values.owner_email) {
    errors.owner_email = "Ingresa tu correo electrónico.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.owner_email) || values.owner_email.length > 160) {
    errors.owner_email = "Ingresa un email válido.";
  }

  if (!values.place_id) {
    errors.place_id = "Ingresa el Place ID de Google Maps.";
  }

  if (values.destination_url && !isSafeDestinationUrl(values.destination_url)) {
    errors.destination_url = "Ingresa una URL válida que empiece con https://.";
  }

  return errors;
}

export function validateAdminQr(values: QrFormValues) {
  const errors: QrFormErrors = {};

  if (!values.status) {
    errors.status = "Selecciona un estado válido.";
  }

  if (values.business_name.length > 120) {
    errors.business_name = "Máximo 120 caracteres.";
  }

  if (values.destination_url && !isSafeDestinationUrl(values.destination_url)) {
    errors.destination_url = "Ingresa una URL válida que empiece con https://.";
  }

  if (values.place_id.length > 220) {
    errors.place_id = "Máximo 220 caracteres.";
  }

  if (values.status === "active" && !values.destination_url) {
    errors.destination_url = "Un QR activo necesita una URL destino.";
  }

  validateOptionalContactFields(values, errors);

  return errors;
}

export function hasQrFormErrors(errors: QrFormErrors) {
  return Object.keys(errors).length > 0;
}

function validateOptionalContactFields(values: QrFormValues, errors: QrFormErrors) {
  if (values.owner_email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.owner_email) || values.owner_email.length > 160)) {
    errors.owner_email = "Ingresa un email válido.";
  }

  if (values.whatsapp && values.whatsapp.replace(/\D/g, "").length < 10) {
    errors.whatsapp = "Ingresa al menos 10 dígitos.";
  }

  if (values.contact_name.length > 120) {
    errors.contact_name = "Máximo 120 caracteres.";
  }

  if (values.shopify_order_number.length > 80) {
    errors.shopify_order_number = "Máximo 80 caracteres.";
  }
}

export function normalizePlaceId(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const placeId = url.searchParams.get("placeid");

    if (placeId) {
      return placeId.replace(/\s/g, "");
    }
  } catch {
    // Plain Place IDs are expected. URLs are handled only when parsing succeeds.
  }

  const match = trimmed.match(/[?&]placeid=([^&\s]+)/i);

  if (match?.[1]) {
    return decodeURIComponent(match[1]).replace(/\s/g, "");
  }

  return trimmed.replace(/\s/g, "");
}

export function createGoogleReviewUrl(placeId: string) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}
