# 용병단 용병 관리 0.1

## 상세창 액션

- 일러 확대: 선택된 보유 용병의 standing 이미지를 lightbox로 표시한다. 이미지가 없거나 로드에 실패하면 placeholder를 보여준다.
- 장비 변경: 선택된 user_mercenary_id를 고정한 장비 슬롯 관리 모달을 연다. 기존 장착/해제 API를 재사용한다.
- 잠금 / 잠금 해제: `PATCH /api/mercenary/my/:userMercenaryId/lock`으로 DB에 저장한다. 잠긴 용병은 해고할 수 없다.
- 해고: `POST /api/mercenary/my/:userMercenaryId/dismiss`로 soft delete 처리한다. hard delete는 하지 않는다.

## 해고 정책

- 용병명을 정확히 입력해야 해고할 수 있다.
- 잠금 상태 또는 진행 중인 활동이 있는 용병은 해고할 수 없다.
- 해고 시 장착 장비는 자동 해제되어 보관함으로 돌아간다.
- 일반 보유 용병 목록은 `dismissed_at IS NULL`인 용병만 반환한다.
- 과거 전투 기록과 결과 참조를 보존하기 위해 row는 유지한다.

## 장비 변경 정책

- 잠금 상태는 해고 방지용이므로 장비 변경을 막지 않는다.
- 진행 중인 활동이 있는 용병은 장비 변경과 해제를 할 수 없다.
- 같은 슬롯에 장비가 있으면 자동 교체하지 않는다. 먼저 해제해야 한다.
- 다른 용병이 장착 중인 inventory entry는 선택할 수 없다.
