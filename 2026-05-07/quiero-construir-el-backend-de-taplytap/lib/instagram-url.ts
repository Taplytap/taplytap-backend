const allowedInstagramHosts = new Set(["instagram.com", "www.instagram.com"]);

export function normalizeInstagramProfileUrl(value: string) {
  return value.trim();
}

export function isValidInstagramProfileUrl(value: string) {
  const normalizedValue = normalizeInstagramProfileUrl(value);

  try {
    const url = new URL(normalizedValue);
    return url.protocol === "https:" && allowedInstagramHosts.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function getInstagramProfileUrlError(value: string) {
  if (!value.trim()) {
    return "Pega el enlace de tu perfil de Instagram.";
  }

  if (!isValidInstagramProfileUrl(value)) {
    return "Pega un enlace válido de Instagram que empiece con https://instagram.com o https://www.instagram.com.";
  }

  return null;
}
