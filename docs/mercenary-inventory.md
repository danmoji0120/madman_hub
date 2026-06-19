# 용병단 보관함 0.1

## 범위

보관함 0.1은 유저별 아이템/장비 소유 장부와 조회 UI를 제공한다. 장비 장착/해제 0.1에서는 보유 장비를 용병 슬롯에 장착하고 해제할 수 있다. 판매, 사용, 강화, 세트효과, 실제 전투 스탯 반영은 아직 구현하지 않는다.

## DB

테이블: `user_mercenary_inventory_items`

- `id`: 개별 보관함 entry id
- `user_id`: 소유 유저
- `item_id`: `mercenary.items.master.json`의 itemId
- `item_type`: equipment, material, consumable, clue, rumor_seed, misc
- `quantity`: stackable 아이템 수량
- `locked`: 잠금 여부
- `acquired_source_type`, `acquired_source_id`, `acquired_run_id`: 획득 출처 기록

stackable 아이템은 `user_id + item_id` 기준으로 수량 누적 가능하며, 장비는 quantity 1인 개별 entry로 보관한다.

## API

- `GET /api/mercenary/inventory`: 보관함 목록과 summary를 반환한다.
- `GET /api/mercenary/inventory/summary`: summary만 반환한다.
- `GET /api/mercenary/equipment-slots`: 유저 전체 장착 슬롯을 반환한다.
- `GET /api/mercenary/my/:userMercenaryId/equipment`: 특정 보유 용병의 장착 슬롯을 반환한다.
- `POST /api/mercenary/my/:userMercenaryId/equipment/equip`: 보관함 장비 entry를 장착한다.
- `DELETE /api/mercenary/my/:userMercenaryId/equipment/:slot`: 해당 슬롯 장비를 해제한다.

서버는 itemId 기준으로 item/equipment/image prompt master를 결합한다. 프론트도 `loadMercenaryEquipmentBundle()`을 사용해 같은 기준으로 표시 fallback을 만든다.

## UI

빠른 메뉴에 `보관함` 버튼을 추가했다. 보관함 overlay는 전체/장비/재료/소모품/단서/기타 탭, 장비 슬롯 필터, 등급 필터, 검색을 제공한다.

장비 detail에는 장착 대상 용병 선택과 장착 버튼을 제공한다. 장착 중인 장비는 보관함 카드와 상세에 "장착 중"으로 표시되고, 장착 대상 용병명과 해제 버튼을 보여준다.

빈 보관함은 더미 장비 없이 "보관함이 텅 비었습니다" 상태로 표시한다.

## 후속

- 보관함 지급 seed/admin helper
- 전투 보상 material/equipment 지급 연결
- 장비 장착 대상 선택 UX 개선
- 장비 스탯 실제 전투 계산 반영 여부 결정
- 강화/잠금/판매


## Combat Claim Inventory Rewards 0.1

Victory battle claims can grant inventory rewards from enabled combat reward rows with rewardType material, equipment, item, or drop. The server resolves rewards from the mission rewardGroupId and master JSON, never from client payload values. Claim payloads stay slim and do not include full battleResult logs or equipment snapshots.

Inventory reward rows are skipped with a warning when their itemId/equipmentId cannot be resolved against item/equipment master data. Disabled reward rows are not granted. dropRate accepts either 0-1 or 0-100 values; blank dropRate means guaranteed. The weight column is not treated as a probability in 0.1 and remains reserved for a later weighted table pass. Equipment rewards are non-stackable and create one inventory row per quantity. In 0.1, combat claim inventory rewards always create source-traceable inventory rows instead of merging stacks, so each granted row keeps acquired_run_id for idempotency and audit. Stack merging for materials is reserved for a later storage cleanup pass.

Claim idempotency remains the duplicate-payment guard: inventory grants run only for a newly claimed battle run, and already-claimed runs return without inserting new inventory entries. Granted entries use acquired_source_type=combat_claim, acquired_source_id=missionId, and acquired_run_id=battleId.
