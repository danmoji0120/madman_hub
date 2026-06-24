# 용병단 대장간 0.1

## 범위

- 대장간 0.1은 `분해`, `강화`, `제작` 탭으로 구성한다.
- 실제 구현 범위는 분해와 강화다.
- 제작, 승급, 옵션 재련, 세트 효과, 장비 파괴는 후속 작업으로 남긴다.
- 장비 master JSON은 런타임에서 수정하지 않고, 유저 보관함 row의 상태만 변경한다.

## 저장 구조

- 강화 상태는 `user_mercenary_inventory_items` row에 저장한다.
- 추가 컬럼:
  - `enhancement_level`
  - `enhancement_pity`
  - `enhancement_updated_at`
  - `consumed_at`
  - `consumed_source_type`
  - `consumed_source_id`
- 분해된 장비는 hard delete 대신 `consumed_at`으로 soft consume 처리한다.
- 일반 보관함/장착 후보 조회는 `consumed_at IS NULL`만 사용한다.
- 기존 SQLite DB는 서버 시작 시 `PRAGMA table_info(user_mercenary_inventory_items)` 기반 idempotent migration으로 누락 컬럼을 보강한다.
- 기존 Supabase/Postgres DB는 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 문으로 같은 컬럼을 보강한다.

## 분해 정책

- 장착 중 장비는 분해할 수 없다.
- 잠금 장비는 분해할 수 없다.
- SSR/EX 장비는 대장간 0.1에서 분해할 수 없다.
- N/R/SR 장비는 분해 가능하다.
- SR 장비는 이름 입력 확인을 요구한다.
- 분해 결과 재료는 아이템 마스터에 존재하는 material만 지급한다.

## 강화 정책

- 강화 레벨은 `+0`부터 `+5`까지 지원한다.
- N/R/SR 장비만 강화 가능하다.
- SSR/EX 장비 강화는 후속 업데이트에서 연다.
- 실패해도 장비 파괴와 강화 하락은 없다.
- 실패해도 골드와 재료는 소모된다.

## 성공률

| 목표 레벨 | 기본 성공률 |
| --- | ---: |
| +1 | 100% |
| +2 | 85% |
| +3 | 70% |
| +4 | 50% |
| +5 | 25% |

`+5` 실패 시 해당 inventory item의 pity가 1 증가한다.
`+5` 실패 3회마다 다음 `+5` 시도 성공률에 `+10%p`를 더한다.
최종 `+5` 성공률은 45%를 넘지 않는다.
성공하면 pity는 0으로 초기화된다.

## 비용 정책

- 비용은 목표 강화 레벨과 장비 등급에 따라 증가한다.
- 등급 배율:
  - N: 1.0
  - R: 1.6
  - SR: 2.8
  - SSR: 5.0, 현재 잠금
  - EX: 8.0, 현재 잠금
- 재료는 `mat_rusty_scrap_001`을 기본으로 사용한다.
- +3 이상은 장비 태그/출처에 맞는 계열 재료를 추가로 요구한다.
- SR 장비 +5는 고급 재료 1개를 추가로 요구한다.

## 강화 보너스

강화 보너스는 장비 기본 보너스에 추가된다.

| 강화 | 추가 비율 |
| --- | ---: |
| +1 | 10% |
| +2 | 22% |
| +3 | 36% |
| +4 | 55% |
| +5 | 80% |

기본 스탯이 0인 항목에는 새 보너스를 만들지 않는다.
기본 스탯이 있는 항목은 강화 단계별 최소 +1 보정이 붙는다.

## 전투 반영

- 장착 슬롯 enrich 단계에서 inventory row의 `enhancement_level`을 읽는다.
- `calculateEquipmentBonus()`는 강화 적용 후 스탯을 기준으로 합산한다.
- 용병 상세, 보관함, 장착 슬롯, 전투 작전판 파티 전투력에 강화 보너스가 반영된다.
- 전투 시작 party snapshot의 `equipmentBonus/finalStats`도 같은 값을 사용하므로 실제 전투 HP/ATK/DEF/SPD/TEC/SUP에 반영된다.

## UI

- 로비 quick nav에 `대장간` 버튼을 추가한다.
- 데스크톱은 장비 목록, 선택 장비 상세, 작업 패널 3영역으로 표시한다.
- 모바일은 1열 stack으로 전환하고 작업 패널을 하단 sticky로 유지한다.
- 제작 탭은 `준비중`으로 표시한다.
