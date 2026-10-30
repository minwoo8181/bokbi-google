# 외부 스킬 출처 (2026-10-24 설치)

훅·스크립트 없이 SKILL.md만 복사했다. 갱신 시 아래 커밋과 비교한 뒤 같은 변경(수동 호출 지정)을 다시 적용한다.

| 스킬 | 저장소 · 원본 경로 | 커밋 | 라이선스 | 변경 |
|---|---|---|---|---|
| grill-me | mattpocock/skills `skills/productivity/grill-me` | 5beb35b | MIT | 없음 (원본이 수동 호출) |
| grilling | mattpocock/skills `skills/productivity/grilling` | 5beb35b | MIT | 없음 ("grill" 문구로 자동 호출) |
| llm-council | aiwithremy/claude-skills-llm-council `SKILL.md` | 55ee36e | 표기 없음 | 수동 호출 지정 (1회 하위 에이전트 11개) |
| caveman | JuliusBrussee/caveman `skills/caveman` | 1f951fb | MIT (LICENSE-MIT) | 수동 호출 지정 |
| ultracave | JuliusBrussee/caveman `skills/ultracave` | 1f951fb | MIT | 없음 (원본이 수동 호출) |
| caveman-review | JuliusBrussee/caveman `skills/caveman-review` | 1f951fb | MIT | 수동 호출 지정 |
| ponytail | DietrichGebert/ponytail `skills/ponytail` | 09c434a | MIT | 수동 호출 지정 |
| ponytail-review | DietrichGebert/ponytail `skills/ponytail-review` | 09c434a | MIT | 수동 호출 지정 |
| ponytail-audit | DietrichGebert/ponytail `skills/ponytail-audit` | 09c434a | MIT | 수동 호출 지정 |
| ponytail-debt | DietrichGebert/ponytail `skills/ponytail-debt` | 09c434a | MIT | 수동 호출 지정 |

| impeccable (2026-10-29) | pbakaus/impeccable `plugin/skills/impeccable` (SKILL.md + `reference/` 45개, LICENSE·NOTICE) | 5e745ac | Apache 2.0 | 수동 호출 지정 |
| emil-design-eng (2026-10-29) | emilkowalski/skills `skills/emil-design-eng` (+ LICENSE) | a81dbca | MIT | 수동 호출 지정 |
| frontend-design (2026-10-30, design-lab) | anthropics/skills `skills/frontend-design` (+ LICENSE.txt) | ca45fc4 | 저장소 표기 | 없음 (자동 호출) |
| ui-ux-pro-max (2026-10-30, design-lab) | nextlevelbuilder/ui-ux-pro-max-skill `.claude/skills/ui-ux-pro-max` (SKILL.md + `references/` 2개) | 28b3b8d | MIT | 없음 (자동 호출) |
| taste-skill (2026-10-30, design-lab) | Leonxlnx/taste-skill `skills/taste-skill` (SKILL.md·README + `references/` 11개) | 12af471 | MIT | 없음 (자동 호출, frontmatter 이름 `design-taste-frontend`) |

design-lab 3개는 대표님이 "알아서 설치" 지시(2026-10-30). 레퍼런스 기반 리디자인에 직접 불러 쓰려고 수동 호출 지정을 하지 않았다. 문서(.md)만 받아 읽고 넣었다.

수동 호출 지정 = frontmatter `disable-model-invocation: true`. `/스킬이름`으로만 실행된다.

## 설치하지 않은 것
- 훅 전체 (caveman 4개, ponytail 3개): 매 세션·하위 에이전트에 규칙 자동 주입
- caveman-commit: `/commit`·"커밋 메시지"에 자동 호출되고 본문을 생략해 CLAUDE.md 커밋 규칙(이유·맥락)과 충돌
- caveman-compress: Python 스크립트 포함, 파일을 모델 제공자로 전송
- caveman-stats: 훅이 남기는 기록에 의존
- megacave: 한문체 모드, 용도 없음
- ponytail-help, ponytail-gain: 플러그인·훅 기준 안내와 벤치마크 표시
- impeccable `scripts/` 전체: 첫 실행 때 실행 파일을 내려받는 런처·브라우저 스크립트·디자인 감지 훅. SKILL.md의 "Launcher unavailable" 절차(PRODUCT.md·DESIGN.md 직접 읽기)로 동작한다. `live`·`generate`·`pin`·`hooks`·`doctor` 명령은 쓰지 않는다
- emilkowalski/skills의 나머지 19개(animate·review-animations 등): 이번엔 emil-design-eng만
- ui-ux-pro-max `scripts/`(Python 검색기)·`data/`(CSV 46개): 실행 코드라 뺐다. SKILL.md의 `search.py` 단계는 건너뛰고 `references/pro-rules.md`·`quick-reference.md`만 쓴다
- taste-skill `scripts/`(draw·inspect·lint·assets .mjs)·`assets/`·`library/` JSON: 실행 코드·대용량 데이터라 뺐다. 방향 뽑기·측정은 레퍼런스 사이트 실측과 내장 브라우저 캡처로 대신하고, `references/`(app-screens·tells·type·colour 등) 규칙만 쓴다

## 사용 시 주의
- caveman·ponytail은 켜면 세션 끝까지 유지된다. 끄기: "stop caveman" / "stop ponytail" 또는 "normal mode"
- ponytail의 `shortcut:` 주석 허용은 CLAUDE.md 규칙 4(축약·생략 금지)보다 아래다. 충돌 시 CLAUDE.md가 우선
- `/caveman ultra`는 ultracave로, `/caveman wenyan`은 미설치 megacave로 연결된다
- impeccable은 "대담한 디자인·브랜드 재해석"을 권하지만 복비는 정해진 토큰·DESIGN.md·메모리 `design-rules-calm-ui`가 우선한다(스킬의 "The brief wins"와 같은 뜻). 홈 같은 기존 화면은 refinement로만 쓴다
- emil-design-eng 원문 "Initial Response"(첫 호출에 영어 한 줄만 답하기)는 따르지 않는다. 답은 한국어로, 모션 값은 DESIGN.md §6 토큰 우선
- llm-council 원문 끝 "HTML output" 문장은 5단계 "파일 생성 금지"와 모순된다. 채팅 출력만 따른다
