# 용병단 전투 시트 Export 1차

## Source

구글 시트 `용병단 캐릭터 시트`의 기존 전투 시트를 primary source로 사용한다.
신규 시트를 만들지 않고, 이미 존재하는 전투 의뢰/적/인카운터/보상/규칙/로그 시트를 JSON으로 export한다.

## Export JSON

- `public/data/mercenary.combat-missions.master.json`
- `public/data/mercenary.enemy-templates.master.json`
- `public/data/mercenary.encounters.master.json`
- `public/data/mercenary.encounter-enemies.master.json`
- `public/data/mercenary.combat-rewards.master.json`
- `public/data/mercenary.combat-rules.master.json`
- `public/data/mercenary.combat-logs.master.json`

`scripts/build-mercenary-master.js`는 한글/영문 컬럼을 기반으로 JSON을 정규화한다.
`export_json` 컬럼은 파일명/메타 정보로 취급하며 JSON.parse 대상이 아니다.

## Operation Identity

시트 전투 의뢰의 `mission_id`는 클라이언트 전투 작전의 `operationId`로도 사용한다.

- Sheet example: `combat_red_thread_alley_chase`

legacy mock operation id는 runtime UI와 claim 대상에서 제거되었다.
구버전 battleResult가 legacy id로 claim을 시도하면 서버는 보상을 지급하지 않는다.

## Encounter Resolution

전투 시작 시 `combat mission -> encounter -> encounterEnemies -> enemyTemplates` 순서로 적을 만든다.

`mercenary.encounter-enemies.master.json`이 있으면 이 행 단위 구성을 우선 사용한다.
없을 때만 `encounter.enemyComposition` 문자열을 fallback으로 파싱한다.

## Reward Source

서버 battle claim은 클라이언트가 보낸 reward 값을 신뢰하지 않는다.

보상 계산 순서:

1. `mercenary.combat-missions.master.json`에서 operation id를 찾는다.
2. mission의 `rewardGroupId`로 `mercenary.combat-rewards.master.json`을 찾는다.
3. `enabled === true`, `rewardType === "gold"`, `systemRequirement === "core"`인 행만 실제 지급한다.
4. 찾지 못하거나 legacy mock operation이면 보상을 지급하지 않고 명확한 오류를 반환한다.

material/equipment/case clue 계열 보상은 1차에서는 preview/report 대상이며 실제 지급하지 않는다.

## Loader Policy

`public/js/mercenary-data-loader.js`는 전투 JSON을 optional array로 로드한다.
로드 실패 또는 파일 누락 시 빈 배열을 반환한다.
전투 작전판은 mock fallback을 쓰지 않고 `전투 의뢰 데이터 없음` 상태를 표시한다.

## Combat Log Sheet

`전투 로그 문구` 시트는 단일 `log_id` 컬럼을 사용하지 않는다.
export id는 `log_group_id + log_type + sourceRow` 복합키로 만든다.

예: `combat_default__ally_attack__3`

템플릿은 문자열로만 저장한다.
허용되는 후속 치환은 `{ally}`, `{enemy}`, `{damage}`, `{heal}`, `{mission}`, `{actor}`, `{target}` 같은 단순 치환이다.
템플릿 문자열을 `eval`하거나 함수처럼 실행하지 않는다.

## Enemy Skill Validation

`enemyTemplates.actionSkillId`와 `enemyTemplates.skillId`는 스킬 규칙을 참조한다.
누락은 build 실패로 처리하지 않고 warning과 validation report에 남긴다.

전투 실행 시 누락된 enemy action skill은 빈 active skill처럼 처리하고 기본 공격으로 fallback한다.
`basicAttackId`가 공격 타입 규칙에 없으면 `normal_strike`로 fallback한다.

현재 기본 적 10종의 action skill은 스킬 규칙 시트에 정식 등록되어 있어야 한다.
`condition`은 `enemy_skill`, `use_in_combat`은 true이며, 적 템플릿의 `action_skill_id`가 스킬 규칙의 `skill_id`를 참조한다.

검증 대상:

- `skill_corrosive_splash`
- `skill_acid_body`
- `skill_bite_trap`
- `skill_quick_stab`
- `skill_baton_smash`
- `skill_collectors_order`
- `skill_unstable_burst`
- `skill_deep_mark`
- `skill_thread_snipe`
- `skill_gear_guard`

## Battle Background Path Compatibility

Sheet encounter `backgroundPath` stays as source data, but runtime battle operations fill the legacy viewer aliases together:
`battlefieldImage`, `backgroundImage`, `backgroundUrl`, `imagePath`, `backgroundPath`, and `path`.

Current public assets live under `/assets/mercenary/battle/battlefields/{backgroundKey}.png`.
If sheet data points to `/assets/mercenary/battle/backgrounds/`, the lobby normalizer rewrites it to the deployed `battlefields` path.

## Lobby Policy

전투 작전 UI의 runtime source는 sheet combat mission 6개다.
legacy mock operation 3개는 일반 실행 경로에서 제거되었다.
sheet combat mission이 없거나 resolve된 적이 없으면 mock fallback 없이 빈 상태/오류 상태를 표시한다.

Runtime combat missions:

- `combat_sewer_slime_cleanup`
- `combat_mimic_entrance_sweep`
- `combat_debtbreaker_skirmish`
- `combat_tower_waste_summon`
- `combat_abyss_dock_servants`
- `combat_red_thread_alley_chase`

전투 뷰어 좌표, 카메라, 스케일, 레이어 CSS는 이 export 작업에서 수정하지 않는다.

## Follow-Up

- sheet combat mission 기준 recommendedPower 재분석
- combat rule sheet의 maxRounds/targetRule/speedRule 실제 엔진 연결
- combat log template sheet의 렌더러 연결
- material/equipment/case clue 지급 연결
- 작전 해금 조건 연결
