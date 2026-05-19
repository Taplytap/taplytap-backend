const publicQrOrigin = "https://app.taplytap.io";

export function buildPublicQrUrl(code: string) {
  return `${publicQrOrigin}/user/${code.trim()}`;
}
