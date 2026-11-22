# 월세각 (wolsegak)

대학가·사회초년생 전월세 적정가 체크. 학교 이름이나 동네를 고르고 보증금·월세를 넣으면, 같은 동네·비슷한 크기 집의 실제 전월세 계약과 비교해 "싼 편 / 적정 / 비싼 편"을 알려준다.

공개 주소: https://wolsegak.pages.dev

## 구조

- `public/index.html` — 정적 페이지 하나 (빌드 없음)
- `public/data/index.json` — 시군구 목록, 대학 캠퍼스 → 시군구 매핑
- `public/data/sgg/{시군구코드}.json` — 최근 12개월, 전용 85㎡ 이하 전월세 실거래
- `public/u/{학교}/index.html` — 학교별 자취방 월세 시세 페이지(검색 유입용), `public/u/index.html` 목록, `public/sitemap.xml` — `scripts/pages.mjs`가 만든다(데이터 갱신 때 자동)
- `public/og/*.png` — 링크 미리보기 이미지 (`python3 scripts/og.py`로 다시 만듦)
- `functions/_middleware.js` — 공유 링크(`/?r=…`)의 미리보기 제목·설명·이미지를 결과에 맞게 바꿈
- `public/data/prev/{시군구코드}.json` — 전년 동기 비교용 그 앞 12개월. 최근 12개월에서 밀려나는 달을 옮겨 담고 빈 달만 새로 받는다(처음 한 번은 12개월치를 더 받아 갱신이 2배쯤 걸림). 통계의 「전년 동기 대비」 타일·월별 그래프의 「작년 같은 달」 선, 학교 페이지의 전년 대비 문구에 쓴다.
- `data/univ_alias.json` — 학교 약칭·영문 이름(KAIST·카이스트, 성대 등). 학교 검색과 학교 페이지 제목에 쓴다.
- `scripts/build.mjs` — 국토교통부 전월세 실거래가 4종 API를 전국 시군구 × 12개월 호출해 위 파일 생성
- `.github/workflows/data.yml` — 매주 월요일 자동 갱신 (Actions 탭에서 수동 실행 가능)
- `data/univ.tsv` — 전국 대학·전문대 캠퍼스 (한국대학교육협의회 표준데이터 2026-03 기준, 사이버대·폐교 제외, 성균관대 자연과학캠퍼스·한국외대 글로벌캠퍼스 보완)
- `data/sgg_leaf.tsv` — 법정동코드 기준 시군구 (2026-11 행정표준코드관리시스템)
- `data/sgg_alias.json` — 2026년 개편 지역(전남광주통합특별시, 인천 제물포·영종·서해·검단구, 화성시 4개 구)의 옛 코드. 새 코드로 거래가 안 나오면 옛 코드로 받아 동 이름으로 나눈다.

## 검색 등록

- `public/robots.txt`, `public/sitemap.xml`(학교 페이지 포함 400여 개 주소), 홈 canonical·OG·구조화 데이터.
- 네이버 서치어드바이저·구글 서치콘솔에 `https://www.wolsegak.com` 등록 후 사이트맵 `https://www.wolsegak.com/sitemap.xml` 제출.

## 홍보 링크 추적

링크 뒤에 `?from=이름`(영문·숫자)을 붙여 뿌리면 `/stats/`의 「들어온 경로」에 `from:이름`으로 따로 센다. 예: `https://www.wolsegak.com/?from=everytime`. 공유 링크로 온 방문은 `share`, 다른 사이트에서 온 방문은 그 사이트 호스트만 기록한다.

## 인증키

공공데이터포털 일반 인증키(Decoding)를 GitHub > Settings > Secrets and variables > Actions > `DATA_GO_KR_KEY` 로 등록. 코드에 넣지 않는다.
필요한 활용신청: 국토교통부 단독/다가구·연립다세대·오피스텔·아파트 전월세 실거래가 자료.

## 판정 방법

- 비교 대상: 고른 시군구(·동), 집 종류, 면적 구간, 신규 계약(선택)
- 월세: 보증금이 비슷한 거래(1,000만원 이하면 0~2,000만원, 그 위면 0.5~2배)가 30건 이상이면 그 안에서 비교. 남은 보증금 차이는 환산월세(= 월세 + 보증금 × 전환율 ÷ 12)로 맞춤. 전환율 기본 6%, 화면에서 2~15% 조정 가능. (실거래 회귀로 지역 전환율을 추정해 봤으나 좋은 집일수록 보증금·월세가 함께 높아 값이 왜곡돼 쓰지 않음)
- 전세: ㎡당 보증금
- 분위: 25% 미만 싼 편 / 60% 미만 적정 / 80% 미만 조금 비싼 편 / 그 이상 비싼 편
- 법정 전환율 상한: 기준금리 + 2%p (`index.html`의 `BASE_RATE`, 현재 3.00% — 2026-10-22 금통위)

관리비는 실거래 신고에 없어 비교하지 못한다. 결과는 참고 추정치.

## 방문 통계

- `/stats/` (`public/stats/index.html`, noindex): 오늘·어제·7일·30일·전체 조회수·방문자, 「매물 검증하기」 횟수, 최근 30일 막대, 많이 검증한 지역. 주소를 아는 사람은 볼 수 있다.
- 기록: `public/visit.js`(쿠키 없음, 하루 한 브라우저 한 번만 방문자로 계산) → `POST /api/visits`(`functions/api/visits.js`). 검증 횟수는 `run()`이 `wsgEvent(시군구코드, 'wolse'|'jeonse')`로 보낸다(지역 코드와 월세/전세만, 보증금·월세 금액은 보내지 않는다). 날짜는 한국 시간.
- 내 방문 빼기: 주소 뒤에 `?nocount=1`을 붙여 한 번 열면 그 브라우저는 세지 않는다(`?nocount=0`으로 되돌림).
- **필요한 설정(한 번)**: Cloudflare Pages 프로젝트 → Settings → Bindings → D1 database, 변수 이름 `STATS_DB`. 표(`wsg_visits`, `wsg_events`)는 함수가 자동으로 만든다. 연결이 없으면 `/stats/`에 안내 문구가 나오고 기록은 건너뛴다.
- 로컬 확인: `npx wrangler pages dev public --d1 STATS_DB=wsg-local`.
