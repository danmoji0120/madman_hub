# 용병단 보관함 0.1

## 범위

보관함 0.1은 유저별 아이템/장비 소유 장부와 조회 UI만 제공한다. 장착, 해제, 판매, 사용, 강화, 세트효과, 전투 스탯 반영은 아직 구현하지 않는다.

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

서버는 itemId 기준으로 item/equipment/image prompt master를 결합한다. 프론트도 `loadMercenaryEquipmentBundle()`을 사용해 같은 기준으로 표시 fallback을 만든다.

## UI

빠른 메뉴에 `보관함` 버튼을 추가했다. 보관함 overlay는 전체/장비/재료/소모품/단서/기타 탭, 장비 슬롯 필터, 등급 필터, 검색을 제공한다.

빈 보관함은 더미 장비 없이 "보관함이 텅 비었습니다" 상태로 표시한다.

## 후속

- 보관함 지급 seed/admin helper
- 전투 보상 material/equipment 지급 연결
- 장착/해제
- 장비 스탯 currentStats 반영
- 강화/잠금/판매
