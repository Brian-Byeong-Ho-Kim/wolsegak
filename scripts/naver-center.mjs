// 네이버 부동산 새 주소(fin.land)의 center 값 = `경도-위도`. 각 값은 round(도 × 1e7) + 2e9 를 62진수(0-9a-zA-Z)로 쓴 것이다.
// (오산대·성남·분당·남양주 실제 주소 샘플을 풀어 위치가 정확히 맞는 것을 확인함. UTM-K 변환은 필요 없다.)
export const B62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const nTok = v => { let n = Math.round(v * 1e7) + 2e9, s = ''; while (n > 0) { s = B62[n % 62] + s; n = Math.floor(n / 62); } return s || '0'; };
export const naverCenter = (lat, lng) => nTok(lng) + '-' + nTok(lat);
