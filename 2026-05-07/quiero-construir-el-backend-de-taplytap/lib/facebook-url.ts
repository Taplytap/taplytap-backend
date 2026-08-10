const allowedFacebookHosts = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com"]);

export function normalizeFacebookProfileUrl(value: string) {
  return value.trim();
}

export function isValidFacebookProfileUrl(value: string) {
  const normalizedValue = normalizeFacebookProfileUrl(value);

  try {
    const url = new URL(normalizedValue);
    return url.protocol === "https:" && allowedFacebookHosts.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function getFacebookProfileUrlError(value: string) {
  if (!value.trim()) {
    return "Pega el enlace de tu perfil de Facebook.";
  }

  if (!isValidFacebookProfileUrl(value)) {
    return "Pega un enlace válido de Facebook que empiece con https://facebook.com, https://www.facebook.com, https://m.facebook.com o https://fb.com.";
  }

  return null;
}
