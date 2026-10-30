# 매물 단위 호가 파일 — `naver_listings_YYYYMMDD.csv` (2026-10-27)

> 복비 분석 화면의 **"지금 나온 매물 호가"**(평형 × 층 구간)와 **매월 호가 최저** 그래프용.
> 기존 집계 CSV(`naver_complexes_*`, `naver_pyeongs_*`)는 그대로 두고 파일만 추가했다.
>
> **2026-10-29 변경**: 받는 파일은 5개 — `naver_complexes`·`naver_pyeongs`·`naver_listings`·`bokbi_flows`·`manifest_YYYYMMDD.json`. 검증리포트 md는 manifest(`checks`·`status`)로 대체, `bokbi_analysis`·`bokbi_trades`는 받지 않음. `data/market/naver/`에는 이 5종만 둔다.

---

## 1. 한 회차 = 한 폴더 (네 파일)

회차 폴더 `data/exports/YYYYMMDD[_N]/` 안에 **같은 회차 데이터로 네 파일**이 들어간다.
대표님이 이 폴더를 통째로 복사해 덮어쓴다. (수집기는 복비 폴더에 쓰지 않는다)

| 파일 | 내용 |
|---|---|
| `naver_complexes_YYYYMMDD.csv` | 단지 집계 |
| `naver_pyeongs_YYYYMMDD.csv` | 평형 집계 |
| `naver_listings_YYYYMMDD.csv` | 매물 단위 호가 (18열) |
| `naver_집계_검증리포트_YYYYMMDD.md` | 위 세 파일 검증 (맨 위에 "이 폴더를 복사하세요") |

- 세 CSV의 `observed_at_KST` 는 **같은 값**이다(한 번의 실행에서 나온 값).
- 같은 날 여러 번 돌렸다면 **가장 최근 회차 폴더 하나만** 복사하면 된다.
- `data/market/naver/naver_listings_YYYYMMDD.csv` 는 그날 마지막 회차의 **사본**이다(누적·그래프용).
- 지난 회차 폴더와 파일은 지우지 않고 쌓는다.

## 2. 열 (18개, 순서 고정)

| 열 | 예 | 어디서 오나 |
|---|---|---|
| `observed_at_KST` | 2026-10-27 15:02 | 수집 시각 (파일 안에서 동일) |
| `naver_complex_no` | 110299 | 단지 번호 |
| `apt_name` | e편한세상다산 | 부록 A 단지명 |
| `article_no` | 2512345678 | `representativeArticleInfo.articleNumber` |
| `trade_type` | 매매 / 전세 | 거래 유형 (월세는 수집하지 않음) |
| `pyeong_name` | 34A | `pyeongList.name` 변환값 — **`naver_pyeongs_*`와 같은 표기** |
| `supply_m2` | 112.74 | `spaceInfo.supplySpace` |
| `exclusive_m2` | 84.96 | `spaceInfo.exclusiveSpace` |
| `floor_raw` | 고/25 · 12/25 · 저/18 | `articleDetail.floorInfo` **가공 없이** |
| `floor_num` | 12 | `floorDetailInfo.targetFloor` (숫자일 때만, 고·중·저면 빈 값) |
| `floor_total` | 25 | `floorDetailInfo.totalFloor` |
| `price_manwon` | 140000 | 대표 매물 호가 (매매 `dealPrice` / 전세 `warrantyPrice`, 만 원) |
| `monthly_rent_manwon` | (빈 값) | 월세만. 현재 수집 안 함 |
| `confirmed_ymd` | 2026-10-21 | `verificationInfo.articleConfirmDate` |
| `same_listing_count` | 3 | `duplicatedArticleInfo.realtorCount` (없으면 1) |
| `dong_raw` | (빈 값) | 목록 API에 동 표기가 없다(`dongName`은 지번 본번) |
| `group_min_manwon` | 98500 | **묶음 안 최저 호가** (`representativePriceInfo.*.minPrice`) |
| `group_max_manwon` | 103000 | **묶음 안 최고 호가** (`representativePriceInfo.*.maxPrice`) |

- 가격은 **호가 그대로**. 협의·급매 같은 문구로 숫자를 바꾸지 않는다.
- 최저~최고 그래프는 **`group_min_manwon` ~ `group_max_manwon`** 을 쓴다(대표 1건은 최저·최고가 아니다).
- 매물이 0인 단지는 `naver_complexes_*`에 0으로 남고, 이 파일에는 줄이 없다.

## 3. 자체 점검 (수집 끝에 자동)

