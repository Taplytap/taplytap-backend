export const profileLinkTypes = [
  "instagram",
  "whatsapp",
  "facebook",
  "google_reviews",
  "tiktok",
  "website"
] as const;

export type ProfileLinkType = (typeof profileLinkTypes)[number];

export type ProfileLinkInput = {
  type: ProfileLinkType;
  value: string;
  enabled: boolean;
  sort_order: number;
};

export type NormalizedProfileLink = {
  type: ProfileLinkType;
  label: string;
  source_value: string;
  url: string;
  enabled: boolean;
  sort_order: number;
};

export const profileLinkLabels: Record<ProfileLinkType, string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  google_reviews: "Déjanos una reseña",
  tiktok: "TikTok",
  website: "Sitio web"
};

const allowedHosts: Record<Exclude<ProfileLinkType, "whatsapp" | "google_reviews">, Set<string>> = {
  instagram: new Set(["instagram.com", "www.instagram.com"]),
  facebook: new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com"]),
  tiktok: new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com"]),
  website: new Set()
};

export function normalizeProfileLinks(inputs: ProfileLinkInput[]) {
  const links: NormalizedProfileLink[] = [];
  const errors: Record<string, string> = {};

  for (const input of inputs) {
    const rawValue = input.value.trim();

    if (!rawValue) continue;

    const normalized = normalizeProfileLink(input);

    if (!normalized.ok) {
      errors[input.type] = normalized.error;
      continue;
    }

    links.push(normalized.link);
  }

  return {
    links: links.sort((first, second) => first.sort_order - second.sort_order),
    errors
  };
}

export function getProfileLinkLabel(type: ProfileLinkType) {
  return profileLinkLabels[type];
}

export function normalizeProfilePlaceId(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const placeId = url.searchParams.get("placeid");

    if (placeId) {
      return placeId.replace(/\s/g, "");
    }
  } catch {
    // Plain Place IDs are supported.
  }

  const match = trimmed.match(/[?&]placeid=([^&\s]+)/i);

  if (match?.[1]) {
    return decodeURIComponent(match[1]).replace(/\s/g, "");
  }

  return trimmed.replace(/\s/g, "");
}

export function createProfileGoogleReviewUrl(placeId: string) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

function normalizeProfileLink(input: ProfileLinkInput) {
  const enabled = Boolean(input.enabled);
  const sortOrder = Number.isInteger(input.sort_order) ? input.sort_order : 0;

  if (input.type === "whatsapp") {
    const digits = input.value.replace(/\D/g, "");

    if (digits.length < 10 || digits.length > 15) {
      return { ok: false as const, error: "Ingresa un WhatsApp válido de 10 a 15 dígitos." };
    }

    return {
      ok: true as const,
      link: {
        type: input.type,
        label: profileLinkLabels[input.type],
        source_value: digits,
        url: `https://wa.me/${digits}`,
        enabled,
        sort_order: sortOrder
      }
    };
  }

  if (input.type === "google_reviews") {
    const placeId = normalizeProfilePlaceId(input.value);

    if (!placeId) {
      return { ok: false as const, error: "Ingresa el Place ID de Google Maps." };
    }

    if (placeId.length > 220) {
      return { ok: false as const, error: "El Place ID es demasiado largo." };
    }

    return {
      ok: true as const,
      link: {
        type: input.type,
        label: profileLinkLabels[input.type],
        source_value: placeId,
        url: createProfileGoogleReviewUrl(placeId),
        enabled,
        sort_order: sortOrder
      }
    };
  }

  return normalizeUrlLink(input.type, input.value, enabled, sortOrder);
}

function normalizeUrlLink(
  type: Exclude<ProfileLinkType, "whatsapp" | "google_reviews">,
  value: string,
  enabled: boolean,
  sortOrder: number
) {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();

    if (url.protocol !== "https:") {
      return { ok: false as const, error: "El enlace debe empezar con https://." };
    }

    if (type !== "website" && !allowedHosts[type].has(hostname)) {
      return { ok: false as const, error: `Ingresa un enlace válido para ${profileLinkLabels[type]}.` };
    }

    return {
      ok: true as const,
      link: {
        type,
        label: profileLinkLabels[type],
        source_value: url.toString(),
        url: url.toString(),
        enabled,
        sort_order: sortOrder
      }
    };
  } catch {
    return { ok: false as const, error: "Ingresa una URL válida." };
  }
}
