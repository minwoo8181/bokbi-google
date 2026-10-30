# 아파트 원본 데이터

아파트 시장 데이터만 이 폴더에 넣는다. 중개사 명단은 `data/brokers/`, 특약 엑셀은 `data/special-terms/`.
스크립트는 폴더마다 **파일 이름 날짜가 가장 늦은 것**을 읽으므로 지난 파일은 지우지 않고 쌓아 둔다 (주간 추세 비교용).

| 폴더 | 넣는 파일 (이름 규칙) | 읽는 스크립트 |
|---|---|---|
| `naver/` | `naver_complexes_YYYYMMDD.csv` + `naver_pyeongs_YYYYMMDD.csv` (**같은 날짜 한 쌍**), 검증 리포트 | `npm run data:build`, `npm run data:info`, `units:fetch` |
| `trades/` | `다산동_아파트_실거래_매물현황_YYYYMMDD.xlsx`, 국토부 API `molit-apt-trades-*.json`·`molit-apt-rent-*.json`, 실거래 다운로드 CSV | `npm run data:build` |
| `index/` | `rone-indices-YYYYMM.json` (R-ONE 지수) | `npm run data:build` |
| `units/` | `building-units-YYYYMMDD.json` (건축물대장, `units:fetch`가 만듦), `shared-lot-dongs.json`, `complex-ids.json` (단지 고정 ID — 직접 고치지 않는다) | `npm run data:build` |

새 매물을 받았을 때: `naver/`에 CSV 한 쌍을 넣는다. 화면 반영(`npm run data:build`)은 배포 직전에만 한다.
