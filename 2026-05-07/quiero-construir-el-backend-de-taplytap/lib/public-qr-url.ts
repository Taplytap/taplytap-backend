export const PUBLIC_QR_BASE_URL = "https://app.taplytap.io";

export function buildPublicQrUrl(code: string) {
  return `${PUBLIC_QR_BASE_URL}/user/${code.trim()}`;
}

export function buildInstagramPlateUrl(code: string) {
  return `${PUBLIC_QR_BASE_URL}/instagram/${code.trim()}`;
}
