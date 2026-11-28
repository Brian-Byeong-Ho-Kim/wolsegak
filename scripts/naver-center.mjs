// 네이버 부동산 새 주소(fin.land)의 center 값 = UTM-K(EPSG:5179) 좌표(cm)에 고정 보정값을 더해 64진수 6자리로 쓴 것.
// 오산대 주변 URL 2개와 남양주·성남·분당 샘플로 보정값을 맞췄고, 지도 중심이 수백 m~1km쯤 어긋날 수 있다.
// EPSG:5179 (UTM-K) 순방향 변환 + 네이버 부동산 center 값 인코딩
export const A64 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
const OFF_X = 59382133607, OFF_Y = 58233041641;
export function utmk(lat, lng) {
  const a = 6378137, f = 1 / 298.257222101, e2 = 2 * f - f * f, ep2 = e2 / (1 - e2), k0 = 0.9996, d = Math.PI / 180;
  const phi = lat * d, lam = (lng - 127.5) * d, phi0 = 38 * d;
  const M = p => a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256) * p - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * p) + (15 * e2 * e2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * p) - (35 * e2 ** 3 / 3072) * Math.sin(6 * p));
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2), T = Math.tan(phi) ** 2, C = ep2 * Math.cos(phi) ** 2, Aa = lam * Math.cos(phi);
  const x = 1000000 + k0 * N * (Aa + (1 - T + C) * Aa ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * Aa ** 5 / 120);
  const y = 2000000 + k0 * (M(phi) - M(phi0) + N * Math.tan(phi) * (Aa * Aa / 2 + (5 - T + 9 * C + 4 * C * C) * Aa ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * Aa ** 6 / 720));
  return [x, y];
}
const enc6 = v => { let s = ''; for (let i = 0; i < 6; i++) { s = A64[v % 64] + s; v = Math.floor(v / 64); } return s; };
export function naverCenter(lat, lng) { const [x, y] = utmk(lat, lng); return enc6(Math.round(x * 100) + OFF_X) + '-' + enc6(Math.round(y * 100) + OFF_Y); }
