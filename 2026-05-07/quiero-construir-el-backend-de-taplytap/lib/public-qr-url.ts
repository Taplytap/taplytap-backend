export const PUBLIC_QR_BASE_URL = "https://app.taplytap.io";

export function buildPublicQrUrl(code: string) {
  return `${PUBLIC_QR_BASE_URL}/user/${code.trim()}`;
}

export function buildInstagramPlateUrl(code: string) {
  return `${PUBLIC_QR_BASE_URL}/instagram/${code.trim()}`;
}

export function buildFacebookPlateUrl(code: string) {
  return `${PUBLIC_QR_BASE_URL}/facebook/${code.trim()}`;
}

export function buildProfilePlateUrl(code: string) {
  return `${PUBLIC_QR_BASE_URL}/p/${code.trim()}`;
}