리포트는 **그 회차 폴더에 저장된 CSV를 다시 읽어** 비교한다(메모리 값 아님).
맨 위에 회차 폴더 경로와 네 파일의 이름·크기·`observed_at_KST` 표가 있다.

| # | 확인 | 결과(2026-10-27 · `20261027_5`) |
|---|---|---|
| 1 | 단지별 `trade_type` 줄 수 = 집계 매물 수 | **불일치 0건** |
| 2 | 단지별 매매 최저·최고 = `min/max_asking_price` | **불일치 0건** (묶음 최저·최고 기준) |
| 3 | 평형별 줄 수 = `naver_pyeongs_*` | **불일치 0건** |
| 4 | 수집 실패 단지 이름·이유 | 0곳 |

- 집계 API(`/complex/article/stats`)의 최저·최고는 중개사 중복을 포함한 전체 매물 기준이라,
  이 파일도 묶음 기준 열로 비교한다. 그래도 남는 차이는 수집 시점 차이다.

## 4. 실제 생성 결과 (2026-10-27 · `20261027_5`)

| 항목 | 값 |
|---|---|
| 파일 | 1,918행 · 18열 · 251KB |
| 거래유형 | 매매 1,780 · 전세 138 |
| 단지 | 51곳 (매물 0인 7곳은 줄 없음) |
| `floor_num` 채워짐 | 702 / 1,918 (나머지는 `고/25`처럼 표기만) |
| `same_listing_count` > 1 | 1,096행 (중개사 중복이 묶인 매물) |
| `group_min_manwon` < `price_manwon` | 71행 |
| `group_max_manwon` > `price_manwon` | 98행 |

예시 2줄:

```
observed_at_KST,naver_complex_no,apt_name,article_no,trade_type,pyeong_name,supply_m2,exclusive_m2,floor_raw,floor_num,floor_total,price_manwon,monthly_rent_manwon,confirmed_ymd,same_listing_count,dong_raw,group_min_manwon,group_max_manwon
2026-10-27 15:02,115539,다산한강반도유보라,2655656572,매매,30,102.39,76.98,10/30,10,30,100000,,2026-10-15,2,,100000,100000
2026-10-27 15:02,102083,부영사랑으로,2657510993,매매,34,112.66,84.94,7/11,7,11,64000,,2026-10-24,8,,64000,65000
```

## 5. 월세

지금 1단계는 **매매(A1)·전세(B1)** 만 수집한다. 열(`trade_type` 월세, `monthly_rent_manwon`)은 준비돼 있지만
**월세(B2)는 수집하지 않는다**(2026-10-27 대표 결정: 필요 없음).

## 6. 복비 쪽에서 쓰는 법

- 평형: `exclusive_m2` ±1.5㎡로 묶기
- 층 구간: `floor_num`이 있으면 **저층 1~3 / 중층 4~14 / 고층 15 이상**, 없으면 `floor_raw`의 `고/중/저` 표기로 판정
- "지금 나온 매물 호가" = 최신 회차 폴더에서 (평형 × 층 구간) 최저~최고·건수·기준일
- "매월 호가 최저" = 쌓인 회차 폴더(또는 `data/market/naver/` 사본)에서 월별 최저값
- 화면 문구: **"지금 나온 매물 호가 · 실제 거래가가 아니에요"** (입주민이 내놓은 가격이라고 쓰지 않는다)

## 7. 층 숫자가 없는 매물 (2026-10-27 확인)

1,918행 중 **1,216행(63%)** 은 `floor_raw`가 `고/25`·`중/25`처럼 표기만 있고 `floor_num`이 비어 있다.

- 원인: 목록 API의 `articleDetail.floorDetailInfo.targetFloor` 가 **문자열 `"고"`** 로 온다
  (`floorType: "20"`). 숫자 매물은 `"12"`(`floorType: "10"`). **등록할 때 층을 구간으로 올린 매물**이다.
- 상세 라우트도 확인: `/article/detail`, `/article/{no}`, `/complex/article/detail` 모두 **404**.
  목록 API의 `articleDetail` 밖에 층 정보가 없고, 네이버 화면에도 `고/25`로 표시된다.
- 결론: **실제 층 숫자는 받을 수 없다**(원본에 없음). `floor_raw`만 남기고, 구간 판정은 복비 쪽에서 한다.

## 8. 다시 만들기

```bash
# 1단계만 다시 (약 10~11분) — 회차 폴더의 네 파일을 한 번에 갱신
.venv\Scripts\python.exe run_bokbi.py

# 특정 단지만 확인 (임시 폴더에서 할 것 — 실제 state 를 덮어쓴다)
.venv\Scripts\python.exe run_bokbi.py --limit 3
```
