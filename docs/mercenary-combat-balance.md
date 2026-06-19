# 용병단 전투 스테이지 export

## 전투 스테이지 마스터 A안

- 시트의 전투 스테이지 마스터 row는 런타임에서 직접 읽지 않고 export 시 실제 전투 의뢰 row로 파생한다.
- generated_mission_id는 combat mission JSON의 missionId/operationId가 된다.
- generated_encounter_id는 encounters JSON과 encounter-enemies JSON의 encounterId가 된다.
- generated_reward_group_id는 combat rewards JSON의 rewardGroupId가 된다.
- 현재 정책은 base 전투 의뢰 6개와 stage 파생 의뢰 31개를 함께 export한다.

## 난이도 multiplier 반영

- stage row의 enemy_level_bonus는 파생 encounter/enemy row의 enemyLevel에 반영된다.
- enemy_hp_multiplier, enemy_atk_multiplier, enemy_def_multiplier, enemy_spd_multiplier, enemy_tec_multiplier, enemy_sup_multiplier는 stageModifiers로 encounter-enemies JSON에 저장된다.
- 전투 생성 시 public/js/mercenary-lobby.js의 enemy builder가 stageModifiers를 읽어 enemy HP/ATK/DEF/SPD/TEC/SUP에 곱한다.
- enemy template을 복제하지 않으므로 원본 적 마스터는 변경하지 않는다.

## 보상 multiplier 반영

- base reward group row를 복사해 generated_reward_group_id로 파생한다.
- gold, officeExp, mercExp는 각각 stage multiplier를 곱해 반올림한다.
- material/equipment/drop 계열 weight와 amount 범위는 drop rate multiplier를 반영한다.
- 장비/재료 실제 지급 연결은 아직 하지 않는다.

## 후속 계획

- 전투 작전판에서 base mission 6개를 접고 stage selector로 묶어 보여주는 UI.
- stage clear unlock 조건 서버 검증.
- stage별 추천 전투력/보상 밸런스 리포트.
