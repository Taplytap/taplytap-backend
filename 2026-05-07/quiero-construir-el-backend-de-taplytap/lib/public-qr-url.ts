export const PUBLIC_QR_BASE_URL = "https://app.taplytap.io";

export function buildPublicQrUrl(code: string) {
  return `${PUBLIC_QR_BASE_URL}/user/${code.trim()}`;
}
